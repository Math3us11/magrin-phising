import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export const CAMPAIGN_STATUSES = ['draft', 'active', 'stopped'] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export class Campaign extends Model<
  InferAttributes<Campaign>,
  InferCreationAttributes<Campaign>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare status: CreationOptional<CampaignStatus>;
  declare maxSends: number | null;
  declare startsAt: Date | null;
  declare endsAt: Date | null;
  declare createdAt: CreationOptional<Date>;
}

export function initializeCampaignModel(sequelize: Sequelize): typeof Campaign {
  Campaign.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...CAMPAIGN_STATUSES),
        allowNull: false,
        defaultValue: 'draft',
      },
      maxSends: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: 'max_sends',
      },
      startsAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'starts_at',
      },
      endsAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'ends_at',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      sequelize,
      tableName: 'campaigns',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    },
  );

  return Campaign;
}
