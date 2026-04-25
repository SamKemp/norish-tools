import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

const start = async (): Promise<void> => {
  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`Norish Tools listening on http://${env.HOST}:${env.PORT}`);
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exitCode = 1;
  }
};

await start();
