import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
import { createDemoResetRoute } from '../src/modules/admin/demo-reset.route';
import type { DemoResetOperations } from '../src/modules/admin/demo-reset.types';

const apps: ReturnType<typeof Fastify>[] = [];

function createApp(operations: DemoResetOperations) {
  const app = Fastify({ logger: false });
  app.register(createDemoResetRoute(operations));
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('POST /admin/reset-demo', () => {
  it('recusa acesso sem token administrativo', async () => {
    const reset = vi.fn().mockResolvedValue({
      auditEventsDeleted: 0,
      submissionsDeleted: 0,
    });
    const app = createApp({
      getSummary: vi.fn(),
      reset,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/reset-demo',
      payload: { confirmation: 'RESETAR DEMONSTRACAO' },
    });

    expect(response.statusCode).toBe(401);
    expect(reset).not.toHaveBeenCalled();
  });

  it('limpa os dados com token e confirmacao', async () => {
    const app = createApp({
      getSummary: vi.fn(),
      reset: vi.fn().mockResolvedValue({
        auditEventsDeleted: 7,
        submissionsDeleted: 2,
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/reset-demo',
      headers: { authorization: `Bearer ${env.ADMIN_API_TOKEN}` },
      payload: { confirmation: 'RESETAR DEMONSTRACAO' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      auditEventsDeleted: 7,
      submissionsDeleted: 2,
    });
  });
});
