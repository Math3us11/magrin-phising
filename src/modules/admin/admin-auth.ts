import { timingSafeEqual } from 'node:crypto';

import type { FastifyRequest } from 'fastify';

import { env } from '../../config/env';

export function isAdminAuthorized(request: FastifyRequest): boolean {
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
