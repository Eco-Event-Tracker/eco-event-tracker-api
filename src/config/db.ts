import { Sequelize } from 'sequelize';

export const createSequelize = (databaseUrl: string) => {
  return new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
};
