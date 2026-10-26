import { beforeEach, describe, expect, it } from 'vitest';

import type {
  CampaignPersistence,
  CampaignRecord,
} from '../src/modules/campaigns/campaigns.types';
import {
  CampaignNotFoundError,
  ParticipantConflictError,
  ParticipantService,
  ParticipantValidationError,
} from '../src/modules/participants/participants.service';
import type {
  ParticipantPersistence,
  ParticipantRow,
  ParticipantTokenData,
} from '../src/modules/participants/participants.types';

class InMemoryParticipantPersistence implements ParticipantPersistence {
  readonly rows = new Map<string, ParticipantTokenData>();
  private readonly byHash = new Map<string, string>();

  async upsertWithToken(data: ParticipantTokenData): Promise<void> {
    const previous = this.rows.get(data.participantCode);
    if (previous) {
      this.byHash.delete(previous.tokenHash);
    }
    this.rows.set(data.participantCode, data);
    this.byHash.set(data.tokenHash, data.participantCode);
  }

  async findByTokenHash(tokenHash: string): Promise<ParticipantRow | null> {
    const code = this.byHash.get(tokenHash);
    const row = code ? this.rows.get(code) : undefined;
    return row
      ? {
          participantCode: row.participantCode,
          campaignId: row.campaignId,
          tokenExpiresAt: row.tokenExpiresAt,
        }
      : null;
  }

  async findCampaignOfCode(participantCode: string): Promise<number | null> {
    return this.rows.get(participantCode)?.campaignId ?? null;
  }
}

function campaignPersistenceWith(ids: number[]): CampaignPersistence {
  const record = (id: number): CampaignRecord => ({
    id,
    name: `Campanha ${id}`,
    status: 'draft',
    maxSends: null,
    startsAt: null,
    endsAt: null,
    createdAt: new Date().toISOString(),
  });

  return {
    create: async () => record(1),
    findById: async (id) => (ids.includes(id) ? record(id) : null),
    list: async () => ids.map(record),
    updateStatus: async (id) => (ids.includes(id) ? record(id) : null),
  };
}

describe('ParticipantService', () => {
  let persistence: InMemoryParticipantPersistence;
  let service: ParticipantService;

  beforeEach(() => {
    persistence = new InMemoryParticipantPersistence();
    service = new ParticipantService(
      persistence,
      campaignPersistenceWith([1, 2]),
      { baseUrl: 'http://localhost:3000' },
    );
  });

  it('gera tokens opacos com link e guarda somente o hash', async () => {
    const result = await service.enroll(1, { codes: ['P001', 'P002'] });

    expect(result.participants).toHaveLength(2);
    for (const participant of result.participants) {
      expect(participant.token).toMatch(/^[A-Za-z0-9_-]{32,64}$/);
      expect(participant.loginUrl).toContain(`?p=${participant.token}`);
    }

    const stored = [...persistence.rows.values()];
    const serialized = JSON.stringify(stored);
    for (const participant of result.participants) {
      expect(serialized).not.toContain(participant.token);
    }
  });

  it('resolve um token valido para participante e campanha', async () => {
    const { participants } = await service.enroll(2, { codes: ['P010'] });
    const token = participants[0].token;

    await expect(service.resolveToken(token)).resolves.toEqual({
      participantCode: 'P010',
      campaignId: 2,
    });
  });

  it('nao resolve token malformado nem expirado', async () => {
    const { participants } = await service.enroll(1, { codes: ['P001'] });
    const token = participants[0].token;

    await expect(service.resolveToken('token-invalido')).resolves.toBeNull();

    const stored = persistence.rows.get('P001');
    if (stored) {
      stored.tokenExpiresAt = new Date(Date.now() - 1_000);
    }
    await expect(service.resolveToken(token)).resolves.toBeNull();
  });

  it('recusa inscricao em campanha inexistente', async () => {
    await expect(
      service.enroll(999, { codes: ['P001'] }),
    ).rejects.toBeInstanceOf(CampaignNotFoundError);
  });

  it('recusa codigos invalidos', async () => {
    await expect(service.enroll(1, { codes: ['xx'] })).rejects.toBeInstanceOf(
      ParticipantValidationError,
    );
  });

  it('recusa reutilizar codigo que ja pertence a outra campanha', async () => {
    await service.enroll(1, { codes: ['P001'] });

    await expect(
      service.enroll(2, { codes: ['P001'] }),
    ).rejects.toBeInstanceOf(ParticipantConflictError);
  });

  it('rotaciona o token ao reinscrever na mesma campanha', async () => {
    const first = await service.enroll(1, { codes: ['P001'] });
    const second = await service.enroll(1, { codes: ['P001'] });

    expect(second.participants[0].token).not.toEqual(
      first.participants[0].token,
    );
    await expect(
      service.resolveToken(first.participants[0].token),
    ).resolves.toBeNull();
  });
});
