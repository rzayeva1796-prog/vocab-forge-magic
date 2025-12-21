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
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, userId, conversationHistory } = await req.json();

    console.log('Chat request received:', { userId, messageLength: message?.length });

    // Kullanıcının kilitsiz altbölümlerini ve bildiği kelimeleri getir
    let userContext = '';
    let knownWords: string[] = [];
    let wordCount = 0;

    if (userId) {
      // Kilitsiz altbölümleri getir
      const { data: activations, error: activationsError } = await supabase
        .from('user_subsection_activations')
        .select(`
          subsection_id,
          subsections (
            id,
            name,
            package_id,
            word_packages (
              id,
              name
            )
          )
        `)
        .eq('user_id', userId);

      if (activationsError) {
        console.error('Error fetching activations:', activationsError);
      }

      // Kilitsiz paketleri bul
      const unlockedPackageIds: string[] = [];
      if (activations) {
        activations.forEach((activation: any) => {
          if (activation.subsections?.package_id) {
            unlockedPackageIds.push(activation.subsections.package_id);
          }
        });
      }

      console.log('Unlocked package IDs:', unlockedPackageIds);

      // Kilitsiz paketlerdeki kelimeleri getir
      if (unlockedPackageIds.length > 0) {
        const { data: words, error: wordsError } = await supabase
          .from('learned_words')
          .select('english, turkish')
          .in('package_id', unlockedPackageIds);

        if (wordsError) {
          console.error('Error fetching words:', wordsError);
        }

        if (words) {
          knownWords = words.map((w: any) => w.english.toLowerCase());
          wordCount = words.length;
          console.log('Known words count:', wordCount);
        }
      }

      // Kullanıcı profili
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single();

      const userName = profile?.display_name || 'Kullanıcı';

      userContext = `
Kullanıcı Bilgileri:
- İsim: ${userName}
- Bildiği İngilizce kelime sayısı: ${wordCount}
- Seviye: ${wordCount < 50 ? 'Başlangıç' : wordCount < 200 ? 'Temel' : wordCount < 500 ? 'Orta' : wordCount < 1000 ? 'İleri' : 'İleri Düzey'}

${knownWords.length > 0 ? `Kullanıcının bildiği bazı kelimeler (bunları kullanmaya özen göster): ${knownWords.slice(0, 100).join(', ')}` : ''}
`;
    }

    // Sistem promptu - kelime seviyesine göre adapte ol
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
4. Kullanıcının bildiği kelimeleri cümlelerinde kullanmaya özen göster
5. Yeni kelimeler öğretirken kullanıcının seviyesine uygun olanları seç
6. Samimi ve motive edici ol
7. Kısa ve öz cevaplar ver, çok uzun yazma
8. Eğer kullanıcı İngilizce pratik yapmak isterse, onunla basit İngilizce diyaloglar kur

Örnek yaklaşımlar:
- Başlangıç seviyesi için: "Hello! (Merhaba) How are you? (Nasılsın?) gibi basit ifadeler öğrenelim."
- İleri seviye için: "Today let's practice some advanced vocabulary and complex sentence structures."`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Sending request to Groq...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Üzgünüm, bir yanıt oluşturamadım.';

    console.log('Response generated successfully');

    return new Response(JSON.stringify({ 
      reply,
      wordCount,
      level: wordCount < 50 ? 'Başlangıç' : wordCount < 200 ? 'Temel' : wordCount < 500 ? 'Orta' : wordCount < 1000 ? 'İleri' : 'İleri Düzey'
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
