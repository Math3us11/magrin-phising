import { Audit } from '../../database/models';
import type { AuditEventType } from '../../database/models/audit.model';
import type { MetricsPersistence } from './dashboard.types';

export class SequelizeMetricsPersistence implements MetricsPersistence {
  async countEvent(
    eventType: AuditEventType,
    campaignId?: number | null,
  ): Promise<number> {
    const where: { eventType: AuditEventType; campaignId?: number } = {
      eventType,
    };

    if (typeof campaignId === 'number') {
      where.campaignId = campaignId;
    }

    return Audit.count({ where });
  }
}
