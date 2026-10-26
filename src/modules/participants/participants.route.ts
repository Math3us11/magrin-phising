import type { FastifyPluginAsync } from 'fastify';

import { isAdminAuthorized } from '../admin/admin-auth';
import {
  CampaignNotFoundError,
  ParticipantConflictError,
  ParticipantValidationError,
} from './participants.service';
import type { ParticipantOperations } from './participants.types';

interface EnrollParams {
  id: string;
}

export function createParticipantsRoute(
  operations: ParticipantOperations,
): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Params: EnrollParams }>(
      '/admin/campaigns/:id/participants',
      async (request, reply) => {
        if (!isAdminAuthorized(request)) {
          return reply.code(401).send({
            ok: false,
            error: 'Autenticacao administrativa obrigatoria.',
          });
        }

        const id = Number(request.params.id);

        if (!Number.isInteger(id) || id <= 0) {
          return reply
            .code(400)
            .send({ ok: false, error: 'Identificador de campanha invalido.' });
        }

        try {
          const result = await operations.enroll(id, request.body);

          // Os tokens em texto aparecem apenas nesta resposta: nunca em log,
          // dashboard ou banco. Por isso a resposta nao pode ser cacheada.
          return reply
            .header('Cache-Control', 'no-store')
            .code(201)
            .send({ ok: true, ...result });
        } catch (error) {
          if (error instanceof CampaignNotFoundError) {
            return reply.code(404).send({ ok: false, error: error.message });
          }

          if (error instanceof ParticipantConflictError) {
            return reply.code(409).send({ ok: false, error: error.message });
          }

          if (error instanceof ParticipantValidationError) {
            return reply.code(400).send({
              ok: false,
              error: 'Informe codigos de participante validos (ex.: P001).',
            });
          }

          throw error;
        }
      },
    );
  };
}
