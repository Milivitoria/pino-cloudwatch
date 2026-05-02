import { ModuleMetadata, Type } from '@nestjs/common';
import pino from 'pino';
import { ILogTransporter } from './transporters';

export const LOGGER_MODULE_OPTIONS = 'LOGGER_MODULE_OPTIONS';
export const LOGGER_TRANSPORTERS = 'LOGGER_TRANSPORTERS';

export interface LoggerModuleOptions {
  /** One or more transporters that receive formatted log entries */
  transporters: ILogTransporter[];
  /** Called when a transporter throws; defaults to `console.error` */
  errorHandler?: (err: Error) => void;
  /** Pino logger options forwarded to the internal pino instance */
  pinoOptions?: pino.LoggerOptions;
}

export interface LoggerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: unknown[]) => Promise<LoggerModuleOptions> | LoggerModuleOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
  useClass?: Type<LoggerModuleOptionsFactory>;
}

export interface LoggerModuleOptionsFactory {
  createLoggerOptions(): Promise<LoggerModuleOptions> | LoggerModuleOptions;
}
