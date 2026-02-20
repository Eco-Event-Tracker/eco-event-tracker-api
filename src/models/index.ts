import { Sequelize } from 'sequelize';
import defineUser from './user.model';
import defineEvent from './event.model';
import defineEventEmissionData from './event-emission-data.model';
import defineEmissionFactor from './emission-factor.model';

export const initModels = (sequelize: Sequelize) => {
  const User = defineUser(sequelize);
  const Event = defineEvent(sequelize);
  const EventEmissionData = defineEventEmissionData(sequelize);
  const EmissionFactor = defineEmissionFactor(sequelize);

  User.hasMany(Event, { foreignKey: 'created_by', as: 'events' });
  Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  Event.hasOne(EventEmissionData, { foreignKey: 'event_id', as: 'emissionData' });
  EventEmissionData.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

  return {
    User,
    Event,
    EventEmissionData,
    EmissionFactor
  };
};
