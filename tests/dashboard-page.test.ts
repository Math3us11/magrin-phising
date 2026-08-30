import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app';
import type { DashboardOperations } from '../src/modules/dashboard/dashboard.types';
import type { LoginOperations } from '../src/modules/login/login.types';

const apps: ReturnType<typeof buildApp>[] = [];

const dashboardOperations: DashboardOperations = {
  getMetrics: async () => ({
    emailsSent: 10,
    linksClicked: 6,
    formsSubmitted: 3,
    clickRate: 60,
    submissionRate: 30,
    conversionAfterClick: 50,
  }),
};

const loginOperations: LoginOperations = {
  registerClick: async () => true,
  submit: async () => ({
    participantCode: 'P001',
    cpfMasked: '***.***.***-00',
    passwordMasked: '[8 caracteres capturados]',
  }),
};

function createTestApp(): ReturnType<typeof buildApp> {
  const app = buildApp({ dashboardOperations, loginOperations });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('dashboard de apresentacao', () => {
  it('entrega a tela de conscientizacao com banner permanente', async () => {
    const response = await createTestApp().inject({
      method: 'GET',
      url: '/dashboard?p=P001',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Simulação Acadêmica');
    expect(response.body).toContain('Você participou de uma simulação de phishing.');
  });

  it('retorna somente metricas agregadas', async () => {
    const response = await createTestApp().inject({
      method: 'GET',
      url: '/api/dashboard/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      emailsSent: 10,
      linksClicked: 6,
      formsSubmitted: 3,
      clickRate: 60,
      submissionRate: 30,
      conversionAfterClick: 50,
    });
    expect(response.body).not.toContain('cpfMasked');
    expect(response.body).not.toContain('passwordMasked');
  });
});

