import { Sequelize } from 'sequelize';

import { env } from '../config/env';
import { initializeModels } from './models';

export const sequelize = new Sequelize({
  dialect: env.DB_DIALECT,
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_DATABASE,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  logging: env.DB_LOGGING ? (message) => console.info(message) : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 10_000,
    idle: 10_000,
  },
  define: {
    freezeTableName: true,
    underscored: true,
  },
});

initializeModels(sequelize);

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();

  if (env.DB_SYNC) {
    // Cria somente tabelas ausentes. Nunca usa alter/drop automaticamente.
    await sequelize.sync();
  }
}

export async function disconnectDatabase(): Promise<void> {
  await sequelize.close();
}

