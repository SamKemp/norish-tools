import type { Env } from '../config/env.js';

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{
        type?: string;
        text?: string;
      }>;
    };
  }>;
};

export type RecipeTextGenerator = {
  isConfigured: boolean;
  generateRecipeFromTitle: (title: string) => Promise<string>;
};

export const createRecipeTextGenerator = (env: Env): RecipeTextGenerator => {
  const apiKey = env.OPENAI_API_KEY?.trim() ?? '';

  return {
    isConfigured: apiKey.length > 0,
    generateRecipeFromTitle: async (title: string) => {
      const trimmedTitle = title.trim();

      if (!trimmedTitle) {
        throw new Error('A recipe title is required before generating recipe text.');
      }

      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured, so title-only Grocy recipes cannot be expanded yet.');
      }

      const response = await fetch(new URL('chat/completions', withTrailingSlash(env.OPENAI_BASE_URL)), {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You generate complete home-cooking recipes from only a recipe title. Return plain text only, with no markdown code fences and no mention of AI. Use this structure exactly: title on the first line, then a blank line, then Serves, Prep time, Cook time, another blank line, Ingredients with bullet points, another blank line, Method with numbered steps, another blank line, Notes with bullet points. Make the recipe realistic, coherent, and ready for an import parser.',
            },
            {
              role: 'user',
              content: `Generate a full recipe for this title: ${trimmedTitle}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const body = await safeReadBody(response);
        throw new Error(`OpenAI request failed with ${response.status}: ${body}`);
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const recipeText = extractMessageText(payload);

      if (!recipeText) {
        throw new Error('OpenAI did not return usable recipe text.');
      }

      return recipeText;
    },
  };
};

const extractMessageText = (payload: ChatCompletionResponse) => {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === 'text' && typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }

  return '';
};

const withTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const safeReadBody = async (response: Response) => {
  try {
    return await response.text();
  } catch {
    return '<unreadable response body>';
  }
};