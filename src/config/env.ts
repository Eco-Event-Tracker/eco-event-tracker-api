import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  dbDialect: process.env.DB_DIALECT || 'postgres',
  databaseUrl: process.env.DATABASE_URL || '',
  dbSsl: (process.env.DB_SSL || 'false') === 'true',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT) || 5432,
  dbName: process.env.DB_NAME || 'eco_event_tracker',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'postgres'
};
