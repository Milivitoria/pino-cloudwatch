import { Inject, Injectable, LoggerService, Optional } from '@nestjs/common';
import pino from 'pino';
import { ILogTransporter } from './transporters/log-transporter.interface';
import { LogEntry, LogLevel } from './transporters/log-entry.interface';
import { LOGGER_MODULE_OPTIONS, LOGGER_TRANSPORTERS, LoggerModuleOptions } from './logger.options';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: pino.Logger;
  private readonly transporters: ILogTransporter[];
  private readonly errorHandler: (err: Error) => void;

  constructor(
    @Inject(LOGGER_MODULE_OPTIONS)
    @Optional()
    private readonly options: LoggerModuleOptions = { transporters: [] },
    @Inject(LOGGER_TRANSPORTERS)
    @Optional()
    transporters: ILogTransporter[] = [],
  ) {
    this.transporters = transporters;
    this.errorHandler = options.errorHandler ?? ((err) => console.error('[PinoLoggerService]', err));

    this.logger = pino({ level: 'trace', ...options.pinoOptions });
  }

  log(message: string, context?: string): void {
    this.logger.info({ context }, message);
    this.dispatch('info', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, message);
    this.dispatch('error', message, context, trace ? { trace } : undefined);
  }

  warn(message: string, context?: string): void {
    this.logger.warn({ context }, message);
    this.dispatch('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.logger.debug({ context }, message);
    this.dispatch('debug', message, context);
  }

  verbose(message: string, context?: string): void {
    this.logger.trace({ context }, message);
    this.dispatch('trace', message, context);
  }

  fatal(message: string, context?: string): void {
    this.logger.fatal({ context }, message);
    this.dispatch('fatal', message, context);
  }

  async flush(): Promise<void> {
    await Promise.allSettled(
      this.transporters.map((t) => t.flush?.()),
    );
  }

  async close(): Promise<void> {
    await Promise.allSettled(
      this.transporters.map((t) => t.close?.()),
    );
  }

  // ── private ──────────────────────────────────────────────────────────────────

  private dispatch(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, unknown>,
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      data,
    };

    Promise.allSettled(this.transporters.map((t) => t.send(entry))).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          this.errorHandler(
            result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          );
        }
      }
    });
  }
}
