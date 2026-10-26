import { describe, expect, it, vi } from 'vitest';

import {
  LoginService,
  LoginValidationError,
} from '../src/modules/login/login.service';
import type {
  LoginPersistence,
  MaskedLoginSubmission,
  ParticipantResolver,
} from '../src/modules/login/login.types';

const VALID_TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789_-AB';

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

function createResolver(
  participant: { participantCode: string; campaignId: number } | null,
): ParticipantResolver {
  return { resolveToken: vi.fn(async () => participant) };
}

describe('LoginService', () => {
  it('entrega CPF e senha mascarados e vinculados a campanha do token', async () => {
    const { persistence, saved } = createPersistence();
    const service = new LoginService(
      persistence,
      createResolver({ participantCode: 'P001', campaignId: 7 }),
      ['00000000000'],
    );

    await service.submit({
      p: VALID_TOKEN,
      cpf: '000.000.000-00',
      password: 'teste123',
    });

    expect(saved).toEqual([
      {
        participantCode: 'P001',
        campaignId: 7,
        cpfMasked: '***.***.***-00',
        passwordMasked: '[8 caracteres capturados]',
      },
    ]);

    const persistedJson = JSON.stringify(saved);
    expect(persistedJson).not.toContain('00000000000');
    expect(persistedJson).not.toContain('teste123');
  });

  it('recusa token invalido ou expirado sem persistir', async () => {
    const { persistence } = createPersistence();
    const service = new LoginService(persistence, createResolver(null), [
      '00000000000',
    ]);

    await expect(
      service.submit({
        p: VALID_TOKEN,
        cpf: '000.000.000-00',
        password: 'teste123',
      }),
    ).rejects.toBeInstanceOf(LoginValidationError);

    expect(persistence.saveSubmissionAndEvent).not.toHaveBeenCalled();
  });

  it('recusa CPF fora do cadastro ficticio sem persistir', async () => {
    const { persistence } = createPersistence();
    const service = new LoginService(
      persistence,
      createResolver({ participantCode: 'P001', campaignId: 7 }),
      ['00000000000'],
    );

    await expect(
      service.submit({
        p: VALID_TOKEN,
        cpf: '123.456.789-09',
        password: 'teste123',
      }),
    ).rejects.toBeInstanceOf(LoginValidationError);

    expect(persistence.saveSubmissionAndEvent).not.toHaveBeenCalled();
  });

  it('registra o clique com a campanha quando o token e valido', async () => {
    const { persistence } = createPersistence();
    const service = new LoginService(
      persistence,
      createResolver({ participantCode: 'P001', campaignId: 7 }),
      ['00000000000'],
    );

    await expect(service.registerClick(VALID_TOKEN)).resolves.toBe(true);
    await expect(service.registerClick(undefined)).resolves.toBe(false);

    expect(persistence.recordEvent).toHaveBeenCalledTimes(1);
    expect(persistence.recordEvent).toHaveBeenCalledWith(
      'P001',
      'link_clicked',
      7,
    );
  });
});
