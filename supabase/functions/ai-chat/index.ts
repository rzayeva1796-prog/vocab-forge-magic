import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, userId, conversationHistory } = await req.json();

    console.log('Chat request received:', { userId, messageLength: message?.length });

    // Kullanıcının kelime ilerlemesini ve yıldızlarını getir
    let userContext = '';
    let wordDetails: { english: string; turkish: string; stars: number }[] = [];
    let wordCount = 0;

    if (userId) {
      // Kullanıcının öğrendiği kelimeleri ve yıldız durumlarını getir (user_word_progress tablosundan)
      const { data: wordProgress, error: progressError } = await supabase
        .from('user_word_progress')
        .select(`
          star_rating,
          learned_words (
            english,
            turkish,
            package_id
          )
        `)
        .eq('user_id', userId);

      if (progressError) {
        console.error('Error fetching word progress:', progressError);
      }

      if (wordProgress && wordProgress.length > 0) {
        wordDetails = wordProgress
          .filter((wp: any) => wp.learned_words)
          .map((wp: any) => ({
            english: wp.learned_words.english,
            turkish: wp.learned_words.turkish,
            stars: wp.star_rating
          }));
        
        wordCount = wordDetails.length;
        console.log('User word count from progress:', wordCount);
      }

      // Kullanıcı profili
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single();

      const userName = profile?.display_name || 'Kullanıcı';

      // Kelimeleri yıldız sayısına göre grupla
      const fiveStarWords = wordDetails.filter(w => w.stars === 5);
      const fourStarWords = wordDetails.filter(w => w.stars === 4);
      const threeStarWords = wordDetails.filter(w => w.stars === 3);
      const lowStarWords = wordDetails.filter(w => w.stars < 3);

      const level = wordCount < 50 ? 'Başlangıç' : wordCount < 200 ? 'Temel' : wordCount < 500 ? 'Orta' : wordCount < 1000 ? 'İleri' : 'İleri Düzey';

      userContext = `
KULLANICI BİLGİLERİ:
- İsim: ${userName}
- Toplam öğrenilen kelime sayısı: ${wordCount}
- Seviye: ${level}

KELİME DURUMU (Yıldız sayısına göre):
${fiveStarWords.length > 0 ? `- 5 Yıldız (Mükemmel biliyor - ${fiveStarWords.length} kelime): ${fiveStarWords.slice(0, 30).map(w => `${w.english} (${w.turkish})`).join(', ')}${fiveStarWords.length > 30 ? '...' : ''}` : ''}
${fourStarWords.length > 0 ? `- 4 Yıldız (İyi biliyor - ${fourStarWords.length} kelime): ${fourStarWords.slice(0, 20).map(w => `${w.english} (${w.turkish})`).join(', ')}${fourStarWords.length > 20 ? '...' : ''}` : ''}
${threeStarWords.length > 0 ? `- 3 Yıldız (Orta düzey - ${threeStarWords.length} kelime): ${threeStarWords.slice(0, 20).map(w => `${w.english} (${w.turkish})`).join(', ')}${threeStarWords.length > 20 ? '...' : ''}` : ''}
${lowStarWords.length > 0 ? `- 1-2 Yıldız (Pratik gerekli - ${lowStarWords.length} kelime): ${lowStarWords.slice(0, 20).map(w => `${w.english} (${w.turkish})`).join(', ')}${lowStarWords.length > 20 ? '...' : ''}` : ''}

ÖNEMLİ:
- 5 yıldızlı kelimeleri rahatça kullanabilirsin, kullanıcı bunları iyi biliyor
- 1-2 yıldızlı kelimeleri pratik ettirmeye çalış, kullanıcının bunlara ihtiyacı var
- Yeni kelimeler öğretirken kullanıcının seviyesine uygun olanları seç
`;
    }

    // Sistem promptu
    const systemPrompt = `Sen Türkçe konuşan ve İngilizce öğreten yardımcı bir asistansın. Adın "Kelime Dostum".

${userContext}

ÖNEMLİ KURALLAR:
1. Türkçe konuş ama İngilizce öğretmeye odaklan
2. Kullanıcının bildiği kelime sayısına göre cümlelerini ayarla:
   - 0-50 kelime: Çok basit, kısa cümleler. Temel kelimeler kullan.
   - 50-200 kelime: Basit cümleler. Yaygın kelimeler kullan.
   - 200-500 kelime: Orta düzey cümleler. Daha çeşitli kelimeler kullan.
   - 500+ kelime: Karmaşık cümleler kullanabilirsin.

3. İngilizce kelimeler kullandığında Türkçe karşılığını parantez içinde ver
4. Kullanıcının 5 yıldızlı kelimelerini cümlelerinde kullanmaya özen göster
5. 1-2 yıldızlı kelimeleri pratik ettirmeye çalış - bunları sohbette kullan
6. Samimi ve motive edici ol
7. Kısa ve öz cevaplar ver, çok uzun yazma (maksimum 3-4 cümle)
8. Eğer kullanıcı İngilizce pratik yapmak isterse, onunla basit İngilizce diyaloglar kur

Örnek yaklaşımlar:
- Başlangıç seviyesi için: "Hello! (Merhaba) How are you? (Nasılsın?) gibi basit ifadeler öğrenelim."
- İleri seviye için: "Today let's practice some advanced vocabulary and complex sentence structures."`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Sending request to Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'API kredisi doldu. Lütfen yöneticiyle iletişime geçin.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Üzgünüm, bir yanıt oluşturamadım.';

    console.log('Response generated successfully, word count:', wordCount);

    const level = wordCount < 50 ? 'Başlangıç' : wordCount < 200 ? 'Temel' : wordCount < 500 ? 'Orta' : wordCount < 1000 ? 'İleri' : 'İleri Düzey';

    return new Response(JSON.stringify({ 
      reply,
      wordCount,
      level
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
