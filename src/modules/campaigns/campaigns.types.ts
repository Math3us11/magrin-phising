import type { CampaignStatus } from '../../database/models/campaign.model';

export interface CampaignRecord {
  id: number;
  name: string;
  status: CampaignStatus;
  maxSends: number | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface CreateCampaignData {
  name: string;
  maxSends: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface CampaignPersistence {
  create(data: CreateCampaignData): Promise<CampaignRecord>;
  findById(id: number): Promise<CampaignRecord | null>;
  list(): Promise<CampaignRecord[]>;
  updateStatus(
    id: number,
    status: CampaignStatus,
  ): Promise<CampaignRecord | null>;
}

export interface CampaignOperations {
  create(input: unknown): Promise<CampaignRecord>;
  start(id: number): Promise<CampaignRecord>;
  stop(id: number): Promise<CampaignRecord>;
  list(): Promise<CampaignRecord[]>;
}
