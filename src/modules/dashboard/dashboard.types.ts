import type { AuditEventType } from '../../database/models/audit.model';

export interface DashboardMetrics {
  emailsSent: number;
  linksClicked: number;
  formsSubmitted: number;
  clickRate: number;
  submissionRate: number;
  conversionAfterClick: number;
}

export interface MetricsPersistence {
  countEvent(eventType: AuditEventType): Promise<number>;
}

export interface DashboardOperations {
  getMetrics(): Promise<DashboardMetrics>;
}

