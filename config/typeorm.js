import { DataSource } from 'typeorm';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default new DataSource({
  type: 'postgres',
  database: process.env.DB_NAME || 'dev_metric_server',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'dev_metric_server',
  password: process.env.DB_PASSWORD || '123456',
  ssl: process.env.DB_SSL === 'false' ? false : {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  },
  entities: [`${__dirname}/../src/database/entities/**/*.entity.ts`],
  migrations: [`${__dirname}/../src/database/migrations/**/*.ts`],
});
