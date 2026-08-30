export interface SimulationEmailInput {
  participantCode: string;
  recipient: string;
}

export interface SimulationEmailContent {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: Array<{
    filename: string;
    path: string;
    cid: string;
    contentDisposition: 'inline';
  }>;
}

export interface EmailDeliveryResult {
  status: 'disabled' | 'sent' | 'already_sent';
  messageId?: string;
}

export interface EmailPersistence {
  wasSent(participantCode: string): Promise<boolean>;
  recordSent(participantCode: string): Promise<void>;
}

export interface EmailTransport {
  send(content: SimulationEmailContent): Promise<{ messageId?: string }>;
}

export interface EmailOperations {
  sendSimulationEmail(input: unknown): Promise<EmailDeliveryResult>;
  authorizeTemporaryRecipient(
    input: unknown,
  ): Promise<{ status: 'authorized'; expiresAt: string }>;
}

export interface EmailRecipientAuthorizationStore {
  authorize(
    participantCode: string,
    recipient: string,
    ttlMilliseconds: number,
  ): Date;
  claim(participantCode: string, recipient: string): boolean;
  release(participantCode: string, recipient: string): void;
  consume(participantCode: string, recipient: string): void;
}

export interface EmailServiceConfig {
  mode: 'disabled' | 'mailpit' | 'smtp';
  from: string;
  baseUrl: string;
  allowedRecipients: readonly string[];
  allowedParticipantCodes: readonly string[];
  allowRuntimeRecipientAuthorization: boolean;
  runtimeAuthorizationTtlSeconds: number;
}
