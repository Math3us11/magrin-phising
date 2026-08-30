import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { FastifyPluginAsync } from 'fastify';

import { LoginValidationError } from './login.service';
import type { LoginOperations } from './login.types';

const loginPagePath = path.join(process.cwd(), 'public', 'login.html');

interface LoginQuery {
  p?: string;
}

export function createLoginRoute(
  operations: LoginOperations,
): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Querystring: LoginQuery }>('/login', async (request, reply) => {
      try {
        await operations.registerClick(request.query.p);
      } catch {
        request.log.warn('Nao foi possivel registrar o clique da demonstracao.');
      }

      const page = await readFile(loginPagePath, 'utf8');
      return reply.type('text/html; charset=utf-8').send(page);
    });

    app.post('/login', async (request, reply) => {
      try {
        const saved = await operations.submit(request.body);

        return reply.code(201).send({
          ok: true,
          participantCode: saved.participantCode,
          nextUrl: `/dashboard?p=${encodeURIComponent(saved.participantCode)}`,
          message: 'Dados ficticios registrados com mascaramento.',
        });
      } catch (error) {
        if (error instanceof LoginValidationError) {
          return reply.code(400).send({
            ok: false,
            error: 'Use somente os dados ficticios fornecidos para o teste.',
          });
        }

        throw error;
      }
    });
  };
}
