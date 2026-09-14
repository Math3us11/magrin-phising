import { z } from 'zod';

import { SequelizeDemoResetPersistence } from './demo-reset.repository';
import type {
  DemoDataSummary,
  DemoResetOperations,
  DemoResetPersistence,
  DemoResetResult,
} from './demo-reset.types';

const resetSchema = z
  .object({ confirmation: z.literal('RESETAR DEMONSTRACAO') })
  .strict();

export class DemoResetConfirmationError extends Error {
  constructor() {
    super('Confirmacao de limpeza invalida.');
    this.name = 'DemoResetConfirmationError';
  }
}

export class DemoResetService implements DemoResetOperations {
  constructor(private readonly persistence: DemoResetPersistence) {}

  async getSummary(): Promise<DemoDataSummary> {
    return this.persistence.getSummary();
  }

  async reset(input: unknown): Promise<DemoResetResult> {
    if (!resetSchema.safeParse(input).success) {
      throw new DemoResetConfirmationError();
    }

    return this.persistence.clearData();
  }
}

export const demoResetService = new DemoResetService(
  new SequelizeDemoResetPersistence(),
);
