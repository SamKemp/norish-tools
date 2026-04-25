import type { FastifyInstance } from 'fastify';

import { registerAuthRoutes } from './auth.js';
import { registerCalendarRoutes } from './calendar.js';
import { registerCreateRecipeRoutes } from './create-recipe.js';
import { registerDeleteRecipeRoutes } from './delete-recipe.js';
import { registerFrontendRoutes } from './frontend.js';
import { registerGrocyImportRoutes } from './grocy-import.js';
import { registerHealthRoutes } from './health.js';
import { registerToolRoutes } from './tools.js';

export const registerRoutes = (app: FastifyInstance) => {
  registerAuthRoutes(app);
  registerCalendarRoutes(app);
  registerCreateRecipeRoutes(app);
  registerDeleteRecipeRoutes(app);
  registerFrontendRoutes(app);
  registerGrocyImportRoutes(app);
  registerHealthRoutes(app);
  registerToolRoutes(app);
};
