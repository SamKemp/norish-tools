import type { FastifyInstance } from 'fastify';

import {
  buildGrocyRecipeImportText,
  type GrocyRecipeSummary,
  getGrocyRecipeForImport,
  getGrocyRecipeImportBody,
  listGrocyRecipes,
  validateGrocyConnection,
} from '../services/grocy-client.js';
import { isAuthenticated } from './auth.js';

type GrocyImportBody = {
  grocyUrl?: string;
  grocyApiToken?: string;
};

type GrocyRecipeImportBody = {
  grocyUrl?: string;
  grocyApiToken?: string;
  recipeId?: string;
  forceAI?: boolean;
};

type GrocyRecipeListItem = GrocyRecipeSummary & {
  norishMatch: {
    id: string;
    name: string;
    version: number;
  } | null;
};

export const registerGrocyImportRoutes = (app: FastifyInstance) => {
  app.post<{ Body: GrocyImportBody }>('/tools/grocy-import/connect', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const grocyUrl = request.body?.grocyUrl?.trim() ?? '';
    const grocyApiToken = request.body?.grocyApiToken?.trim() ?? '';

    if (!grocyUrl || !grocyApiToken) {
      return reply.code(400).send({ message: 'Grocy URL and API token are required.' });
    }

    try {
      await validateGrocyConnection({ grocyUrl, grocyApiToken });
      const recipes = await listGrocyRecipes({ grocyUrl, grocyApiToken });
      const recipesWithMatches = await Promise.all(recipes.map((recipe) => withNorishMatch(app, recipe)));
      const matchedCount = recipesWithMatches.filter((recipe) => recipe.norishMatch !== null).length;

      return reply.send({
        grocyUrl,
        message:
          matchedCount > 0
            ? `Connection validated. ${recipesWithMatches.length} recipes found. ${matchedCount} already match recipes in Norish.`
            : `Connection validated. ${recipesWithMatches.length} recipes found.`,
        recipes: recipesWithMatches,
      });
    } catch (error) {
      request.log.error(error, 'Unable to validate Grocy connection');

      return reply.code(502).send({
        message: error instanceof Error ? error.message : 'Unable to validate Grocy connection.',
      });
    }
  });

  app.post<{ Body: GrocyRecipeImportBody }>('/tools/grocy-import/import', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const grocyUrl = request.body?.grocyUrl?.trim() ?? '';
    const grocyApiToken = request.body?.grocyApiToken?.trim() ?? '';
    const recipeId = request.body?.recipeId?.trim() ?? '';
    const forceAI = request.body?.forceAI !== false;

    if (!grocyUrl || !grocyApiToken || !recipeId) {
      return reply.code(400).send({ message: 'Grocy URL, API token, and recipe ID are required.' });
    }

    try {
      const recipe = await getGrocyRecipeForImport({ grocyUrl, grocyApiToken }, recipeId);
      const existingRecipe = await app.norish.findRecipeByExactName(recipe.name);

      if (existingRecipe) {
        return reply.code(409).send({
          message: `${recipe.name} already exists in Norish. Import skipped to avoid a duplicate.`,
          recipeName: recipe.name,
          matchedRecipe: existingRecipe,
        });
      }

      const recipeBody = getGrocyRecipeImportBody(recipe);
      const usedAIGeneration = recipeBody.length === 0;

      const text = usedAIGeneration
        ? await app.recipeTextGenerator.generateRecipeFromTitle(recipe.name)
        : buildGrocyRecipeImportText(recipe);

      const result = await app.norish.importRecipeFromPaste(text, forceAI);

      return reply.send({
        message: usedAIGeneration
          ? `Imported ${recipe.name} using AI-generated recipe text.`
          : `Imported ${recipe.name}.`,
        recipeName: recipe.name,
        recipeIds: result.recipeIds,
        usedAIGeneration,
      });
    } catch (error) {
      request.log.error(error, 'Unable to import Grocy recipe');

      return reply.code(502).send({
        message: error instanceof Error ? error.message : 'Unable to import Grocy recipe.',
      });
    }
  });
};

const withNorishMatch = async (app: FastifyInstance, recipe: GrocyRecipeSummary): Promise<GrocyRecipeListItem> => ({
  ...recipe,
  norishMatch: await app.norish.findRecipeByExactName(recipe.name),
});
