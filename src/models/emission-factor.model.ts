import { DataTypes, Sequelize } from 'sequelize';

const defineEmissionFactor = (sequelize: Sequelize) => {
  return sequelize.define(
    'EmissionFactor',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      category: {
        type: DataTypes.ENUM('energy', 'travel', 'catering', 'waste'),
        allowNull: false,
        unique: true
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false
      },
      value: {
        type: DataTypes.FLOAT,
        allowNull: false
      }
    },
    {
      tableName: 'emission_factors',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false
    }
  );
};

export default defineEmissionFactor;
