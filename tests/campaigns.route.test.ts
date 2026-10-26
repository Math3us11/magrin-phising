import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createCampaignsRoute } from '../src/modules/campaigns/campaigns.route';
import {
  CampaignNotFoundError,
  CampaignStateError,
  CampaignValidationError,
} from '../src/modules/campaigns/campaigns.service';
import type {
  CampaignOperations,
  CampaignRecord,
} from '../src/modules/campaigns/campaigns.types';

const apps: ReturnType<typeof Fastify>[] = [];

function createApp(operations: Partial<CampaignOperations>) {
  const app = Fastify({ logger: false });
  app.register(
    createCampaignsRoute({
      create: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      list: vi.fn(),
      ...operations,
    } as CampaignOperations),
  );
  apps.push(app);
  return app;
}

const sample: CampaignRecord = {
  id: 1,
  name: 'Turma 6 semestre',
  status: 'draft',
  maxSends: null,
  startsAt: null,
  endsAt: null,
  createdAt: new Date().toISOString(),
};

const auth = { authorization: `Bearer ${env.ADMIN_API_TOKEN}` };

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('rotas /admin/campaigns', () => {
  it('recusa acesso sem token administrativo', async () => {
    const create = vi.fn();
    const app = createApp({ create });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns',
      payload: { name: 'Sem token' },
    });

    expect(response.statusCode).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('cria campanha com token', async () => {
    const app = createApp({ create: vi.fn().mockResolvedValue(sample) });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns',
      headers: auth,
      payload: { name: 'Turma 6 semestre' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ ok: true, campaign: sample });
  });

  it('retorna 400 para dados invalidos', async () => {
    const app = createApp({
      create: vi.fn().mockRejectedValue(new CampaignValidationError()),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns',
      headers: auth,
      payload: { name: 'ab' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('lista campanhas', async () => {
    const app = createApp({ list: vi.fn().mockResolvedValue([sample]) });

    const response = await app.inject({
      method: 'GET',
      url: '/admin/campaigns',
      headers: auth,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, campaigns: [sample] });
  });

  it('ativa campanha existente', async () => {
    const started = { ...sample, status: 'active' as const };
    const app = createApp({ start: vi.fn().mockResolvedValue(started) });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/1/start',
      headers: auth,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, campaign: started });
  });

  it('retorna 400 para id invalido', async () => {
    const start = vi.fn();
    const app = createApp({ start });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/abc/start',
      headers: auth,
    });

    expect(response.statusCode).toBe(400);
    expect(start).not.toHaveBeenCalled();
  });

  it('retorna 404 para campanha inexistente', async () => {
    const app = createApp({
      stop: vi.fn().mockRejectedValue(new CampaignNotFoundError()),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/999/stop',
      headers: auth,
    });

    expect(response.statusCode).toBe(404);
  });

  it('retorna 409 para transicao invalida', async () => {
    const app = createApp({
      start: vi
        .fn()
        .mockRejectedValue(new CampaignStateError('A janela ja terminou.')),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/campaigns/1/start',
      headers: auth,
    });

    expect(response.statusCode).toBe(409);
  });
});
