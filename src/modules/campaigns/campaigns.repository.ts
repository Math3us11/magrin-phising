import { Campaign } from '../../database/models';
import type { CampaignStatus } from '../../database/models/campaign.model';
import type {
  CampaignPersistence,
  CampaignRecord,
  CreateCampaignData,
} from './campaigns.types';

function toRecord(campaign: Campaign): CampaignRecord {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    maxSends: campaign.maxSends ?? null,
    startsAt: campaign.startsAt ? campaign.startsAt.toISOString() : null,
    endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
    createdAt: campaign.createdAt.toISOString(),
  };
}

export class SequelizeCampaignPersistence implements CampaignPersistence {
  async create(data: CreateCampaignData): Promise<CampaignRecord> {
    const campaign = await Campaign.create({
      name: data.name,
      status: 'draft',
      maxSends: data.maxSends,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    });

    return toRecord(campaign);
  }

  async findById(id: number): Promise<CampaignRecord | null> {
    const campaign = await Campaign.findByPk(id);
    return campaign ? toRecord(campaign) : null;
  }

  async list(): Promise<CampaignRecord[]> {
    const campaigns = await Campaign.findAll({
      order: [['created_at', 'DESC']],
    });

    return campaigns.map(toRecord);
  }

  async updateStatus(
    id: number,
    status: CampaignStatus,
  ): Promise<CampaignRecord | null> {
    const campaign = await Campaign.findByPk(id);

    if (!campaign) {
      return null;
    }

    campaign.status = status;
    await campaign.save();

    return toRecord(campaign);
  }
}
