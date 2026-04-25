import type { FastifyInstance } from 'fastify';

import { isAuthenticated } from './auth.js';

type CreateRecipeGenerateBody = {
  title?: string;
};

type CreateRecipeImportBody = {
  title?: string;
  text?: string;
};

export const registerCreateRecipeRoutes = (app: FastifyInstance) => {
  app.post<{ Body: CreateRecipeGenerateBody }>('/tools/create-recipe/generate', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const title = request.body?.title?.trim() ?? '';

    if (!title) {
      return reply.code(400).send({ message: 'A dish title is required.' });
    }

    try {
      const existingRecipe = await app.norish.findRecipeByExactName(title);

      if (existingRecipe) {
        return reply.code(409).send({
          message: `${title} already exists in Norish. Generation skipped to avoid a duplicate.`,
          matchedRecipe: existingRecipe,
        });
      }

      const text = await app.recipeTextGenerator.generateRecipeFromTitle(title);

      return reply.send({
        message: `Generated ${title}. Review the recipe text before importing.`,
        recipeName: title,
        text,
      });
    } catch (error) {
      request.log.error(error, 'Unable to generate recipe preview');

      return reply.code(502).send({
        message: error instanceof Error ? error.message : 'Unable to generate recipe preview.',
      });
    }
  });

  app.post<{ Body: CreateRecipeImportBody }>('/tools/create-recipe/import', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const title = request.body?.title?.trim() ?? '';
    const text = request.body?.text?.trim() ?? '';

    if (!title) {
      return reply.code(400).send({ message: 'A dish title is required.' });
    }

    if (!text) {
      return reply.code(400).send({ message: 'Generated recipe text is required before import.' });
    }

    try {
      const existingRecipe = await app.norish.findRecipeByExactName(title);

      if (existingRecipe) {
        return reply.code(409).send({
          message: `${title} already exists in Norish. Import skipped to avoid a duplicate.`,
          matchedRecipe: existingRecipe,
        });
      }

      const result = await app.norish.importRecipeFromPaste(text, true);

      return reply.send({
        message: `Imported ${title}.`,
        recipeName: title,
        recipeIds: result.recipeIds,
      });
    } catch (error) {
      request.log.error(error, 'Unable to import reviewed recipe');

      return reply.code(502).send({
        message: error instanceof Error ? error.message : 'Unable to import reviewed recipe.',
      });
    }
  });
};