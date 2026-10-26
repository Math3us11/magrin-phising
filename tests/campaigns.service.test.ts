import { beforeEach, describe, expect, it } from 'vitest';

import type { CampaignStatus } from '../src/database/models/campaign.model';
import {
  CampaignNotFoundError,
  CampaignService,
  CampaignStateError,
  CampaignValidationError,
  isCampaignSendable,
} from '../src/modules/campaigns/campaigns.service';
import type {
  CampaignPersistence,
  CampaignRecord,
  CreateCampaignData,
} from '../src/modules/campaigns/campaigns.types';

class InMemoryCampaignPersistence implements CampaignPersistence {
  private sequence = 0;
  private readonly rows = new Map<number, CampaignRecord>();

  async create(data: CreateCampaignData): Promise<CampaignRecord> {
    this.sequence += 1;
    const record: CampaignRecord = {
      id: this.sequence,
      name: data.name,
      status: 'draft',
      maxSends: data.maxSends,
      startsAt: data.startsAt ? data.startsAt.toISOString() : null,
      endsAt: data.endsAt ? data.endsAt.toISOString() : null,
      createdAt: new Date().toISOString(),
    };
    this.rows.set(record.id, record);
    return record;
  }

  async findById(id: number): Promise<CampaignRecord | null> {
    return this.rows.get(id) ?? null;
  }

  async list(): Promise<CampaignRecord[]> {
    return [...this.rows.values()].reverse();
  }

  async updateStatus(
    id: number,
    status: CampaignStatus,
  ): Promise<CampaignRecord | null> {
    const existing = this.rows.get(id);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, status };
    this.rows.set(id, updated);
    return updated;
  }
}

describe('CampaignService', () => {
  let persistence: InMemoryCampaignPersistence;
  let service: CampaignService;

  beforeEach(() => {
    persistence = new InMemoryCampaignPersistence();
    service = new CampaignService(persistence);
  });

  it('cria campanha em rascunho', async () => {
    const campaign = await service.create({ name: 'Turma 6 semestre' });

    expect(campaign.status).toBe('draft');
    expect(campaign.name).toBe('Turma 6 semestre');
    expect(campaign.maxSends).toBeNull();
  });

  it('recusa nome muito curto', async () => {
    await expect(service.create({ name: 'ab' })).rejects.toBeInstanceOf(
      CampaignValidationError,
    );
  });

  it('recusa janela que termina antes de comecar', async () => {
    await expect(
      service.create({
        name: 'Janela invertida',
        startsAt: '2026-10-20T10:00:00.000Z',
        endsAt: '2026-10-20T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(CampaignValidationError);
  });

  it('ativa e para uma campanha', async () => {
    const created = await service.create({ name: 'Campanha ativavel' });

    const started = await service.start(created.id);
    expect(started.status).toBe('active');

    const stopped = await service.stop(created.id);
    expect(stopped.status).toBe('stopped');
  });

  it('nao reativa campanha encerrada', async () => {
    const created = await service.create({ name: 'Campanha encerrada' });
    await service.start(created.id);
    await service.stop(created.id);

    await expect(service.start(created.id)).rejects.toBeInstanceOf(
      CampaignStateError,
    );
  });

  it('nao ativa campanha com janela ja terminada', async () => {
    const created = await service.create({
      name: 'Janela no passado',
      startsAt: '2020-01-01T00:00:00.000Z',
      endsAt: '2020-01-02T00:00:00.000Z',
    });

    await expect(service.start(created.id)).rejects.toBeInstanceOf(
      CampaignStateError,
    );
  });

  it('erro ao operar campanha inexistente', async () => {
    await expect(service.start(999)).rejects.toBeInstanceOf(
      CampaignNotFoundError,
    );
  });
});

describe('isCampaignSendable', () => {
  const base: CampaignRecord = {
    id: 1,
    name: 'Base',
    status: 'active',
    maxSends: null,
    startsAt: null,
    endsAt: null,
    createdAt: new Date().toISOString(),
  };

  it('true para campanha ativa sem janela', () => {
    expect(isCampaignSendable(base)).toBe(true);
  });

  it('false para campanha em rascunho ou parada', () => {
    expect(isCampaignSendable({ ...base, status: 'draft' })).toBe(false);
    expect(isCampaignSendable({ ...base, status: 'stopped' })).toBe(false);
  });

  it('respeita os limites da janela', () => {
    const now = new Date('2026-10-26T12:00:00.000Z');
    expect(
      isCampaignSendable(
        { ...base, startsAt: '2026-10-26T13:00:00.000Z' },
        now,
      ),
    ).toBe(false);
    expect(
      isCampaignSendable({ ...base, endsAt: '2026-10-26T11:00:00.000Z' }, now),
    ).toBe(false);
    expect(
      isCampaignSendable(
        {
          ...base,
          startsAt: '2026-10-26T11:00:00.000Z',
          endsAt: '2026-10-26T13:00:00.000Z',
        },
        now,
      ),
    ).toBe(true);
  });
});
