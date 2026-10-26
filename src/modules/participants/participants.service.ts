import { z } from 'zod';

import { env } from '../../config/env';
import {
  generateParticipantToken,
  hashParticipantToken,
  isWellFormedToken,
} from '../../utils/token';
import { SequelizeCampaignPersistence } from '../campaigns/campaigns.repository';
import type { CampaignPersistence } from '../campaigns/campaigns.types';
import { SequelizeParticipantPersistence } from './participants.repository';
import type {
  EnrollParticipantsResult,
  MintedParticipant,
  ParticipantOperations,
  ParticipantPersistence,
  ResolvedParticipant,
} from './participants.types';

const DEFAULT_EXPIRY_HOURS = 72;
const MAX_EXPIRY_HOURS = 24 * 14;

const enrollSchema = z
  .object({
    codes: z
      .array(z.string().trim().regex(/^P\d{3,6}$/))
      .min(1)
      .max(100),
    expiresInHours: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_EXPIRY_HOURS)
      .default(DEFAULT_EXPIRY_HOURS),
  })
  .strict();

export class ParticipantValidationError extends Error {
  constructor() {
    super('Dados de inscricao invalidos.');
    this.name = 'ParticipantValidationError';
  }
}

export class CampaignNotFoundError extends Error {
  constructor() {
    super('Campanha nao encontrada.');
    this.name = 'CampaignNotFoundError';
  }
}

export class ParticipantConflictError extends Error {
  constructor(code: string) {
    super(`O codigo ${code} ja pertence a outra campanha.`);
    this.name = 'ParticipantConflictError';
  }
}

export interface ParticipantServiceConfig {
  baseUrl: string;
}

export class ParticipantService implements ParticipantOperations {
  constructor(
    private readonly persistence: ParticipantPersistence,
    private readonly campaigns: CampaignPersistence,
    private readonly config: ParticipantServiceConfig,
  ) {}

  async enroll(
    campaignId: number,
    input: unknown,
  ): Promise<EnrollParticipantsResult> {
    const campaign = await this.campaigns.findById(campaignId);

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    const parsed = enrollSchema.safeParse(input);

    if (!parsed.success) {
      throw new ParticipantValidationError();
    }

    const uniqueCodes = [...new Set(parsed.data.codes)];
    const expiresAt = new Date(
      Date.now() + parsed.data.expiresInHours * 60 * 60 * 1_000,
    );

    // Valida conflitos de propriedade antes de qualquer escrita.
    for (const code of uniqueCodes) {
      await this.ensureCodeAvailable(campaignId, code);
    }

    const participants: MintedParticipant[] = [];

    for (const code of uniqueCodes) {
      participants.push(await this.mintForCode(campaignId, code, expiresAt));
    }

    return { campaignId, participants };
  }

  /**
   * Emite um token para um unico participante no momento do envio do e-mail.
   * Rotaciona o token caso ja exista inscricao na mesma campanha.
   */
  async issueToken(
    campaignId: number,
    participantCode: string,
    expiresInHours: number = DEFAULT_EXPIRY_HOURS,
  ): Promise<MintedParticipant> {
    const campaign = await this.campaigns.findById(campaignId);

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    if (!/^P\d{3,6}$/.test(participantCode)) {
      throw new ParticipantValidationError();
    }

    await this.ensureCodeAvailable(campaignId, participantCode);

    const expiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1_000,
    );

    return this.mintForCode(campaignId, participantCode, expiresAt);
  }

  private async ensureCodeAvailable(
    campaignId: number,
    code: string,
  ): Promise<void> {
    const owner = await this.persistence.findCampaignOfCode(code);
    if (owner !== null && owner !== campaignId) {
      throw new ParticipantConflictError(code);
    }
  }

  private async mintForCode(
    campaignId: number,
    code: string,
    expiresAt: Date,
  ): Promise<MintedParticipant> {
    const { token, tokenHash } = generateParticipantToken();

    await this.persistence.upsertWithToken({
      campaignId,
      participantCode: code,
      tokenHash,
      tokenExpiresAt: expiresAt,
    });

    const loginUrl = new URL('/login', this.config.baseUrl);
    loginUrl.searchParams.set('p', token);

    return {
      participantCode: code,
      campaignId,
      token,
      loginUrl: loginUrl.toString(),
      tokenExpiresAt: expiresAt.toISOString(),
    };
  }

  async resolveToken(token: string): Promise<ResolvedParticipant | null> {
    if (!isWellFormedToken(token)) {
      return null;
    }

    const row = await this.persistence.findByTokenHash(
      hashParticipantToken(token),
    );

    if (!row || row.tokenExpiresAt.getTime() <= Date.now()) {
      return null;
    }

    return { participantCode: row.participantCode, campaignId: row.campaignId };
  }
}

export const participantService = new ParticipantService(
  new SequelizeParticipantPersistence(),
  new SequelizeCampaignPersistence(),
  { baseUrl: env.SIMULATION_BASE_URL },
);
