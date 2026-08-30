import { describe, expect, it } from 'vitest';

import {
  EmailCliInputError,
  isSendConfirmed,
  isTemporaryAuthorizationConfirmed,
  maskEmailForDisplay,
  resolveEmailCommandInput,
  resolveInteractiveEmailInput,
} from '../src/modules/email/email.cli';

describe('resolveEmailCommandInput', () => {
  it('usa automaticamente o unico destinatario autorizado', () => {
    expect(
      resolveEmailCommandInput(
        ['P001'],
        ['P001'],
        ['participante@example.test'],
      ),
    ).toEqual({
      participantCode: 'P001',
      recipient: 'participante@example.test',
    });
  });

  it('recusa participante fora da allowlist', () => {
    expect(() =>
      resolveEmailCommandInput(
        ['P999'],
        ['P001'],
        ['participante@example.test'],
      ),
    ).toThrow(EmailCliInputError);
  });

  it('recusa destinatario informado fora da allowlist', () => {
    expect(() =>
      resolveEmailCommandInput(
        ['P001', 'externo@example.test'],
        ['P001'],
        ['participante@example.test'],
      ),
    ).toThrow(EmailCliInputError);
  });
});

describe('confirmacao interativa de e-mail', () => {
  it('mascara o destinatario exibido no resumo', () => {
    expect(maskEmailForDisplay('matheus@example.com')).toBe('ma***@example.com');
    expect(maskEmailForDisplay('a@example.com')).toBe('a***@example.com');
  });

  it('aceita somente confirmacao afirmativa explicita', () => {
    expect(isSendConfirmed('s')).toBe(true);
    expect(isSendConfirmed(' SIM ')).toBe(true);
    expect(isSendConfirmed('')).toBe(false);
    expect(isSendConfirmed('n')).toBe(false);
  });

  it('exige a palavra exata para autorizar um voluntario', () => {
    expect(isTemporaryAuthorizationConfirmed('AUTORIZADO')).toBe(true);
    expect(isTemporaryAuthorizationConfirmed('autorizado')).toBe(false);
    expect(isTemporaryAuthorizationConfirmed('sim')).toBe(false);
  });

  it('identifica destinatario digitado fora da allowlist como temporario', () => {
    expect(
      resolveInteractiveEmailInput(
        'P001',
        'voluntario@example.test',
        ['P001'],
        ['fixo@example.test'],
      ),
    ).toEqual({
      input: {
        participantCode: 'P001',
        recipient: 'voluntario@example.test',
      },
      requiresTemporaryAuthorization: true,
    });
  });
});
