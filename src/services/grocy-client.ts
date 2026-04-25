export type GrocyConnectionInput = {
  grocyUrl: string;
  grocyApiToken: string;
};

export type GrocyRecipeSummary = {
  id: number | string;
  name: string;
  description: string | null;
};

export type GrocyRecipeImportCandidate = GrocyRecipeSummary;

export const validateGrocyConnection = async (input: GrocyConnectionInput) => {
  await requestGrocyJson(buildGrocyUrl(input.grocyUrl, 'api/system/info'), input.grocyApiToken);
};

export const listGrocyRecipes = async (input: GrocyConnectionInput): Promise<GrocyRecipeSummary[]> => {
  const recipesUrl = buildGrocyUrl(input.grocyUrl, 'api/objects/recipes');
  recipesUrl.searchParams.append('query[]', 'type=normal');
  recipesUrl.searchParams.set('order', 'name:asc');

  const payload = await requestGrocyJson<unknown>(recipesUrl, input.grocyApiToken);

  if (!Array.isArray(payload)) {
    throw new Error('Grocy recipes response was not an array');
  }

  return payload
    .filter(isGrocyNormalRecipe)
    .map(normalizeGrocyRecipe)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
};

export const getGrocyRecipeForImport = async (
  input: GrocyConnectionInput,
  recipeId: string,
): Promise<GrocyRecipeImportCandidate> => {
  const payload = await requestGrocyJson<unknown>(
    buildGrocyUrl(input.grocyUrl, `api/objects/recipes/${encodeURIComponent(recipeId)}`),
    input.grocyApiToken,
  );

  if (!isGrocyNormalRecipe(payload)) {
    throw new Error('Grocy recipe is not importable.');
  }

  return normalizeGrocyRecipe(payload);
};

export const getGrocyRecipeImportBody = (recipe: GrocyRecipeImportCandidate) => normalizeHtmlToPlainText(recipe.description);

export const buildGrocyRecipeImportText = (recipe: GrocyRecipeImportCandidate) => {
  const normalizedDescription = getGrocyRecipeImportBody(recipe);

  return normalizedDescription ? `${recipe.name}\n\n${normalizedDescription}` : recipe.name;
};

const requestGrocyJson = async <T>(url: URL, apiToken: string): Promise<T> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'GROCY-API-KEY': apiToken,
    },
  });

  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`Grocy request failed with ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
};

const buildGrocyUrl = (baseUrl: string, path: string) => new URL(path.replace(/^\//, ''), withTrailingSlash(baseUrl));

const withTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const normalizeGrocyRecipe = (value: unknown): GrocyRecipeSummary => {
  const candidate = isRecord(value) ? value : {};
  const id = typeof candidate.id === 'number' || typeof candidate.id === 'string' ? candidate.id : 'unknown';
  const name = typeof candidate.name === 'string' && candidate.name.trim().length > 0 ? candidate.name : `Recipe ${String(id)}`;
  const description = typeof candidate.description === 'string' && candidate.description.trim().length > 0 ? candidate.description : null;

  return {
    id,
    name,
    description,
  };
};

const normalizeHtmlToPlainText = (value: string | null) => {
  if (!value) {
    return '';
  }

  return decodeHtmlEntities(
    value
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/p\s*>/gi, '\n\n')
      .replace(/<\s*p\b[^>]*>/gi, '')
      .replace(/<\s*li\b[^>]*>/gi, '- ')
      .replace(/<\s*\/li\s*>/gi, '\n')
      .replace(/<\s*\/?(ul|ol)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[\t ]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim(),
  );
};

const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalizedEntity = String(entity).toLowerCase();

    if (normalizedEntity === 'amp') {
      return '&';
    }

    if (normalizedEntity === 'lt') {
      return '<';
    }

    if (normalizedEntity === 'gt') {
      return '>';
    }

    if (normalizedEntity === 'quot') {
      return '"';
    }

    if (normalizedEntity === 'apos' || normalizedEntity === '#39') {
      return "'";
    }

    if (normalizedEntity === 'nbsp') {
      return ' ';
    }

    if (normalizedEntity.startsWith('#x')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(2), 16);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }

    if (normalizedEntity.startsWith('#')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }

    return match;
  });

const isGrocyNormalRecipe = (value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  const type = typeof value.type === 'string' ? value.type : null;

  if (type !== null) {
    return type === 'normal';
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';

  if (/^\d{4}-\d{2}-\d{2}(#\d+)?$/.test(name)) {
    return false;
  }

  if (/^\d{4}-\d{2}$/.test(name)) {
    return false;
  }

  return name.length > 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const safeReadBody = async (response: Response) => {
  try {
    return await response.text();
  } catch {
    return '<unreadable response body>';
  }
};
