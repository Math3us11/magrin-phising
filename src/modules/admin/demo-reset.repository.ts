import { Audit, Submission } from '../../database/models';
import { sequelize } from '../../database/sequelize';
import type {
  DemoDataSummary,
  DemoResetPersistence,
  DemoResetResult,
} from './demo-reset.types';

export class SequelizeDemoResetPersistence implements DemoResetPersistence {
  async getSummary(): Promise<DemoDataSummary> {
    const [auditEvents, submissions] = await Promise.all([
      Audit.count(),
      Submission.count(),
    ]);

    return { auditEvents, submissions };
  }

  async clearData(): Promise<DemoResetResult> {
    return sequelize.transaction(async (transaction) => {
      const submissionsDeleted = await Submission.destroy({
        where: {},
        transaction,
      });
      const auditEventsDeleted = await Audit.destroy({
        where: {},
        transaction,
      });

      return { auditEventsDeleted, submissionsDeleted };
    });
  }
}
