import { SequelizeMetricsPersistence } from './dashboard.repository';
import type {
  DashboardMetrics,
  DashboardOperations,
  MetricsPersistence,
} from './dashboard.types';

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

export class DashboardService implements DashboardOperations {
  constructor(private readonly persistence: MetricsPersistence) {}

  async getMetrics(): Promise<DashboardMetrics> {
    const [emailsSent, linksClicked, formsSubmitted] = await Promise.all([
      this.persistence.countEvent('email_sent'),
      this.persistence.countEvent('link_clicked'),
      this.persistence.countEvent('form_submitted'),
    ]);

    return {
      emailsSent,
      linksClicked,
      formsSubmitted,
      clickRate: percentage(linksClicked, emailsSent),
      submissionRate: percentage(formsSubmitted, emailsSent),
      conversionAfterClick: percentage(formsSubmitted, linksClicked),
    };
  }
}

export const dashboardService = new DashboardService(
  new SequelizeMetricsPersistence(),
);

