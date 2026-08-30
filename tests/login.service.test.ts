import { describe, expect, it, vi } from 'vitest';

import { LoginService, LoginValidationError } from '../src/modules/login/login.service';
import type {
  LoginPersistence,
  MaskedLoginSubmission,
} from '../src/modules/login/login.types';

function createPersistence() {
  const saved: MaskedLoginSubmission[] = [];

  const persistence: LoginPersistence = {
    recordEvent: vi.fn(async () => undefined),
    saveSubmissionAndEvent: vi.fn(async (submission) => {
      saved.push(submission);
    }),
  };

  return { persistence, saved };
}

describe('LoginService', () => {
  it('entrega somente CPF e senha mascarados para a persistencia', async () => {
    const { persistence, saved } = createPersistence();
    const service = new LoginService(
      persistence,
      ['P001'],
      ['00000000000'],
    );

    await service.submit({
      participantCode: 'P001',
      cpf: '000.000.000-00',
      password: 'teste123',
    });

    expect(saved).toEqual([
      {
        participantCode: 'P001',
        cpfMasked: '***.***.***-00',
        passwordMasked: '[8 caracteres capturados]',
      },
    ]);

    const persistedJson = JSON.stringify(saved);
    expect(persistedJson).not.toContain('00000000000');
    expect(persistedJson).not.toContain('teste123');
  });

  it('recusa participante ou CPF fora das allowlists', async () => {
    const { persistence } = createPersistence();
    const service = new LoginService(
      persistence,
      ['P001'],
      ['00000000000'],
    );

    await expect(
      service.submit({
        participantCode: 'P999',
        cpf: '123.456.789-09',
        password: 'teste123',
      }),
    ).rejects.toBeInstanceOf(LoginValidationError);

    expect(persistence.saveSubmissionAndEvent).not.toHaveBeenCalled();
  });

  it('registra o clique somente para participante permitido', async () => {
    const { persistence } = createPersistence();
    const service = new LoginService(
      persistence,
      ['P001'],
      ['00000000000'],
    );

    await expect(service.registerClick('P001')).resolves.toBe(true);
    await expect(service.registerClick('P999')).resolves.toBe(false);

    expect(persistence.recordEvent).toHaveBeenCalledTimes(1);
    expect(persistence.recordEvent).toHaveBeenCalledWith('P001', 'link_clicked');
  });
});

