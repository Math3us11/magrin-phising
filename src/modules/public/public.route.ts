import path from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyPluginAsync } from 'fastify';

const assetsDirectory = path.join(process.cwd(), 'public', 'assets');

export const publicRoute: FastifyPluginAsync = async (app) => {
  await app.register(fastifyStatic, {
    root: assetsDirectory,
    prefix: '/assets/',
    index: false,
  });
};
