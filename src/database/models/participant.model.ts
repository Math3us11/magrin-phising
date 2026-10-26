import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Participante inscrito em uma campanha. O codigo e opaco e globalmente unico
 * (cada codigo pertence a uma unica campanha), e o acesso ocorre apenas pelo
 * token, do qual guardamos somente o hash.
 */
export class Participant extends Model<
  InferAttributes<Participant>,
  InferCreationAttributes<Participant>
> {
  declare id: CreationOptional<number>;
  declare campaignId: number;
  declare participantCode: string;
  declare tokenHash: string;
  declare tokenExpiresAt: Date;
  declare createdAt: CreationOptional<Date>;
}

export function initializeParticipantModel(
  sequelize: Sequelize,
): typeof Participant {
  Participant.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      campaignId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'campaign_id',
      },
      participantCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: 'uq_participant_code',
        field: 'participant_code',
      },
      tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: 'uq_participant_token_hash',
        field: 'token_hash',
      },
      tokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'token_expires_at',
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
      tableName: 'participants',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    },
  );

  return Participant;
}
