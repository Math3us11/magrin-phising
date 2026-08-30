import type { FastifyPluginAsync } from 'fastify';

import { sequelize } from '../../database/sequelize';

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    try {
      await sequelize.authenticate();

      return {
        status: 'ok',
        database: 'connected',
      };
    } catch {
      return reply.code(503).send({
        status: 'degraded',
        database: 'unavailable',
      });
    }
  });
};

