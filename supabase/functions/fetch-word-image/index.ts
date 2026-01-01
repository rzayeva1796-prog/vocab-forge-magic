import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageCandidate {
  url: string;
  source: string;
}

// API 1: Unsplash
async function fetchFromUnsplash(query: string): Promise<ImageCandidate[]> {
  const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!unsplashKey) return [];

  try {
    console.log('Trying Unsplash...');
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&client_id=${unsplashKey}`
    );
    if (response.ok) {
      const data = await response.json();
      const candidates: ImageCandidate[] = [];
      data.results?.forEach((photo: any) => {
        if (photo.urls?.small) {
          candidates.push({ url: photo.urls.small, source: 'unsplash' });
        }
      });
      console.log(`Unsplash found ${candidates.length} images`);
      return candidates;
    }
  } catch (e) {
    console.log('Unsplash error:', e);
  }
  return [];
}

// API 2: Pexels
async function fetchFromPexels(query: string): Promise<ImageCandidate[]> {
  const pexelsKey = Deno.env.get('PEXELS_API_KEY');
  if (!pexelsKey) return [];

  try {
    console.log('Trying Pexels...');
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5`,
      { headers: { Authorization: pexelsKey } }
    );
    if (response.ok) {
      const data = await response.json();
      const candidates: ImageCandidate[] = [];
      data.photos?.forEach((photo: any) => {
        if (photo.src?.medium) {
          candidates.push({ url: photo.src.medium, source: 'pexels' });
        }
      });
      console.log(`Pexels found ${candidates.length} images`);
      return candidates;
    }
  } catch (e) {
    console.log('Pexels error:', e);
  }
  return [];
}

// API 3: Pixabay
async function fetchFromPixabay(query: string): Promise<ImageCandidate[]> {
  const pixabayKey = Deno.env.get('PIXABAY_API_KEY');
  if (!pixabayKey) return [];

  try {
    console.log('Trying Pixabay...');
    const response = await fetch(
      `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=5`
    );
    if (response.ok) {
      const data = await response.json();
      const candidates: ImageCandidate[] = [];
      data.hits?.forEach((hit: any) => {
        if (hit.webformatURL) {
          candidates.push({ url: hit.webformatURL, source: 'pixabay' });
        }
      });
      console.log(`Pixabay found ${candidates.length} images`);
      return candidates;
    }
  } catch (e) {
    console.log('Pixabay error:', e);
  }
  return [];
}

async function validateImageWithGroq(
  imageUrl: string,
  english: string,
  turkish: string,
  rejectedCount: number
): Promise<{ valid: boolean; reason: string }> {
  const groqKey = Deno.env.get('GROQ_API_KEY');
  if (!groqKey) {
    console.log('GROQ_API_KEY not configured, accepting image');
    return { valid: true, reason: 'No Groq API key' };
  }

  try {
    // Daha önce reddedilen resim sayısına göre analiz derinliğini artır
    const strictnessLevel = rejectedCount > 0 
      ? `ÇOK DİKKATLİ OL! Bu kelime için daha önce ${rejectedCount} resim reddedildi. Çok daha detaylı analiz yap.`
      : '';

    const prompt = `Sen bir dil öğrenme uygulaması için UZMAN resim doğrulayıcısısın.

İngilizce kelime: "${english}"
Türkçe anlamı: "${turkish}"

${strictnessLevel}

Bu resim "${turkish}" anlamını DOĞRU ve NET bir şekilde temsil ediyor mu?

DETAYLI ANALİZ YAP:
1. Resimde ne görünüyor? (detaylı açıkla)
2. "${turkish}" kelimesinin TÜRKÇE'deki anlamı nedir?
3. Resim bu anlamı doğru yansıtıyor mu?

ÖNEMLİ KURALLAR:
- İngilizce kelimenin birden fazla anlamı olabilir
- SADECE "${turkish}" Türkçe anlamına uygun olmalı
- Farklı anlamlara gelen resimler KABUL EDİLMEMELİ

ÖRNEKLER:
- "tie" = "kravat" → kravat resmi UYGUN, ip bağlama resmi UYGUN DEĞİL
- "tie" = "bağlamak" → ip bağlama resmi UYGUN, kravat resmi UYGUN DEĞİL
- "bank" = "banka" → banka binası UYGUN, nehir kenarı UYGUN DEĞİL
- "bank" = "kıyı" → nehir kenarı UYGUN, banka binası UYGUN DEĞİL

Sadece şu formatlardan birini kullan:
"VALID - [resimde ne var ve neden uygun]"
"INVALID - [resimde ne var ve neden uygun değil]"`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-90b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return { valid: true, reason: 'Groq API error, accepting' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log(`Groq validation: ${content}`);

    const isValid = content.toUpperCase().startsWith('VALID');
    return { valid: isValid, reason: content };
  } catch (e) {
    console.error('Groq validation error:', e);
    return { valid: true, reason: 'Error, accepting' };
  }
}

async function generateImageWithAI(english: string, turkish: string, rejectedCount: number): Promise<string | null> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) {
    console.log('LOVABLE_API_KEY not configured');
    return null;
  }

  try {
    console.log(`Generating AI image for: ${english} (${turkish}), rejected count: ${rejectedCount}`);
    
    // Daha önce reddedilen resim sayısına göre prompt'u güçlendir
    const emphasis = rejectedCount > 0 
      ? `CRITICAL: Previous ${rejectedCount} images were rejected. You MUST create a VERY CLEAR, UNAMBIGUOUS image that represents ONLY the Turkish meaning "${turkish}".` 
      : '';
    
    const prompt = `Create a simple, clear, educational illustration for language learning.

English word: "${english}"
Turkish meaning: "${turkish}"

${emphasis}

The image MUST clearly and ONLY represent the concept of "${turkish}" in Turkish.
- DO NOT represent other meanings of "${english}"
- Make it obvious what the image represents
- Simple, clear, educational style
- No text in the image
- High quality, professional illustration`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      console.error('AI generation error:', response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageUrl) {
      console.log('AI image generated successfully');
      return imageUrl;
    }
    
    return null;
  } catch (e) {
    console.error('AI generation error:', e);
    return null;
  }
}

function isImageRejected(url: string, rejectedImages: string[]): boolean {
  // URL'nin base domain'ini kontrol et
  for (const rejected of rejectedImages) {
    // Aynı URL ise reddet
    if (url === rejected) return true;
    // URL parametreleri hariç aynı base URL ise reddet
    const urlBase = url.split('?')[0];
    const rejectedBase = rejected.split('?')[0];
    if (urlBase === rejectedBase) return true;
  }
  return false;
}

async function tryValidateFromCandidates(
  candidates: ImageCandidate[],
  english: string,
  turkish: string,
  rejectedImages: string[]
): Promise<string | null> {
  const rejectedCount = rejectedImages.length;
  
  for (const candidate of candidates) {
    // Skip if already rejected
    if (isImageRejected(candidate.url, rejectedImages)) {
      console.log(`Skipping already rejected: ${candidate.url}`);
      continue;
    }
    
    console.log(`Validating ${candidate.source}: ${candidate.url}`);
    const validation = await validateImageWithGroq(candidate.url, english, turkish, rejectedCount);
    
    if (validation.valid) {
      console.log(`Image accepted from ${candidate.source}`);
      return candidate.url;
    }
    console.log(`Image rejected: ${validation.reason}`);
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { wordId, query, turkish, rejectedImages = [] }: { wordId: string; query: string; turkish: string; rejectedImages: string[] } = await req.json()
    
    if (!wordId || !query) {
      return new Response(
        JSON.stringify({ error: 'wordId and query are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`\n=== Fetching image for: ${query} (${turkish}) ===`);
    console.log(`Previously rejected images: ${rejectedImages.length}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let validImageUrl: string | null = null;

    // Step 1: Try Unsplash
    const unsplashImages = await fetchFromUnsplash(query);
    if (unsplashImages.length > 0 && turkish) {
      validImageUrl = await tryValidateFromCandidates(unsplashImages, query, turkish, rejectedImages);
    } else if (unsplashImages.length > 0 && !rejectedImages.some(r => unsplashImages.some(u => isImageRejected(u.url, [r])))) {
      validImageUrl = unsplashImages[0].url;
    }

    // Step 2: Try Pexels if Unsplash failed
    if (!validImageUrl) {
      const pexelsImages = await fetchFromPexels(query);
      if (pexelsImages.length > 0 && turkish) {
        validImageUrl = await tryValidateFromCandidates(pexelsImages, query, turkish, rejectedImages);
      } else if (pexelsImages.length > 0 && !rejectedImages.some(r => pexelsImages.some(p => isImageRejected(p.url, [r])))) {
        validImageUrl = pexelsImages[0].url;
      }
    }

    // Step 3: Try Pixabay if Pexels failed
    if (!validImageUrl) {
      const pixabayImages = await fetchFromPixabay(query);
      if (pixabayImages.length > 0 && turkish) {
        validImageUrl = await tryValidateFromCandidates(pixabayImages, query, turkish, rejectedImages);
      } else if (pixabayImages.length > 0 && !rejectedImages.some(r => pixabayImages.some(p => isImageRejected(p.url, [r])))) {
        validImageUrl = pixabayImages[0].url;
      }
    }

    // Step 4: Generate with AI if all APIs failed
    if (!validImageUrl) {
      console.log('All APIs failed, generating with AI...');
      validImageUrl = await generateImageWithAI(query, turkish || query, rejectedImages.length);
    }

    // Save to database
    if (validImageUrl) {
      const { error } = await supabase
        .from('words')
        .update({ image_url: validImageUrl })
        .eq('id', wordId)

      if (error) {
        console.error('DB save error:', error)
      } else {
        console.log('Image saved to database')
      }

      return new Response(
        JSON.stringify({ imageUrl: validImageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ imageUrl: null, rejected: true, reason: 'No image found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})