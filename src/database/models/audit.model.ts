import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export const AUDIT_EVENT_TYPES = [
  'email_sent',
  'link_clicked',
  'form_submitted',
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export class Audit extends Model<
  InferAttributes<Audit>,
  InferCreationAttributes<Audit>
> {
  declare id: CreationOptional<number>;
  declare participantCode: string;
  declare eventType: AuditEventType;
  declare createdAt: CreationOptional<Date>;
}

export function initializeAuditModel(sequelize: Sequelize): typeof Audit {
  Audit.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      participantCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'participant_code',
      },
      eventType: {
        type: DataTypes.ENUM(...AUDIT_EVENT_TYPES),
        allowNull: false,
        field: 'event_type',
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
      tableName: 'audit',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          name: 'uq_audit_participant_event',
          unique: true,
          fields: ['participant_code', 'event_type'],
        },
      ],
    },
  );

  return Audit;
}

