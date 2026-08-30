import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app';
import type { LoginOperations } from '../src/modules/login/login.types';

const apps: ReturnType<typeof buildApp>[] = [];
const testLoginOperations: LoginOperations = {
  registerClick: async () => true,
  submit: async () => ({
    participantCode: 'P001',
    cpfMasked: '***.***.***-00',
    passwordMasked: '[8 caracteres capturados]',
  }),
};

function createTestApp(): ReturnType<typeof buildApp> {
  const app = buildApp({ loginOperations: testLoginOperations });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('GET /login', () => {
  it('entrega a pagina identificada permanentemente como simulacao', async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/login?p=P001',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Simulação Acadêmica');
    expect(response.body).toContain('<label for="cpf">Login</label>');
    expect(response.body).toContain('<label for="password">Senha</label>');
    expect(response.body).toContain('/assets/images/afya-logo-white.png');
  });

  it('serve os estilos do frontend', async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/assets/css/login.css',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/css');
  });

  it('serve o fundo e o logotipo usados na referencia visual', async () => {
    const app = createTestApp();

    const [background, logo] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/assets/images/afya-login-background.jpg',
      }),
      app.inject({
        method: 'GET',
        url: '/assets/images/afya-logo-white.png',
      }),
    ]);

    expect(background.statusCode).toBe(200);
    expect(background.headers['content-type']).toContain('image/jpeg');
    expect(logo.statusCode).toBe(200);
    expect(logo.headers['content-type']).toContain('image/png');
  });

  it('envia o formulario ficticio ao endpoint do servidor', async () => {
    const app = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/login',
      payload: {
        participantCode: 'P001',
        cpf: '000.000.000-00',
        password: 'teste123',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      ok: true,
      participantCode: 'P001',
      nextUrl: '/dashboard?p=P001',
    });
  });
});
