import { describe, expect, it } from 'vitest';

import {
  generateParticipantToken,
  hashParticipantToken,
  isWellFormedToken,
} from '../src/utils/token';

describe('token do participante', () => {
  it('gera tokens opacos distintos e com hash deterministico', () => {
    const a = generateParticipantToken();
    const b = generateParticipantToken();

    expect(a.token).not.toEqual(b.token);
    expect(isWellFormedToken(a.token)).toBe(true);
    expect(a.tokenHash).toHaveLength(64);
    expect(a.tokenHash).not.toContain(a.token);
    expect(hashParticipantToken(a.token)).toBe(a.tokenHash);
  });

  it('rejeita valores que nao parecem token', () => {
    expect(isWellFormedToken('P001')).toBe(false);
    expect(isWellFormedToken('')).toBe(false);
    expect(isWellFormedToken('contém espaço e simbolo!')).toBe(false);
  });
});
