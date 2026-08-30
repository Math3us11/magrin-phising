import { buildApp } from './app';
import { env } from './config/env';
import {
  connectDatabase,
  disconnectDatabase,
} from './database/sequelize';

async function start(): Promise<void> {
  const app = buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Encerrando servidor');
    await app.close();
    await disconnectDatabase();
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await connectDatabase();
    await app.listen({ host: env.HOST, port: env.PORT });
  } catch (error) {
    app.log.error({ error }, 'Falha ao iniciar o servidor');
    await disconnectDatabase().catch(() => undefined);
    process.exitCode = 1;
  }
}

void start();

