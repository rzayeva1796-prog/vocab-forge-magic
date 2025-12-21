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

    const { message, userId, conversationHistory, turkishMode = false } = await req.json();

    console.log('Chat request received:', { userId, messageLength: message?.length, turkishMode });

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

      const userName = profile?.display_name || 'User';

      // Kelimeleri yıldız sayısına göre grupla
      const fiveStarWords = wordDetails.filter(w => w.stars === 5);
      const fourStarWords = wordDetails.filter(w => w.stars === 4);
      const threeStarWords = wordDetails.filter(w => w.stars === 3);
      const lowStarWords = wordDetails.filter(w => w.stars < 3);

      const level = wordCount < 50 ? 'Beginner' : wordCount < 200 ? 'Elementary' : wordCount < 500 ? 'Intermediate' : wordCount < 1000 ? 'Advanced' : 'Expert';

      if (turkishMode) {
        userContext = `
KULLANICI BİLGİLERİ:
- İsim: ${userName}
- Toplam öğrenilen kelime sayısı: ${wordCount}
- Seviye: ${level}
`;
      } else {
        userContext = `
USER INFORMATION:
- Name: ${userName}
- Total learned words: ${wordCount}
- Level: ${level}

VOCABULARY KNOWLEDGE (by star rating):
${fiveStarWords.length > 0 ? `- 5 Stars (Mastered - ${fiveStarWords.length} words): ${fiveStarWords.slice(0, 30).map(w => w.english).join(', ')}${fiveStarWords.length > 30 ? '...' : ''}` : ''}
${fourStarWords.length > 0 ? `- 4 Stars (Good - ${fourStarWords.length} words): ${fourStarWords.slice(0, 20).map(w => w.english).join(', ')}${fourStarWords.length > 20 ? '...' : ''}` : ''}
${threeStarWords.length > 0 ? `- 3 Stars (Learning - ${threeStarWords.length} words): ${threeStarWords.slice(0, 20).map(w => w.english).join(', ')}${threeStarWords.length > 20 ? '...' : ''}` : ''}
${lowStarWords.length > 0 ? `- 1-2 Stars (Need practice - ${lowStarWords.length} words): ${lowStarWords.slice(0, 20).map(w => w.english).join(', ')}${lowStarWords.length > 20 ? '...' : ''}` : ''}

IMPORTANT:
- Use 5-star words freely in your sentences, user knows them well
- Try to practice 1-2 star words, user needs more exposure
- When introducing new words, choose ones appropriate for user's level
- CRITICAL: Build sentences using ONLY words from the user's known vocabulary when possible
`;
      }
    }

    // Sistem promptu
    let systemPrompt: string;
    
    if (turkishMode) {
      systemPrompt = `Sen Türkçe konuşan yardımcı bir asistansın. Adın "Kelime Dostum".

${userContext}

KURALLAR:
1. Sadece Türkçe konuş
2. İngilizce öğretme, sadece Türkçe sohbet et
3. Samimi ve yardımcı ol
4. Kısa ve öz cevaplar ver (maksimum 3-4 cümle)
5. Kullanıcının sorularına Türkçe cevap ver`;
    } else {
      systemPrompt = `You are an English conversation partner for a Turkish learner. Your name is "Word Buddy".

${userContext}

CRITICAL RULES FOR ENGLISH PRACTICE:
1. SPEAK ONLY IN ENGLISH - Never use Turkish unless user explicitly asks for translation
2. Adjust your sentence complexity based on user's word count:
   - 0-50 words: Use VERY simple sentences. Only basic words like: hello, good, yes, no, thank you, please, I, you, is, are, have, want, like, go, eat, drink, sleep, work, play, happy, sad, big, small, hot, cold, etc.
   - 50-200 words: Use simple sentences with common everyday words
   - 200-500 words: Use intermediate sentences with more varied vocabulary
   - 500+ words: Use complex sentences with advanced vocabulary

3. BUILD SENTENCES USING THE USER'S KNOWN VOCABULARY:
   - Prioritize using words from the 5-star list (user knows these well)
   - Naturally include 1-2 star words to help user practice
   - When you must use a new word, immediately provide the Turkish translation in parentheses

4. Keep responses SHORT (2-3 sentences max)
5. Be encouraging and supportive
6. Ask simple follow-up questions to keep conversation going
7. If user makes grammar mistakes, gently correct them

EXAMPLE RESPONSES:
For beginner (0-50 words): "Hello! How are you today? I am happy to see you."
For elementary (50-200): "That sounds interesting! What do you like to do on weekends?"
For intermediate (200-500): "I understand your perspective. Could you elaborate on that point?"`;
    }

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
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Too many requests. Please wait a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'API credits exhausted. Please contact administrator.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    console.log('Response generated successfully, word count:', wordCount);

    const level = wordCount < 50 ? 'Beginner' : wordCount < 200 ? 'Elementary' : wordCount < 500 ? 'Intermediate' : wordCount < 1000 ? 'Advanced' : 'Expert';

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
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
