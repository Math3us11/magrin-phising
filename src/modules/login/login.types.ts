import type { AuditEventType } from '../../database/models/audit.model';

export interface MaskedLoginSubmission {
  participantCode: string;
  campaignId: number | null;
  cpfMasked: string;
  passwordMasked: string;
}

export interface ParticipantResolver {
  resolveToken(
    token: string,
  ): Promise<{ participantCode: string; campaignId: number } | null>;
}

export interface LoginPersistence {
  recordEvent(
    participantCode: string,
    eventType: AuditEventType,
    campaignId: number | null,
  ): Promise<void>;
  saveSubmissionAndEvent(submission: MaskedLoginSubmission): Promise<void>;
}

export interface LoginOperations {
  registerClick(token: string | undefined): Promise<boolean>;
  submit(input: unknown): Promise<MaskedLoginSubmission>;
}
