import type { Sequelize } from 'sequelize';

import { initializeAuditModel } from './audit.model';
import { initializeCampaignModel } from './campaign.model';
import { initializeParticipantModel } from './participant.model';
import { initializeSubmissionModel } from './submission.model';

export function initializeModels(sequelize: Sequelize): void {
  initializeCampaignModel(sequelize);
  initializeParticipantModel(sequelize);
  initializeAuditModel(sequelize);
  initializeSubmissionModel(sequelize);
}

export { Audit } from './audit.model';
export { Campaign } from './campaign.model';
export { Participant } from './participant.model';
export { Submission } from './submission.model';
