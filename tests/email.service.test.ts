import { describe, expect, it, vi } from 'vitest';

import {
  EmailAuthorizationDisabledError,
  EmailDeliveryError,
  EmailService,
  EmailValidationError,
} from '../src/modules/email/email.service';
import { InMemoryEmailRecipientAuthorizationStore } from '../src/modules/email/email.authorization';
import type {
  EmailPersistence,
  EmailServiceConfig,
  EmailTransport,
} from '../src/modules/email/email.types';

const baseConfig: EmailServiceConfig = {
  mode: 'mailpit',
  from: 'simulacao@example.test',
  baseUrl: 'http://localhost:3000',
  allowedRecipients: ['participante@example.test'],
  allowedParticipantCodes: ['P001'],
  allowRuntimeRecipientAuthorization: false,
  runtimeAuthorizationTtlSeconds: 300,
};

function createDependencies(alreadySent = false): {
  persistence: EmailPersistence;
  transport: EmailTransport;
} {
  return {
    persistence: {
      wasSent: vi.fn().mockResolvedValue(alreadySent),
      recordSent: vi.fn().mockResolvedValue(undefined),
    },
    transport: {
      send: vi.fn().mockResolvedValue({ messageId: 'local-message-id' }),
    },
  };
}

describe('EmailService', () => {
  it('envia somente para a allowlist e registra depois da confirmacao', async () => {
    const dependencies = createDependencies();
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
    );

    const result = await service.sendSimulationEmail({
      participantCode: 'P001',
      recipient: 'PARTICIPANTE@example.test',
    });

    expect(result).toEqual({ status: 'sent', messageId: 'local-message-id' });
    expect(dependencies.transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'participante@example.test',
        subject: expect.stringContaining('Simulacao Academica'),
      }),
    );
    expect(dependencies.persistence.recordSent).toHaveBeenCalledWith('P001');
  });

  it('recusa destinatario fora da allowlist sem acionar o transporte', async () => {
    const dependencies = createDependencies();
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
    );

    await expect(
      service.sendSimulationEmail({
        participantCode: 'P001',
        recipient: 'nao-autorizado@example.test',
      }),
    ).rejects.toBeInstanceOf(EmailValidationError);
    expect(dependencies.transport.send).not.toHaveBeenCalled();
  });

  it('nao reenvia para participante que ja possui email_sent', async () => {
    const dependencies = createDependencies(true);
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
    );

    const result = await service.sendSimulationEmail({
      participantCode: 'P001',
      recipient: 'participante@example.test',
    });

    expect(result).toEqual({ status: 'already_sent' });
    expect(dependencies.transport.send).not.toHaveBeenCalled();
  });

  it('mantem o transporte desligado por padrao de configuracao', async () => {
    const dependencies = createDependencies();
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      { ...baseConfig, mode: 'disabled' },
    );

    const result = await service.sendSimulationEmail({
      participantCode: 'P001',
      recipient: 'participante@example.test',
    });

    expect(result).toEqual({ status: 'disabled' });
    expect(dependencies.transport.send).not.toHaveBeenCalled();
    expect(dependencies.persistence.recordSent).not.toHaveBeenCalled();
  });

  it('nao registra email_sent quando o transporte falha', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.transport.send).mockRejectedValue(
      new Error('erro SMTP com detalhes sensiveis'),
    );
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
    );

    await expect(
      service.sendSimulationEmail({
        participantCode: 'P001',
        recipient: 'participante@example.test',
      }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(dependencies.persistence.recordSent).not.toHaveBeenCalled();
  });

  it('autoriza um voluntario temporariamente e consome a permissao apos o envio', async () => {
    const dependencies = createDependencies();
    const authorizationStore = new InMemoryEmailRecipientAuthorizationStore();
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      { ...baseConfig, allowRuntimeRecipientAuthorization: true },
      authorizationStore,
    );

    await expect(
      service.authorizeTemporaryRecipient({
        participantCode: 'P001',
        recipient: 'voluntario@example.test',
        consent: 'AUTORIZADO',
      }),
    ).resolves.toMatchObject({ status: 'authorized' });

    await expect(
      service.sendSimulationEmail({
        participantCode: 'P001',
        recipient: 'voluntario@example.test',
      }),
    ).resolves.toMatchObject({ status: 'sent' });

    await expect(
      service.sendSimulationEmail({
        participantCode: 'P001',
        recipient: 'voluntario@example.test',
      }),
    ).rejects.toBeInstanceOf(EmailValidationError);
  });

  it('recusa autorizacao temporaria quando o recurso esta desabilitado', async () => {
    const dependencies = createDependencies();
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
    );

    await expect(
      service.authorizeTemporaryRecipient({
        participantCode: 'P001',
        recipient: 'voluntario@example.test',
        consent: 'AUTORIZADO',
      }),
    ).rejects.toBeInstanceOf(EmailAuthorizationDisabledError);
  });
});
