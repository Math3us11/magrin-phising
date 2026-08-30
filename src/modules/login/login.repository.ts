import { Audit, Submission } from '../../database/models';
import type { AuditEventType } from '../../database/models/audit.model';
import { sequelize } from '../../database/sequelize';
import type {
  LoginPersistence,
  MaskedLoginSubmission,
} from './login.types';

export class SequelizeLoginPersistence implements LoginPersistence {
  async recordEvent(
    participantCode: string,
    eventType: AuditEventType,
  ): Promise<void> {
    await Audit.findOrCreate({
      where: { participantCode, eventType },
      defaults: { participantCode, eventType },
    });
  }

  async saveSubmissionAndEvent(
    submission: MaskedLoginSubmission,
  ): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      await Submission.upsert(submission, { transaction });

      await Audit.findOrCreate({
        where: {
          participantCode: submission.participantCode,
          eventType: 'form_submitted',
        },
        defaults: {
          participantCode: submission.participantCode,
          eventType: 'form_submitted',
        },
        transaction,
      });
    });
  }
}

