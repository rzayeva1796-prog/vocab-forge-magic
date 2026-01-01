import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { words, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let prompt = "";
    
    if (type === "sentences") {
      prompt = `Generate simple English sentences for Turkish language learners. For each word, create ONE simple sentence that uses the word and helps demonstrate its meaning.

Words to create sentences for:
${words.map((w: {english: string, turkish: string}) => `- ${w.english} (${w.turkish})`).join('\n')}

Return a JSON array with this exact format:
[
  {"word": "english_word", "sentence": "Simple sentence using the word with a blank _____ where the word should go"}
]

Keep sentences very simple (5-8 words). Use _____ to mark where the target word should be inserted.`;
    } else if (type === "questions") {
      prompt = `Generate simple question-answer pairs for Turkish language learners. Each question should have the English word as the correct answer.

Words to create questions for:
${words.map((w: {english: string, turkish: string}) => `- ${w.english} (${w.turkish})`).join('\n')}

Return a JSON array with this exact format:
[
  {"word": "english_word", "question": "Simple question in English where answer is the word", "wrongAnswer": "A plausible but incorrect answer"}
]

Keep questions simple and clear. The correct answer should be the English word.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a helpful language learning assistant. Always respond with valid JSON only, no markdown or explanation." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "[]";
    
    // Clean up the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log("Generated content:", content);

    return new Response(JSON.stringify({ content: JSON.parse(content) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
