import { timingSafeEqual } from 'node:crypto';

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

import { env } from '../../config/env';
import {
  EmailAuditError,
  EmailAuthorizationDisabledError,
  EmailDeliveryError,
  EmailValidationError,
} from './email.service';
import type { EmailOperations } from './email.types';

function isAuthorized(request: FastifyRequest): boolean {
  const authorization = request.headers.authorization;
  const prefix = 'Bearer ';

  if (!authorization?.startsWith(prefix)) {
    return false;
  }

  const received = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(env.ADMIN_API_TOKEN);

  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

export function createEmailRoute(
  operations: EmailOperations,
): FastifyPluginAsync {
  return async (app) => {
    app.post('/admin/email/authorize', async (request, reply) => {
      if (!isAuthorized(request)) {
        return reply.code(401).send({
          ok: false,
          error: 'Autenticacao administrativa obrigatoria.',
        });
      }

      try {
        const result = await operations.authorizeTemporaryRecipient(
          request.body,
        );

        return reply.code(201).send({
          ok: true,
          status: result.status,
          expiresAt: result.expiresAt,
        });
      } catch (error) {
        if (error instanceof EmailAuthorizationDisabledError) {
          return reply.code(403).send({
            ok: false,
            error: 'A autorizacao temporaria esta desabilitada.',
          });
        }

        if (error instanceof EmailValidationError) {
          return reply.code(400).send({
            ok: false,
            error: 'Participante, destinatario ou consentimento invalido.',
          });
        }

        throw error;
      }
    });

    app.post('/admin/send', async (request, reply) => {
      if (!isAuthorized(request)) {
        return reply.code(401).send({
          ok: false,
          error: 'Autenticacao administrativa obrigatoria.',
        });
      }

      try {
        const result = await operations.sendSimulationEmail(request.body);

        if (result.status === 'disabled') {
          return reply.code(503).send({
            ok: false,
            status: result.status,
            error: 'O envio de e-mail esta desabilitado.',
          });
        }

        return reply.code(result.status === 'sent' ? 201 : 200).send({
          ok: true,
          status: result.status,
        });
      } catch (error) {
        if (error instanceof EmailValidationError) {
          return reply.code(400).send({
            ok: false,
            error: 'Use somente participante e destinatario autorizados.',
          });
        }

        if (error instanceof EmailDeliveryError) {
          request.log.error('Falha no transporte de e-mail da simulacao.');
          return reply.code(502).send({
            ok: false,
            error: 'O servidor de e-mail nao confirmou o envio.',
          });
        }

        if (error instanceof EmailAuditError) {
          request.log.error(
            'E-mail confirmado, mas o evento de auditoria nao foi registrado.',
          );
          return reply.code(500).send({
            ok: false,
            error: 'O envio ocorreu, mas a auditoria precisa ser verificada.',
          });
        }

        throw error;
      }
    });
  };
}
