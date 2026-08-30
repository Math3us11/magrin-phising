import { z } from 'zod';

import { env } from '../../config/env';
import { InMemoryEmailRecipientAuthorizationStore } from './email.authorization';
import { SequelizeEmailPersistence } from './email.repository';
import { buildSimulationEmail } from './email.template';
import { NodemailerEmailTransport } from './email.transport';
import type {
  EmailDeliveryResult,
  EmailOperations,
  EmailPersistence,
  EmailRecipientAuthorizationStore,
  EmailServiceConfig,
  EmailTransport,
} from './email.types';

const emailInputSchema = z.object({
  participantCode: z.string().regex(/^P\d{3,6}$/),
  recipient: z.string().trim().toLowerCase().email(),
});

const temporaryAuthorizationSchema = emailInputSchema.extend({
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

export class EmailService implements EmailOperations {
  constructor(
    private readonly persistence: EmailPersistence,
    private readonly transport: EmailTransport,
    private readonly config: EmailServiceConfig,
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
    const parsed = emailInputSchema.safeParse(input);

    if (
      !parsed.success ||
      !this.config.allowedParticipantCodes.includes(parsed.data.participantCode)
    ) {
      throw new EmailValidationError();
    }

    if (this.config.mode === 'disabled') {
      return { status: 'disabled' };
    }

    if (await this.persistence.wasSent(parsed.data.participantCode)) {
      return { status: 'already_sent' };
    }

    const usesTemporaryAuthorization = !this.isStaticallyAllowed(
      parsed.data.recipient,
    );

    if (
      usesTemporaryAuthorization &&
      !this.authorizationStore.claim(
        parsed.data.participantCode,
        parsed.data.recipient,
      )
    ) {
      throw new EmailValidationError();
    }

    const message = buildSimulationEmail(
      parsed.data,
      this.config.from,
      this.config.baseUrl,
    );

    let result: { messageId?: string };

    try {
      result = await this.transport.send(message);
    } catch {
      if (usesTemporaryAuthorization) {
        this.authorizationStore.release(
          parsed.data.participantCode,
          parsed.data.recipient,
        );
      }

      // Nao anexa o erro original para evitar que endereco ou dados SMTP
      // aparecam no log global do Fastify.
      throw new EmailDeliveryError();
    }

    try {
      await this.persistence.recordSent(parsed.data.participantCode);
    } catch {
      if (usesTemporaryAuthorization) {
        // O transporte ja confirmou a entrega. Consumir a autorizacao evita
        // uma duplicidade caso apenas o registro de auditoria tenha falhado.
        this.authorizationStore.consume(
          parsed.data.participantCode,
          parsed.data.recipient,
        );
      }

      throw new EmailAuditError();
    }

    if (usesTemporaryAuthorization) {
      this.authorizationStore.consume(
        parsed.data.participantCode,
        parsed.data.recipient,
      );
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
  emailRecipientAuthorizationStore,
);
