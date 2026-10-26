import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { FastifyPluginAsync } from 'fastify';

const consolePagePath = path.join(process.cwd(), 'public', 'admin.html');

/**
 * Serve apenas a casca HTML da console administrativa. A pagina nao contem
 * segredos: todas as acoes exigem o token administrativo digitado pelo
 * operador e enviado como `Authorization: Bearer` as rotas /admin/*, que
 * permanecem protegidas no servidor (AGENTS secoes 7 e 11).
 */
export const adminConsoleRoute: FastifyPluginAsync = async (app) => {
  app.get('/admin/console', async (_request, reply) => {
    const page = await readFile(consolePagePath, 'utf8');

    return reply
      .header('Cache-Control', 'no-store')
      .header('Referrer-Policy', 'no-referrer')
      .header('X-Robots-Tag', 'noindex, nofollow')
      .type('text/html; charset=utf-8')
      .send(page);
  });
};
