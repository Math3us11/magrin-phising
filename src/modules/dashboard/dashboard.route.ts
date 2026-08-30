import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { FastifyPluginAsync } from 'fastify';

import type { DashboardOperations } from './dashboard.types';

const dashboardPagePath = path.join(process.cwd(), 'public', 'dashboard.html');

export function createDashboardRoute(
  operations: DashboardOperations,
): FastifyPluginAsync {
  return async (app) => {
    app.get('/dashboard', async (_request, reply) => {
      const page = await readFile(dashboardPagePath, 'utf8');
      return reply.type('text/html; charset=utf-8').send(page);
    });

    app.get('/api/dashboard/metrics', async () => operations.getMetrics());
  };
}

