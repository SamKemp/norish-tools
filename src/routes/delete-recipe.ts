import type { FastifyInstance } from 'fastify';

import { isAuthenticated } from './auth.js';

type DeleteRecipeSearchBody = {
  search?: string;
};

type DeleteRecipeBody = {
  id?: string;
  version?: number;
};

export const registerDeleteRecipeRoutes = (app: FastifyInstance) => {
  app.post<{ Body: DeleteRecipeSearchBody }>('/tools/delete-recipe/search', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const search = request.body?.search?.trim() ?? '';

    try {
      const result = await app.norish.searchRecipes({
        search,
        limit: 25,
        cursor: 0,
        sortMode: 'titleAsc',
      });

      return reply.send({
        message: `${result.recipes.length} recipes found.`,
        recipes: result.recipes,
      });
    } catch (error) {
      request.log.error(error, 'Unable to search recipes');

      return reply.code(502).send({
        message: error instanceof Error ? error.message : 'Unable to search recipes.',
      });
    }
  });

  app.post<{ Body: DeleteRecipeBody }>('/tools/delete-recipe/delete', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const id = request.body?.id?.trim() ?? '';
    const version = typeof request.body?.version === 'number' ? request.body.version : null;

    if (!id) {
      return reply.code(400).send({ message: 'Recipe ID is required.' });
    }

    if (version === null || Number.isNaN(version)) {
      return reply.code(400).send({ message: 'Recipe version is required.' });
    }

    try {
      await app.norish.deleteRecipe({ id, version });

      return reply.send({
        message: 'Recipe deleted.',
        id,
      });
    } catch (error) {
      request.log.error(error, 'Unable to delete recipe');

      return reply.code(502).send({
        message: error instanceof Error ? error.message : 'Unable to delete recipe.',
      });
    }
  });
};