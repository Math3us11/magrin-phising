import { Sequelize } from 'sequelize';

import { env } from '../config/env';
import { sequelize } from '../database/sequelize';

async function setupDatabase(): Promise<void> {
  const bootstrap = new Sequelize({
    dialect: env.DB_DIALECT,
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    logging: false,
  });

  let stage = 'conexao com o servidor MariaDB';

  try {
    console.info('Preparando o banco de dados da Simulacao Academica...');

    await bootstrap.authenticate();

    stage = 'criacao do banco configurado';
    await bootstrap.getQueryInterface().createDatabase(env.DB_DATABASE, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });
    console.info(`- banco ${env.DB_DATABASE}: verificado`);

    stage = 'criacao das tabelas padrao';
    await sequelize.authenticate();
    // Sem force ou alter: preserva dados e cria somente estruturas ausentes.
    await sequelize.sync();

    const queryInterface = sequelize.getQueryInterface();
    const [auditExists, submissionsExists] = await Promise.all([
      queryInterface.tableExists('audit'),
      queryInterface.tableExists('submissions'),
    ]);

    if (!auditExists || !submissionsExists) {
      throw new Error('As tabelas esperadas nao foram encontradas.');
    }

    console.info('- tabela audit: verificada');
    console.info('- tabela submissions: verificada');
    console.info('Banco pronto. Agora execute: npm run dev');
  } catch {
    console.error(`Falha durante ${stage}.`);
    console.error(
      'Confirme se o MariaDB esta ativo e revise DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME e DB_PASSWORD no .env.',
    );
    process.exitCode = 1;
  } finally {
    await Promise.all([
      bootstrap.close().catch(() => undefined),
      sequelize.close().catch(() => undefined),
    ]);
  }
}

void setupDatabase();
