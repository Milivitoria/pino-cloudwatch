// ── NestJS module ─────────────────────────────────────────────────────────────
export { LoggerModule } from './logger.module';
export { PinoLoggerService } from './logger.service';
export {
  LoggerModuleOptions,
  LoggerModuleAsyncOptions,
  LoggerModuleOptionsFactory,
  LOGGER_MODULE_OPTIONS,
  LOGGER_TRANSPORTERS,
} from './logger.options';

// ── Transporter API ───────────────────────────────────────────────────────────
export { ILogTransporter } from './transporters/log-transporter.interface';
export { LogEntry, LogLevel } from './transporters/log-entry.interface';
export { BaseTransporter } from './transporters/base.transporter';

export { CloudWatchTransporter, CloudWatchTransporterOptions } from './transporters/cloudwatch';
export { DynamoDBTransporter, DynamoDBTransporterOptions } from './transporters/dynamodb';
export {
  ElasticsearchTransporter,
  ElasticsearchTransporterOptions,
  ElasticsearchAuth,
} from './transporters/elasticsearch';
export { MongoDBTransporter, MongoDBTransporterOptions } from './transporters/mongodb';
export {
  PostgreSQLTransporter,
  PostgreSQLTransporterOptions,
  PostgreSQLConnectionOptions,
} from './transporters/postgresql';

// ── Legacy stream API (deprecated) ───────────────────────────────────────────
export { pinoCloudWatch, PinoCloudWatchOptions } from './legacy';

