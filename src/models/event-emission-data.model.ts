import { DataTypes, Sequelize } from 'sequelize';

const defineEventEmissionData = (sequelize: Sequelize) => {
  return sequelize.define(
    'EventEmissionData',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
      },
      energy_kwh: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      travel_km: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      catering_meals: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      waste_kg: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      total_co2: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: 'event_emission_data',
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false
    }
  );
};

export default defineEventEmissionData;
