import {
  connectDatabase,
  disconnectDatabase,
} from '../database/sequelize';

async function checkDatabase(): Promise<void> {
  try {
    await connectDatabase();
    console.info('Conexao com o MariaDB estabelecida com sucesso.');
  } catch {
    console.error('Nao foi possivel conectar ao MariaDB. Verifique o .env e o servico local.');
    process.exitCode = 1;
  } finally {
    await disconnectDatabase().catch(() => undefined);
  }
}

void checkDatabase();

