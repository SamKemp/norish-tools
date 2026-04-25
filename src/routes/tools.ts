import type { FastifyInstance } from 'fastify';

import { toolCatalog } from '../services/tool-catalog.js';

export const registerToolRoutes = (app: FastifyInstance) => {
  app.get('/tools', async () => ({
    service: 'norish-tools',
    modules: toolCatalog,
  }));
};
