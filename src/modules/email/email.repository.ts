import { Audit } from '../../database/models';
import type { EmailPersistence } from './email.types';

export class SequelizeEmailPersistence implements EmailPersistence {
  async wasSent(participantCode: string): Promise<boolean> {
    const count = await Audit.count({
      where: { participantCode, eventType: 'email_sent' },
    });

    return count > 0;
  }

  async recordSent(
    participantCode: string,
    campaignId: number,
  ): Promise<void> {
    await Audit.findOrCreate({
      where: { participantCode, eventType: 'email_sent' },
      defaults: { participantCode, eventType: 'email_sent', campaignId },
    });
  }

  async countSentForCampaign(campaignId: number): Promise<number> {
    return Audit.count({ where: { campaignId, eventType: 'email_sent' } });
  }
}
