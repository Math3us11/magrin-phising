import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app';
import type { LoginOperations } from '../src/modules/login/login.types';

const apps: ReturnType<typeof buildApp>[] = [];
const loginOperations: LoginOperations = {
  registerClick: async () => true,
  submit: async () => ({
    participantCode: 'P001',
    campaignId: 1,
    cpfMasked: '***.***.***-00',
    passwordMasked: '[8 caracteres capturados]',
  }),
};

function createTestApp(): ReturnType<typeof buildApp> {
  const app = buildApp({ loginOperations });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('fluxo educativo posterior ao login', () => {
  it('entrega um documento inequivocamente ficticio e nao pagavel', async () => {
    const response = await createTestApp().inject({
      method: 'GET',
      url: '/boleto?p=P001',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toContain('Simulação Acadêmica');
    expect(response.body).toContain('NÃO PAGÁVEL');
    expect(response.body).toContain('Linha ilustrativa deliberadamente inválida');
    expect(response.body).not.toContain('Pagar agora');
    expect(response.body).not.toContain('pix');
  });

  it('entrega a conscientizacao e explica a protecao dos dados', async () => {
    const response = await createTestApp().inject({
      method: 'GET',
      url: '/awareness?p=P001',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Simulação Acadêmica');
    expect(response.body).toContain('Pare, confira e reporte.');
    expect(response.body).toContain('nenhum CPF completo');
  });
});
