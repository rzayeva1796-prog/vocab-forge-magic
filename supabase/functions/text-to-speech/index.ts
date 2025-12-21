import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, language = "tr" } = await req.json();

    if (!text) {
      throw new Error("Text is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`TTS request for text: "${text.substring(0, 50)}..." in language: ${language}`);

    // Lovable AI ile ses üretimi (Gemini modeli)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a text-to-speech assistant. Your task is to read the given text naturally. Just acknowledge that you would read it."
          },
          {
            role: "user",
            content: `Please read this text: "${text}"`
          }
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      // Fallback to Web Speech API
      return new Response(
        JSON.stringify({ 
          text: text,
          language: language,
          useWebSpeech: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Lovable AI TTS henüz ses döndürmediği için Web Speech API kullan
    return new Response(
      JSON.stringify({ 
        text: text,
        language: language,
        useWebSpeech: true 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ 
        text: "",
        useWebSpeech: true,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 200, // Return 200 to allow fallback
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
