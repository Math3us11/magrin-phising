import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { isAdminAuthorized } from '../admin/admin-auth';
import {
  CampaignNotFoundError,
  CampaignStateError,
  CampaignValidationError,
} from './campaigns.service';
import type { CampaignOperations } from './campaigns.types';

interface CampaignParams {
  id: string;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof CampaignValidationError) {
    return reply.code(400).send({ ok: false, error: error.message });
  }

  if (error instanceof CampaignNotFoundError) {
    return reply.code(404).send({ ok: false, error: error.message });
  }

  if (error instanceof CampaignStateError) {
    return reply.code(409).send({ ok: false, error: error.message });
  }

  throw error;
}

export function createCampaignsRoute(
  operations: CampaignOperations,
): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (request: FastifyRequest, reply) => {
      if (!isAdminAuthorized(request)) {
        return reply.code(401).send({
          ok: false,
          error: 'Autenticacao administrativa obrigatoria.',
        });
      }
    });

    app.post('/admin/campaigns', async (request, reply) => {
      try {
        const campaign = await operations.create(request.body);
        return reply.code(201).send({ ok: true, campaign });
      } catch (error) {
        return handleError(error, reply);
      }
    });

    app.get('/admin/campaigns', async () => {
      const campaigns = await operations.list();
      return { ok: true, campaigns };
    });

    app.post<{ Params: CampaignParams }>(
      '/admin/campaigns/:id/start',
      async (request, reply) => {
        const id = parseId(request.params.id);

        if (id === null) {
          return reply
            .code(400)
            .send({ ok: false, error: 'Identificador de campanha invalido.' });
        }

        try {
          const campaign = await operations.start(id);
          return reply.send({ ok: true, campaign });
        } catch (error) {
          return handleError(error, reply);
        }
      },
    );

    app.post<{ Params: CampaignParams }>(
      '/admin/campaigns/:id/stop',
      async (request, reply) => {
        const id = parseId(request.params.id);

        if (id === null) {
          return reply
            .code(400)
            .send({ ok: false, error: 'Identificador de campanha invalido.' });
        }

        try {
          const campaign = await operations.stop(id);
          return reply.send({ ok: true, campaign });
        } catch (error) {
          return handleError(error, reply);
        }
      },
    );
  };
}
