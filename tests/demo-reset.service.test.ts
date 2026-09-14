import { describe, expect, it, vi } from 'vitest';

import {
  DemoResetConfirmationError,
  DemoResetService,
} from '../src/modules/admin/demo-reset.service';
import type { DemoResetPersistence } from '../src/modules/admin/demo-reset.types';

function createPersistence(): DemoResetPersistence {
  return {
    getSummary: vi.fn().mockResolvedValue({
      auditEvents: 7,
      submissions: 2,
    }),
    clearData: vi.fn().mockResolvedValue({
      auditEventsDeleted: 7,
      submissionsDeleted: 2,
    }),
  };
}

describe('DemoResetService', () => {
  it('limpa somente depois da confirmacao exata', async () => {
    const persistence = createPersistence();
    const service = new DemoResetService(persistence);

    await expect(
      service.reset({ confirmation: 'RESETAR DEMONSTRACAO' }),
    ).resolves.toEqual({
      auditEventsDeleted: 7,
      submissionsDeleted: 2,
    });
    expect(persistence.clearData).toHaveBeenCalledOnce();
  });

  it('recusa confirmacao diferente sem remover dados', async () => {
    const persistence = createPersistence();
    const service = new DemoResetService(persistence);

    await expect(
      service.reset({ confirmation: 'sim' }),
    ).rejects.toBeInstanceOf(DemoResetConfirmationError);
    expect(persistence.clearData).not.toHaveBeenCalled();
  });
});
