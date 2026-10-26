import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { LoginValidationError } from './login.service';
import type { LoginOperations } from './login.types';

const loginPagePath = path.join(process.cwd(), 'public', 'login.html');

interface LoginQuery {
  p?: string;
}

export function createLoginRoute(
  operations: LoginOperations,
): FastifyPluginAsync {
  async function handleSubmit(request: FastifyRequest, reply: FastifyReply) {
    try {
      const saved = await operations.submit(request.body);
      const token = (request.body as { p?: string } | undefined)?.p ?? '';

      return reply.code(201).send({
        ok: true,
        participantCode: saved.participantCode,
        nextUrl: `/boleto?p=${encodeURIComponent(token)}`,
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
  }

  return async (app) => {
    app.get<{ Querystring: LoginQuery }>('/login', async (request, reply) => {
      try {
        await operations.registerClick(request.query.p);
      } catch {
        request.log.warn(
          'Nao foi possivel registrar o clique da demonstracao.',
        );
      }

      const page = await readFile(loginPagePath, 'utf8');
      return reply
        .header('Cache-Control', 'no-store')
        .header('Referrer-Policy', 'no-referrer')
        .type('text/html; charset=utf-8')
        .send(page);
    });

    // Rota canonica da Fase 2 (AGENTS secao 10) e alias compativel com a Fase 1.
    app.post('/login/cpf', handleSubmit);
    app.post('/login', handleSubmit);
  };
}
