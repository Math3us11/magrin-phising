import { createHash, randomBytes } from 'node:crypto';

/**
 * Token do participante: valor aleatorio, opaco e de uso unico por campanha.
 *
 * O valor em texto existe apenas no momento da emissao (enrollment); o banco
 * guarda somente o hash (AGENTS secao 6). Como o token tem 256 bits de
 * entropia, o SHA-256 e suficiente para a busca por hash sem risco pratico de
 * reversao ou colisao; nao e uma senha de baixa entropia que exigiria bcrypt.
 */
export interface GeneratedToken {
  token: string;
  tokenHash: string;
}

export function hashParticipantToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generateParticipantToken(): GeneratedToken {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashParticipantToken(token) };
}

/** Formato aceito para um token recebido na URL (`?p=`). */
export function isWellFormedToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(value);
}
