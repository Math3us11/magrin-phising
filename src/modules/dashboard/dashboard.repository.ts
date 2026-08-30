import { Audit } from '../../database/models';
import type { AuditEventType } from '../../database/models/audit.model';
import type { MetricsPersistence } from './dashboard.types';

export class SequelizeMetricsPersistence implements MetricsPersistence {
  async countEvent(eventType: AuditEventType): Promise<number> {
    return Audit.count({ where: { eventType } });
  }
}

