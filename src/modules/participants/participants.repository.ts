import { Participant } from '../../database/models';
import type {
  ParticipantPersistence,
  ParticipantRow,
  ParticipantTokenData,
} from './participants.types';

export class SequelizeParticipantPersistence
  implements ParticipantPersistence
{
  async upsertWithToken(data: ParticipantTokenData): Promise<void> {
    // participant_code e globalmente unico: o upsert rotaciona o token de um
    // participante ja inscrito na mesma campanha.
    await Participant.upsert({
      campaignId: data.campaignId,
      participantCode: data.participantCode,
      tokenHash: data.tokenHash,
      tokenExpiresAt: data.tokenExpiresAt,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<ParticipantRow | null> {
    const row = await Participant.findOne({ where: { tokenHash } });

    if (!row) {
      return null;
    }

    return {
      participantCode: row.participantCode,
      campaignId: row.campaignId,
      tokenExpiresAt: row.tokenExpiresAt,
    };
  }

  async findCampaignOfCode(participantCode: string): Promise<number | null> {
    const row = await Participant.findOne({
      where: { participantCode },
      attributes: ['campaignId'],
    });

    return row ? row.campaignId : null;
  }
}
