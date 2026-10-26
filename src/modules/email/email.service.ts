import { z } from 'zod';

import { env } from '../../config/env';
import { isCampaignSendable } from '../campaigns/campaigns.service';
import { participantService } from '../participants/participants.service';
import { SequelizeCampaignPersistence } from '../campaigns/campaigns.repository';
import { InMemoryEmailRecipientAuthorizationStore } from './email.authorization';
import { SequelizeEmailPersistence } from './email.repository';
import { buildSimulationEmail } from './email.template';
import { NodemailerEmailTransport } from './email.transport';
import type {
  EmailCampaignLookup,
  EmailDeliveryResult,
  EmailOperations,
  EmailPersistence,
  EmailRecipientAuthorizationStore,
  EmailServiceConfig,
  EmailTokenIssuer,
  EmailTransport,
} from './email.types';

const sendInputSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
  participantCode: z.string().regex(/^P\d{3,6}$/),
  recipient: z.string().trim().toLowerCase().email(),
});

const temporaryAuthorizationSchema = z.object({
  participantCode: z.string().regex(/^P\d{3,6}$/),
  recipient: z.string().trim().toLowerCase().email(),
  consent: z.literal('AUTORIZADO'),
});

export class EmailValidationError extends Error {
  constructor() {
    super('Destinatario ou participante fora da allowlist.');
    this.name = 'EmailValidationError';
  }
}

export class EmailDeliveryError extends Error {
  constructor() {
    super('Falha no transporte de e-mail.');
    this.name = 'EmailDeliveryError';
  }
}

export class EmailAuthorizationDisabledError extends Error {
  constructor() {
    super('Autorizacao temporaria de destinatarios esta desabilitada.');
    this.name = 'EmailAuthorizationDisabledError';
  }
}

export class EmailAuditError extends Error {
  constructor() {
    super('Falha ao registrar a confirmacao do envio.');
    this.name = 'EmailAuditError';
  }
}

export class EmailCampaignClosedError extends Error {
  constructor() {
    super('A campanha nao esta ativa ou esta fora da janela autorizada.');
    this.name = 'EmailCampaignClosedError';
  }
}

export class EmailLimitReachedError extends Error {
  constructor() {
    super('A campanha atingiu o limite de envios configurado.');
    this.name = 'EmailLimitReachedError';
  }
}

export class EmailService implements EmailOperations {
  constructor(
    private readonly persistence: EmailPersistence,
    private readonly transport: EmailTransport,
    private readonly config: EmailServiceConfig,
    private readonly campaigns: EmailCampaignLookup,
    private readonly tokenIssuer: EmailTokenIssuer,
    private readonly authorizationStore: EmailRecipientAuthorizationStore =
      new InMemoryEmailRecipientAuthorizationStore(),
  ) {}

  async authorizeTemporaryRecipient(
    input: unknown,
  ): Promise<{ status: 'authorized'; expiresAt: string }> {
    if (!this.config.allowRuntimeRecipientAuthorization) {
      throw new EmailAuthorizationDisabledError();
    }

    const parsed = temporaryAuthorizationSchema.safeParse(input);

    if (
      !parsed.success ||
      !this.config.allowedParticipantCodes.includes(
        parsed.data.participantCode,
      )
    ) {
      throw new EmailValidationError();
    }

    const expiresAt = this.authorizationStore.authorize(
      parsed.data.participantCode,
      parsed.data.recipient,
      this.config.runtimeAuthorizationTtlSeconds * 1_000,
    );

    return { status: 'authorized', expiresAt: expiresAt.toISOString() };
  }

  async sendSimulationEmail(
    input: unknown,
  ): Promise<EmailDeliveryResult> {
    const parsed = sendInputSchema.safeParse(input);

    if (
      !parsed.success ||
      !this.config.allowedParticipantCodes.includes(parsed.data.participantCode)
    ) {
      throw new EmailValidationError();
    }

    const { campaignId, participantCode, recipient } = parsed.data;

    if (this.config.mode === 'disabled') {
      return { status: 'disabled' };
    }

    const campaign = await this.campaigns.findById(campaignId);

    if (!campaign) {
      throw new EmailValidationError();
    }

    // Campanha parada, em rascunho ou fora da janela nao dispara (AGENTS 2.3/2.4).
    if (!isCampaignSendable(campaign)) {
      throw new EmailCampaignClosedError();
    }

    if (await this.persistence.wasSent(participantCode)) {
      return { status: 'already_sent' };
    }

    if (campaign.maxSends !== null) {
      const sent = await this.persistence.countSentForCampaign(campaign.id);
      if (sent >= campaign.maxSends) {
        throw new EmailLimitReachedError();
      }
    }

    const usesTemporaryAuthorization = !this.isStaticallyAllowed(recipient);

    if (
      usesTemporaryAuthorization &&
      !this.authorizationStore.claim(participantCode, recipient)
    ) {
      throw new EmailValidationError();
    }

    let loginUrl: string;

    try {
      // O token em texto so existe aqui: segue direto para o link do e-mail,
      // nunca para log ou banco (guardamos apenas o hash).
      ({ loginUrl } = await this.tokenIssuer.issueToken(
        campaign.id,
        participantCode,
      ));
    } catch {
      if (usesTemporaryAuthorization) {
        this.authorizationStore.release(participantCode, recipient);
      }
      throw new EmailValidationError();
    }

    const message = buildSimulationEmail(
      { participantCode, recipient },
      this.config.from,
      loginUrl,
    );

    let result: { messageId?: string };

    try {
      result = await this.transport.send(message);
    } catch {
      if (usesTemporaryAuthorization) {
        this.authorizationStore.release(participantCode, recipient);
      }

      // Nao anexa o erro original para evitar que endereco ou dados SMTP
      // aparecam no log global do Fastify.
      throw new EmailDeliveryError();
    }

    try {
      await this.persistence.recordSent(participantCode, campaign.id);
    } catch {
      if (usesTemporaryAuthorization) {
        // O transporte ja confirmou a entrega. Consumir a autorizacao evita
        // uma duplicidade caso apenas o registro de auditoria tenha falhado.
        this.authorizationStore.consume(participantCode, recipient);
      }

      throw new EmailAuditError();
    }

    if (usesTemporaryAuthorization) {
      this.authorizationStore.consume(participantCode, recipient);
    }

    return { status: 'sent', messageId: result.messageId };
  }

  private isStaticallyAllowed(recipient: string): boolean {
    return this.config.allowedRecipients.some(
      (item) => item.trim().toLowerCase() === recipient,
    );
  }
}

const emailRecipientAuthorizationStore =
  new InMemoryEmailRecipientAuthorizationStore();

export const emailService = new EmailService(
  new SequelizeEmailPersistence(),
  new NodemailerEmailTransport(),
  {
    mode: env.EMAIL_MODE,
    from: env.EMAIL_FROM,
    baseUrl: env.SIMULATION_BASE_URL,
    allowedRecipients: env.EMAIL_RECIPIENT_ALLOWLIST,
    allowedParticipantCodes: env.ALLOWED_PARTICIPANT_CODES,
    allowRuntimeRecipientAuthorization:
      env.ALLOW_RUNTIME_RECIPIENT_AUTHORIZATION,
    runtimeAuthorizationTtlSeconds:
      env.RUNTIME_RECIPIENT_AUTHORIZATION_TTL_SECONDS,
  },
  new SequelizeCampaignPersistence(),
  participantService,
  emailRecipientAuthorizationStore,
);
