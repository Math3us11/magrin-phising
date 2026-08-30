import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app';
import { env } from '../src/config/env';
import type { DashboardOperations } from '../src/modules/dashboard/dashboard.types';
import type { EmailOperations } from '../src/modules/email/email.types';
import type { LoginOperations } from '../src/modules/login/login.types';

const apps: ReturnType<typeof buildApp>[] = [];

const dashboardOperations: DashboardOperations = {
  getMetrics: async () => ({
    emailsSent: 0,
    linksClicked: 0,
    formsSubmitted: 0,
    clickRate: 0,
    submissionRate: 0,
    conversionAfterClick: 0,
  }),
};

const loginOperations: LoginOperations = {
  registerClick: async () => false,
  submit: async () => ({
    participantCode: 'P001',
    cpfMasked: '***.***.***-00',
    passwordMasked: '[8 caracteres capturados]',
  }),
};

function createTestApp(emailOperations: EmailOperations) {
  const app = buildApp({
    dashboardOperations,
    emailOperations,
    loginOperations,
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('POST /admin/send', () => {
  it('recusa chamada sem token administrativo', async () => {
    const app = createTestApp({
      sendSimulationEmail: async () => ({ status: 'sent' }),
      authorizeTemporaryRecipient: async () => ({
        status: 'authorized',
        expiresAt: new Date().toISOString(),
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/send',
      payload: {
        participantCode: 'P001',
        recipient: 'participante@example.test',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('aceita chamada autenticada sem devolver destinatario', async () => {
    const app = createTestApp({
      sendSimulationEmail: async () => ({ status: 'sent' }),
      authorizeTemporaryRecipient: async () => ({
        status: 'authorized',
        expiresAt: new Date().toISOString(),
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/send',
      headers: { authorization: `Bearer ${env.ADMIN_API_TOKEN}` },
      payload: {
        participantCode: 'P001',
        recipient: 'participante@example.test',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ ok: true, status: 'sent' });
    expect(response.body).not.toContain('participante@example.test');
  });
});

describe('POST /admin/email/authorize', () => {
  it('cria autorizacao temporaria sem devolver o destinatario', async () => {
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    const app = createTestApp({
      sendSimulationEmail: async () => ({ status: 'sent' }),
      authorizeTemporaryRecipient: async () => ({
        status: 'authorized',
        expiresAt,
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/admin/email/authorize',
      headers: { authorization: `Bearer ${env.ADMIN_API_TOKEN}` },
      payload: {
        participantCode: 'P001',
        recipient: 'voluntario@example.test',
        consent: 'AUTORIZADO',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      ok: true,
      status: 'authorized',
      expiresAt,
    });
    expect(response.body).not.toContain('voluntario@example.test');
  });
});
