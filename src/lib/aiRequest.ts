const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface AIRequestOptions {
  action: string;
  word?: string;
  sourceLanguage?: string;
  learnedWords?: string[];
}

export async function makeAIRequest(
  options: AIRequestOptions,
  retries = 3,
  baseDelay = 1000
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vocabulary-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(options),
        }
      );

      if (response.status === 429) {
        if (attempt < retries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
}
