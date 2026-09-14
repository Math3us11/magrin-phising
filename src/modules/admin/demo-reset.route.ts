import type { FastifyPluginAsync } from 'fastify';

import { isAdminAuthorized } from './admin-auth';
import { DemoResetConfirmationError } from './demo-reset.service';
import type { DemoResetOperations } from './demo-reset.types';

export function createDemoResetRoute(
  operations: DemoResetOperations,
): FastifyPluginAsync {
  return async (app) => {
    app.post('/admin/reset-demo', async (request, reply) => {
      if (!isAdminAuthorized(request)) {
        return reply.code(401).send({
          ok: false,
          error: 'Autenticacao administrativa obrigatoria.',
        });
      }

      try {
        const result = await operations.reset(request.body);

        return reply.send({ ok: true, ...result });
      } catch (error) {
        if (error instanceof DemoResetConfirmationError) {
          return reply.code(400).send({
            ok: false,
            error: 'Digite a confirmacao exata para limpar a demonstracao.',
          });
        }

        throw error;
      }
    });
  };
}
