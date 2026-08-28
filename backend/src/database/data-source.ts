import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions, type TypeOrmEnv } from './typeorm-options';

// CLI runs outside Nest; load .env from the backend package root.
config();

export default new DataSource(buildDataSourceOptions(process.env as TypeOrmEnv));
