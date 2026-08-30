import { describe, expect, it } from 'vitest';

import { maskCpf, maskPassword } from '../src/utils/mask';

describe('mascaramento de credenciais ficticias', () => {
  it('mantem somente os dois ultimos digitos do CPF', () => {
    expect(maskCpf('000.000.000-00')).toBe('***.***.***-00');
  });

  it('mantem somente o tamanho da senha', () => {
    const masked = maskPassword('teste123');

    expect(masked).toBe('[8 caracteres capturados]');
    expect(masked).not.toContain('teste123');
  });
});

