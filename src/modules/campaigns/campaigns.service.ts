import { z } from 'zod';

import type { CampaignRecord } from './campaigns.types';
import { SequelizeCampaignPersistence } from './campaigns.repository';
import type { CampaignOperations, CampaignPersistence } from './campaigns.types';

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullish()
  .transform((value) => value ?? null);

const createCampaignSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    maxSends: z.coerce.number().int().positive().max(100_000).nullish()
      .transform((value) => value ?? null),
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'A janela deve terminar depois de comecar.',
      });
    }
  });

export class CampaignValidationError extends Error {
  constructor() {
    super('Dados de campanha invalidos.');
    this.name = 'CampaignValidationError';
  }
}

export class CampaignNotFoundError extends Error {
  constructor() {
    super('Campanha nao encontrada.');
    this.name = 'CampaignNotFoundError';
  }
}

export class CampaignStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignStateError';
  }
}

/**
 * Regra unica de "pode disparar/receber trafego": ativa e dentro da janela.
 * Reutilizada pelo e-mail e pelo fluxo do participante nos proximos incrementos.
 */
export function isCampaignSendable(
  campaign: CampaignRecord,
  now: Date = new Date(),
): boolean {
  if (campaign.status !== 'active') {
    return false;
  }

  if (campaign.startsAt && now < new Date(campaign.startsAt)) {
    return false;
  }

  if (campaign.endsAt && now > new Date(campaign.endsAt)) {
    return false;
  }

  return true;
}

export class CampaignService implements CampaignOperations {
  constructor(private readonly persistence: CampaignPersistence) {}

  async create(input: unknown): Promise<CampaignRecord> {
    const parsed = createCampaignSchema.safeParse(input);

    if (!parsed.success) {
      throw new CampaignValidationError();
    }

    return this.persistence.create({
      name: parsed.data.name,
      maxSends: parsed.data.maxSends,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
    });
  }

  async start(id: number): Promise<CampaignRecord> {
    const campaign = await this.requireCampaign(id);

    if (campaign.status === 'stopped') {
      throw new CampaignStateError(
        'Campanha encerrada nao pode ser reativada.',
      );
    }

    if (campaign.endsAt && new Date(campaign.endsAt) <= new Date()) {
      throw new CampaignStateError('A janela da campanha ja terminou.');
    }

    const updated = await this.persistence.updateStatus(id, 'active');

    if (!updated) {
      throw new CampaignNotFoundError();
    }

    return updated;
  }

  async stop(id: number): Promise<CampaignRecord> {
    await this.requireCampaign(id);

    const updated = await this.persistence.updateStatus(id, 'stopped');

    if (!updated) {
      throw new CampaignNotFoundError();
    }

    return updated;
  }

  async list(): Promise<CampaignRecord[]> {
    return this.persistence.list();
  }

  private async requireCampaign(id: number): Promise<CampaignRecord> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new CampaignNotFoundError();
    }

    const campaign = await this.persistence.findById(id);

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    return campaign;
  }
}

export const campaignService = new CampaignService(
  new SequelizeCampaignPersistence(),
);
