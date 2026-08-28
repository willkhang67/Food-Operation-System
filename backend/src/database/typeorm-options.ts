import { join } from 'path';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

/** Env-backed config for the TypeORM CLI (no Nest container). */
export interface TypeOrmEnv {
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  NODE_ENV?: string;
  TYPEORM_SYNCHRONIZE?: string;
  TYPEORM_MIGRATIONS_RUN?: string;
}

function envBool(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function readEnv(
  source: ConfigService | TypeOrmEnv,
  key: string,
  fallback?: string,
): string | undefined {
  if ('get' in source && typeof source.get === 'function') {
    return source.get<string>(key) ?? fallback;
  }
  return (source as TypeOrmEnv)[key as keyof TypeOrmEnv] ?? fallback;
}

function coreOptions(source: ConfigService | TypeOrmEnv) {
  const nodeEnv = readEnv(source, 'NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const synchronize = envBool(readEnv(source, 'TYPEORM_SYNCHRONIZE'));
  const migrationsRun = envBool(readEnv(source, 'TYPEORM_MIGRATIONS_RUN'));
  const migrationsDir = join(__dirname, 'migrations');

  return {
    type: 'postgres' as const,
    host: readEnv(source, 'DB_HOST', 'localhost'),
    port: parseInt(readEnv(source, 'DB_PORT', '5432') ?? '5432', 10),
    username: readEnv(source, 'DB_USERNAME', 'foodapp'),
    password: readEnv(source, 'DB_PASSWORD', 'foodapp'),
    database: readEnv(source, 'DB_NAME', 'food_db'),
    // Fail closed in production even if TYPEORM_SYNCHRONIZE=true is set by mistake.
    synchronize: isProduction ? false : synchronize,
    migrations: [join(migrationsDir, '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: isProduction && migrationsRun,
  };
}

/**
 * Nest TypeORM module — autoLoadEntities picks up @Entity classes from forFeature modules.
 */
export function buildNestTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    ...coreOptions(config),
    autoLoadEntities: true,
  };
}

/**
 * TypeORM CLI DataSource — compiled entity globs (migration:run uses dist/).
 */
export function buildDataSourceOptions(env: TypeOrmEnv): DataSourceOptions {
  return {
    ...coreOptions(env),
    entities: [join(__dirname, '..', '**', '*.entity.js')],
  };
}
