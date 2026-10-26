import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app';

const apps: ReturnType<typeof buildApp>[] = [];

function createTestApp(): ReturnType<typeof buildApp> {
  const app = buildApp();
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('GET /admin/console', () => {
  it('serve a casca da console sem cache e identificada como simulacao', async () => {
    const response = await createTestApp().inject({
      method: 'GET',
      url: '/admin/console',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toContain('Simulação Acadêmica');
    expect(response.body).toContain('Console administrativo');
  });

  it('nao embute o token administrativo na pagina', async () => {
    const response = await createTestApp().inject({
      method: 'GET',
      url: '/admin/console',
    });

    expect(response.body).not.toContain(process.env.ADMIN_API_TOKEN);
  });
});
