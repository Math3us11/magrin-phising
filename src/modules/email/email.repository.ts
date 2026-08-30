import { Audit } from '../../database/models';
import type { EmailPersistence } from './email.types';

export class SequelizeEmailPersistence implements EmailPersistence {
  async wasSent(participantCode: string): Promise<boolean> {
    const count = await Audit.count({
      where: { participantCode, eventType: 'email_sent' },
    });

    return count > 0;
  }

  async recordSent(participantCode: string): Promise<void> {
    await Audit.findOrCreate({
      where: { participantCode, eventType: 'email_sent' },
      defaults: { participantCode, eventType: 'email_sent' },
    });
  }
}
