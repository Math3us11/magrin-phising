import Fastify, { type FastifyInstance } from 'fastify';

import { createDemoResetRoute } from './modules/admin/demo-reset.route';
import { demoResetService } from './modules/admin/demo-reset.service';
import type { DemoResetOperations } from './modules/admin/demo-reset.types';
import { createDashboardRoute } from './modules/dashboard/dashboard.route';
import { dashboardService } from './modules/dashboard/dashboard.service';
import type { DashboardOperations } from './modules/dashboard/dashboard.types';
import { createEmailRoute } from './modules/email/email.route';
import { emailService } from './modules/email/email.service';
import type { EmailOperations } from './modules/email/email.types';
import { healthRoute } from './modules/health/health.route';
import { createLoginRoute } from './modules/login/login.route';
import { loginService } from './modules/login/login.service';
import type { LoginOperations } from './modules/login/login.types';
import { publicRoute } from './modules/public/public.route';

interface BuildAppOptions {
  dashboardOperations?: DashboardOperations;
  demoResetOperations?: DemoResetOperations;
  emailOperations?: EmailOperations;
  loginOperations?: LoginOperations;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: {
      level: 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body',
          'res.headers.set-cookie',
        ],
        censor: '[REDACTED]',
      },
    },
    bodyLimit: 4 * 1024,
  });

  app.get('/', async () => ({
    name: 'Simulacao Academica de Phishing',
    status: 'running',
  }));

  app.register(healthRoute);
  app.register(publicRoute);
  app.register(createLoginRoute(options.loginOperations ?? loginService));
  app.register(
    createDashboardRoute(options.dashboardOperations ?? dashboardService),
  );
  app.register(createEmailRoute(options.emailOperations ?? emailService));
  app.register(
    createDemoResetRoute(options.demoResetOperations ?? demoResetService),
  );

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, 'Erro interno na requisicao');

    return reply.code(500).send({
      error: 'Nao foi possivel processar a solicitacao.',
    });
  });

  return app;
}
