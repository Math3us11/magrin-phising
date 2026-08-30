import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class Submission extends Model<
  InferAttributes<Submission>,
  InferCreationAttributes<Submission>
> {
  declare id: CreationOptional<number>;
  declare participantCode: string;
  declare cpfMasked: string;
  declare passwordMasked: string;
  declare createdAt: CreationOptional<Date>;
}

export function initializeSubmissionModel(
  sequelize: Sequelize,
): typeof Submission {
  Submission.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      participantCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: 'uq_submission_participant',
        field: 'participant_code',
      },
      cpfMasked: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'cpf_masked',
      },
      passwordMasked: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'password_masked',
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
      tableName: 'submissions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    },
  );

  return Submission;
}

