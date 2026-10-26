export interface ParticipantTokenData {
  campaignId: number;
  participantCode: string;
  tokenHash: string;
  tokenExpiresAt: Date;
}

export interface ParticipantRow {
  participantCode: string;
  campaignId: number;
  tokenExpiresAt: Date;
}

export interface ResolvedParticipant {
  participantCode: string;
  campaignId: number;
}

export interface MintedParticipant {
  participantCode: string;
  campaignId: number;
  token: string;
  loginUrl: string;
  tokenExpiresAt: string;
}

export interface EnrollParticipantsResult {
  campaignId: number;
  participants: MintedParticipant[];
}

export interface ParticipantPersistence {
  upsertWithToken(data: ParticipantTokenData): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<ParticipantRow | null>;
  findCampaignOfCode(participantCode: string): Promise<number | null>;
}

export interface ParticipantOperations {
  enroll(campaignId: number, input: unknown): Promise<EnrollParticipantsResult>;
  resolveToken(token: string): Promise<ResolvedParticipant | null>;
}
