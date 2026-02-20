import { Sequelize } from 'sequelize';
import { env } from './env';

const sslDialectOptions = env.dbSsl
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  : undefined;

export const sequelize = env.databaseUrl
  ? new Sequelize(env.databaseUrl, {
      dialect: env.dbDialect as 'postgres',
      logging: false,
      dialectOptions: sslDialectOptions
    })
  : new Sequelize(env.dbName, env.dbUser, env.dbPassword, {
      host: env.dbHost,
      port: env.dbPort,
      dialect: env.dbDialect as 'postgres',
      logging: false,
      dialectOptions: sslDialectOptions
    });
