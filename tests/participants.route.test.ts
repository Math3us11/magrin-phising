import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createParticipantsRoute } from '../src/modules/participants/participants.route';
import {
  CampaignNotFoundError,
  ParticipantConflictError,
  ParticipantValidationError,
} from '../src/modules/participants/participants.service';
import type { ParticipantOperations } from '../src/modules/participants/participants.types';

const apps: ReturnType<typeof Fastify>[] = [];

function createApp(operations: Partial<ParticipantOperations>) {
  const app = Fastify({ logger: false });
  app.register(
    createParticipantsRoute({
      enroll: vi.fn(),
      resolveToken: vi.fn(),
      ...operations,
    } as ParticipantOperations),
  );
  apps.push(app);
  return app;
}

const auth = { authorization: `Bearer ${env.ADMIN_API_TOKEN}` };

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('POST /admin/campaigns/:id/participants', () => {
  it('recusa acesso sem token administrativo', async () => {
    const enroll = vi.fn();
    const app = createApp({ enroll });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/1/participants',
      payload: { codes: ['P001'] },
    });

    expect(response.statusCode).toBe(401);
    expect(enroll).not.toHaveBeenCalled();
  });

  it('inscreve participantes e responde sem cache', async () => {
    const result = {
      campaignId: 1,
      participants: [
        {
          participantCode: 'P001',
          campaignId: 1,
          token: 'abcdefghijklmnopqrstuvwxyz0123456789_-AB',
          loginUrl: 'http://localhost:3000/login?p=abc',
          tokenExpiresAt: new Date().toISOString(),
        },
      ],
    };
    const app = createApp({ enroll: vi.fn().mockResolvedValue(result) });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/1/participants',
      headers: auth,
      payload: { codes: ['P001'] },
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual({ ok: true, ...result });
  });

  it('retorna 400 para id invalido', async () => {
    const enroll = vi.fn();
    const app = createApp({ enroll });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/abc/participants',
      headers: auth,
      payload: { codes: ['P001'] },
    });

    expect(response.statusCode).toBe(400);
    expect(enroll).not.toHaveBeenCalled();
  });

  it('retorna 404 quando a campanha nao existe', async () => {
    const app = createApp({
      enroll: vi.fn().mockRejectedValue(new CampaignNotFoundError()),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/99/participants',
      headers: auth,
      payload: { codes: ['P001'] },
    });

    expect(response.statusCode).toBe(404);
  });

  it('retorna 409 para codigo de outra campanha', async () => {
    const app = createApp({
      enroll: vi.fn().mockRejectedValue(new ParticipantConflictError('P001')),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/2/participants',
      headers: auth,
      payload: { codes: ['P001'] },
    });

    expect(response.statusCode).toBe(409);
  });

  it('retorna 400 para codigos invalidos', async () => {
    const app = createApp({
      enroll: vi.fn().mockRejectedValue(new ParticipantValidationError()),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/1/participants',
      headers: auth,
      payload: { codes: ['xx'] },
    });

    expect(response.statusCode).toBe(400);
  });
});
