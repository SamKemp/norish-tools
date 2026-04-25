import type { FastifyInstance } from 'fastify';

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'norish-tools',
  }));

  app.get('/health/ready', async (_request, reply) => {
    try {
      const upstream = await app.norish.getHealth();
      return {
        status: 'ok',
        upstream,
      };
    } catch (error) {
      requestAwareLog(app, error, 'Norish readiness check failed');

      return reply.code(503).send({
        status: 'error',
        message: 'Norish API is not reachable',
      });
    }
  });

  app.get('/norish/status', async () => app.norish.getHealth());
};

const requestAwareLog = (app: FastifyInstance, error: unknown, message: string) => {
  app.log.error(error, message);
};
