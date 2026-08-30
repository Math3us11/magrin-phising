import { describe, expect, it } from 'vitest';

import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import type { MetricsPersistence } from '../src/modules/dashboard/dashboard.types';
import type { AuditEventType } from '../src/database/models/audit.model';

function createPersistence(
  counts: Partial<Record<AuditEventType, number>>,
): MetricsPersistence {
  return {
    countEvent: async (eventType) => counts[eventType] ?? 0,
  };
}

describe('DashboardService', () => {
  it('calcula totais e taxas do funil', async () => {
    const service = new DashboardService(
      createPersistence({
        email_sent: 30,
        link_clicked: 18,
        form_submitted: 9,
      }),
    );

    await expect(service.getMetrics()).resolves.toEqual({
      emailsSent: 30,
      linksClicked: 18,
      formsSubmitted: 9,
      clickRate: 60,
      submissionRate: 30,
      conversionAfterClick: 50,
    });
  });

  it('trata banco vazio sem divisao por zero', async () => {
    const service = new DashboardService(createPersistence({}));

    await expect(service.getMetrics()).resolves.toEqual({
      emailsSent: 0,
      linksClicked: 0,
      formsSubmitted: 0,
      clickRate: 0,
      submissionRate: 0,
      conversionAfterClick: 0,
    });
  });
});

