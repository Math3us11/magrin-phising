import { describe, expect, it, vi } from 'vitest';

import {
  EmailAuthorizationDisabledError,
  EmailCampaignClosedError,
  EmailDeliveryError,
  EmailLimitReachedError,
  EmailService,
  EmailValidationError,
} from '../src/modules/email/email.service';
import { InMemoryEmailRecipientAuthorizationStore } from '../src/modules/email/email.authorization';
import type {
  EmailCampaignLookup,
  EmailPersistence,
  EmailServiceConfig,
  EmailTokenIssuer,
  EmailTransport,
} from '../src/modules/email/email.types';
import type { CampaignRecord } from '../src/modules/campaigns/campaigns.types';

const baseConfig: EmailServiceConfig = {
  mode: 'mailpit',
  from: 'simulacao@example.test',
  baseUrl: 'http://localhost:3000',
  allowedRecipients: ['participante@example.test'],
  allowedParticipantCodes: ['P001'],
  allowRuntimeRecipientAuthorization: false,
  runtimeAuthorizationTtlSeconds: 300,
};

const activeCampaign: CampaignRecord = {
  id: 1,
  name: 'Turma 6 semestre',
  status: 'active',
  maxSends: null,
  startsAt: null,
  endsAt: null,
  createdAt: new Date().toISOString(),
};

function campaignLookup(campaign: CampaignRecord | null): EmailCampaignLookup {
  return { findById: vi.fn().mockResolvedValue(campaign) };
}

function tokenIssuer(): EmailTokenIssuer {
  return {
    issueToken: vi
      .fn()
      .mockResolvedValue({ loginUrl: 'http://localhost:3000/login?p=tok123' }),
  };
}

function createDependencies(alreadySent = false): {
  persistence: EmailPersistence;
  transport: EmailTransport;
} {
  return {
    persistence: {
      wasSent: vi.fn().mockResolvedValue(alreadySent),
      recordSent: vi.fn().mockResolvedValue(undefined),
      countSentForCampaign: vi.fn().mockResolvedValue(0),
    },
    transport: {
      send: vi.fn().mockResolvedValue({ messageId: 'local-message-id' }),
    },
  };
}

describe('EmailService', () => {
  it('envia com link por token e registra o envio na campanha', async () => {
    const dependencies = createDependencies();
    const issuer = tokenIssuer();
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
      campaignLookup(activeCampaign),
      issuer,
    );

    const result = await service.sendSimulationEmail({
      campaignId: 1,
      participantCode: 'P001',
      recipient: 'PARTICIPANTE@example.test',
    });

    expect(result).toEqual({ status: 'sent', messageId: 'local-message-id' });
    expect(issuer.issueToken).toHaveBeenCalledWith(1, 'P001');
    expect(dependencies.transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'participante@example.test',
        html: expect.stringContaining('login?p=tok123'),
      }),
    );
    expect(dependencies.persistence.recordSent).toHaveBeenCalledWith('P001', 1);
  });

  it('recusa destinatario fora da allowlist sem acionar o transporte', async () => {
    const dependencies = createDependencies();
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
      campaignLookup(activeCampaign),
      tokenIssuer(),
    );

    await expect(
      service.sendSimulationEmail({
        campaignId: 1,
        participantCode: 'P001',
        recipient: 'nao-autorizado@example.test',
      }),
    ).rejects.toBeInstanceOf(EmailValidationError);
    expect(dependencies.transport.send).not.toHaveBeenCalled();
  });

  it('recusa envio quando a campanha nao esta ativa', async () => {
    const dependencies = createDependencies();
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
      campaignLookup({ ...activeCampaign, status: 'stopped' }),
      tokenIssuer(),
    );

    await expect(
      service.sendSimulationEmail({
        campaignId: 1,
        participantCode: 'P001',
        recipient: 'participante@example.test',
      }),
    ).rejects.toBeInstanceOf(EmailCampaignClosedError);
    expect(dependencies.transport.send).not.toHaveBeenCalled();
  });

  it('recusa envio ao atingir o limite da campanha', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.persistence.countSentForCampaign).mockResolvedValue(
      5,
    );
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
      campaignLookup({ ...activeCampaign, maxSends: 5 }),
      tokenIssuer(),
    );

    await expect(
      service.sendSimulationEmail({
        campaignId: 1,
        participantCode: 'P001',
        recipient: 'participante@example.test',
      }),
    ).rejects.toBeInstanceOf(EmailLimitReachedError);
    expect(dependencies.transport.send).not.toHaveBeenCalled();
  });

  it('nao reenvia para participante que ja possui email_sent', async () => {
    const dependencies = createDependencies(true);
    const service = new EmailService(
      dependencies.persistence,
      dependencies.transport,
      baseConfig,
      campaignLookup(activeCampaign),
      tokenIssuer(),
    );

    const result = await service.sendSimulationEmail({
      campaignId: 1,
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
      campaignLookup(activeCampaign),
      tokenIssuer(),
    );

    const result = await service.sendSimulationEmail({
      campaignId: 1,
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
      campaignLookup(activeCampaign),
      tokenIssuer(),
    );

    await expect(
      service.sendSimulationEmail({
        campaignId: 1,
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
      campaignLookup(activeCampaign),
      tokenIssuer(),
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
        campaignId: 1,
        participantCode: 'P001',
        recipient: 'voluntario@example.test',
      }),
    ).resolves.toMatchObject({ status: 'sent' });

    await expect(
      service.sendSimulationEmail({
        campaignId: 1,
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
      campaignLookup(activeCampaign),
      tokenIssuer(),
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
