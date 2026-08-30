import type { Sequelize } from 'sequelize';

import { initializeAuditModel } from './audit.model';
import { initializeSubmissionModel } from './submission.model';

export function initializeModels(sequelize: Sequelize): void {
  initializeAuditModel(sequelize);
  initializeSubmissionModel(sequelize);
}

export { Audit } from './audit.model';
export { Submission } from './submission.model';

