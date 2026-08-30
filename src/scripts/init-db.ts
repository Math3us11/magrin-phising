import { disconnectDatabase, sequelize } from '../database/sequelize';

async function initializeDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();

    // Sem alter ou force: cria somente as tabelas que ainda nao existem.
    await sequelize.sync();

    console.info('Tabelas audit e submissions verificadas com sucesso.');
  } catch {
    console.error('Nao foi possivel inicializar as tabelas. Verifique o .env e o MariaDB.');
    process.exitCode = 1;
  } finally {
    await disconnectDatabase().catch(() => undefined);
  }
}

void initializeDatabase();

