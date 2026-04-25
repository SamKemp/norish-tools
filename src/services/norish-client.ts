import type { Env } from '../config/env.js';

type NorishHealth = {
  status: string;
  db?: {
    status: string;
  };
  parser?: {
    status: string;
    recipeScrapersVersion?: string;
  };
  versions?: Record<string, string>;
};

export type NorishPlannedRecipe = {
  id: string;
  date: string;
  slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  sortOrder: number;
  recipeId: string;
  version: number;
  recipeName: string | null;
  recipeImage: string | null;
  servings: number | null;
  calories: number | null;
};

export type NorishCalendarListItem = {
  id: string;
  date: string;
  slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  sortOrder: number;
  itemType: string;
  recipeId: string | null;
  title: string | null;
  version: number;
  recipeName: string | null;
  recipeImage: string | null;
  servings: number | null;
  calories: number | null;
};

export type NorishImportedRecipeResult = {
  recipeIds: string[];
};

export type NorishRecipeSummary = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  categories: string[];
  updatedAt: string;
  version: number;
};

export type NorishRecipeSearchResult = {
  recipes: NorishRecipeSummary[];
};

export type NorishRecipeSearchInput = {
  search?: string;
  limit?: number;
  cursor?: number;
  sortMode?: 'titleAsc' | 'titleDesc' | 'dateAsc' | 'dateDesc' | 'none';
};

export type NorishRecipeDeleteInput = {
  id: string;
  version: number;
};

export type NorishRecipeNameMatch = {
  id: string;
  name: string;
  version: number;
};

type TrpcBatchResponse<T> = Array<{
  result?: {
    data?: {
      json?: T;
    };
  };
}>;

export type NorishClient = ReturnType<typeof createNorishClient>;

export const createNorishClient = (env: Env) => {
  const baseUrl = new URL(env.NORISH_API_PREFIX.replace(/^\/+/, ''), withTrailingSlash(env.NORISH_BASE_URL));
  const trpcBaseUrl = new URL('api/trpc/', withTrailingSlash(env.NORISH_BASE_URL));

  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(new URL(path.replace(/^\//, ''), withTrailingSlash(baseUrl.toString())), {
      ...init,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': env.NORISH_API_KEY,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await safeReadBody(response);
      throw new Error(`Norish API request failed with ${response.status}: ${body}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  };

  const trpcMutation = async (path: string, input: unknown) => {
    const targetUrl = new URL(path.replace(/^\/+/, ''), trpcBaseUrl);
    targetUrl.searchParams.set('batch', '1');

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': env.NORISH_API_KEY,
      },
      body: JSON.stringify({
        0: {
          json: input,
        },
      }),
    });

    if (!response.ok) {
      const body = await safeReadBody(response);
      throw new Error(`Norish tRPC request failed with ${response.status}: ${body}`);
    }
  };

  const trpcBatchQuery = async <T>(path: string, input: unknown): Promise<T> => {
    const targetUrl = new URL(path.replace(/^\/+/, ''), trpcBaseUrl);
    targetUrl.searchParams.set('batch', '1');
    targetUrl.searchParams.set('input', JSON.stringify({ 0: { json: input } }));

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-api-key': env.NORISH_API_KEY,
      },
    });

    if (!response.ok) {
      const body = await safeReadBody(response);
      throw new Error(`Norish tRPC request failed with ${response.status}: ${body}`);
    }

    const payload = (await response.json()) as TrpcBatchResponse<T>;
    const data = payload[0]?.result?.data?.json;

    if (data === undefined) {
      throw new Error(`Norish tRPC request returned no data for ${path}`);
    }

    return data;
  };

  return {
    getHealth: () => request<NorishHealth>('health', { method: 'GET' }),
    getPlannedRecipesMonth: () => request<NorishPlannedRecipe[]>('planned-recipes/month', { method: 'GET' }),
    getCalendarItems: (startISO: string, endISO: string) =>
      trpcBatchQuery<NorishCalendarListItem[]>('calendar.listItems', {
        startISO,
        endISO,
      }),
    searchRecipes: (input: NorishRecipeSearchInput = {}) =>
      request<NorishRecipeSearchResult>('recipes/search', {
        method: 'POST',
        body: JSON.stringify({
          search: input.search ?? '',
          limit: input.limit ?? 25,
          cursor: input.cursor ?? 0,
          sortMode: input.sortMode ?? 'titleAsc',
        }),
      }),
    findRecipeByExactName: async (name: string) => {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return null;
      }

      const result = await request<NorishRecipeSearchResult>('recipes/search', {
        method: 'POST',
        body: JSON.stringify({
          search: trimmedName,
          limit: 10,
          cursor: 0,
          sortMode: 'titleAsc',
        }),
      });

      const normalizedName = normalizeRecipeName(trimmedName);
      const match = result.recipes.find((recipe) => normalizeRecipeName(recipe.name) === normalizedName);

      return match
        ? {
            id: match.id,
            name: match.name,
            version: match.version,
          }
        : null;
    },
    deleteRecipe: (input: NorishRecipeDeleteInput) =>
      trpcMutation('recipes.delete', {
        id: input.id,
        version: input.version,
      }),
    importRecipeFromPaste: (text: string, forceAI = false) =>
      request<NorishImportedRecipeResult>('recipes/import/paste', {
        method: 'POST',
        body: JSON.stringify({ text, forceAI }),
      }),
  };
};

const withTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const normalizeRecipeName = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const safeReadBody = async (response: Response) => {
  try {
    return await response.text();
  } catch {
    return '<unreadable response body>';
  }
};
