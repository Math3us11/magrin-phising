import { readFile } from 'node:fs/promises';
import path from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';

const assetsDirectory = path.join(process.cwd(), 'public', 'assets');
const boletoPagePath = path.join(process.cwd(), 'public', 'boleto.html');
const awarenessPagePath = path.join(process.cwd(), 'public', 'awareness.html');

async function sendHtmlPage(
  reply: FastifyReply,
  pagePath: string,
) {
  const page = await readFile(pagePath, 'utf8');

  return reply
    .header('Cache-Control', 'no-store')
    .header('X-Robots-Tag', 'noindex, nofollow')
    .type('text/html; charset=utf-8')
    .send(page);
}

export const publicRoute: FastifyPluginAsync = async (app) => {
  await app.register(fastifyStatic, {
    root: assetsDirectory,
    prefix: '/assets/',
    index: false,
  });

  app.get('/boleto', async (_request, reply) =>
    sendHtmlPage(reply, boletoPagePath),
  );

  app.get('/awareness', async (_request, reply) =>
    sendHtmlPage(reply, awarenessPagePath),
  );
};
