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

    app.get<{ Querystring: { campaignId?: string } }>(
      '/api/dashboard/metrics',
      async (request) => {
        const raw = request.query.campaignId;
        const parsed = raw === undefined ? NaN : Number(raw);
        const campaignId =
          Number.isInteger(parsed) && parsed > 0 ? parsed : null;

        return operations.getMetrics(campaignId);
      },
    );
  };
}

