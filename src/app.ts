import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import Fastify from 'fastify';

import { env } from './config/env.js';
import { createCalendarTokenStore } from './services/calendar-token-store.js';
import { registerRoutes } from './routes/index.js';
import { createNorishClient } from './services/norish-client.js';
import { createRecipeTextGenerator } from './services/openai-client.js';

export const buildApp = () => {
  const calendarTokenStore = createCalendarTokenStore();
  void calendarTokenStore.getToken();

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  void app.register(cookie, {
    secret: env.APP_ACCESS_TOKEN,
  });

  void app.register(formbody);

  app.decorate('config', env);
  app.decorate('calendarTokenStore', calendarTokenStore);
  app.decorate('norish', createNorishClient(env));
  app.decorate('recipeTextGenerator', createRecipeTextGenerator(env));

  registerRoutes(app);

  return app;
};
