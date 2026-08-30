import type { AuditEventType } from '../../database/models/audit.model';

export interface LoginSubmissionInput {
  participantCode: string;
  cpf: string;
  password: string;
}

export interface MaskedLoginSubmission {
  participantCode: string;
  cpfMasked: string;
  passwordMasked: string;
}

export interface LoginPersistence {
  recordEvent(participantCode: string, eventType: AuditEventType): Promise<void>;
  saveSubmissionAndEvent(submission: MaskedLoginSubmission): Promise<void>;
}

export interface LoginOperations {
  registerClick(participantCode: string | undefined): Promise<boolean>;
  submit(input: unknown): Promise<MaskedLoginSubmission>;
}

