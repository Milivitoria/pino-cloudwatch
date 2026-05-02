import { DynamicModule, Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import {
  LOGGER_MODULE_OPTIONS,
  LOGGER_TRANSPORTERS,
  LoggerModuleAsyncOptions,
  LoggerModuleOptions,
  LoggerModuleOptionsFactory,
} from './logger.options';
import { PinoLoggerService } from './logger.service';
import { ILogTransporter } from './transporters';

@Global()
@Module({})
export class LoggerModule implements OnApplicationShutdown {
  constructor(
    @Inject(LOGGER_TRANSPORTERS) private readonly transporters: ILogTransporter[],
  ) {}

  // ── synchronous registration ─────────────────────────────────────────────────

  static forRoot(options: LoggerModuleOptions): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        { provide: LOGGER_MODULE_OPTIONS, useValue: options },
        { provide: LOGGER_TRANSPORTERS, useValue: options.transporters },
        PinoLoggerService,
      ],
      exports: [PinoLoggerService],
    };
  }

  // ── async / factory registration ─────────────────────────────────────────────

  static forRootAsync(asyncOptions: LoggerModuleAsyncOptions): DynamicModule {
    const optionsProvider = LoggerModule.createAsyncOptionsProvider(asyncOptions);

    return {
      module: LoggerModule,
      imports: asyncOptions.imports ?? [],
      providers: [
        optionsProvider,
        {
          provide: LOGGER_TRANSPORTERS,
          useFactory: (opts: LoggerModuleOptions) => opts.transporters,
          inject: [LOGGER_MODULE_OPTIONS],
        },
        PinoLoggerService,
      ],
      exports: [PinoLoggerService],
    };
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────────

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(this.transporters.map((t) => t.close?.()));
  }

  // ── helpers ───────────────────────────────────────────────────────────────────

  private static createAsyncOptionsProvider(asyncOptions: LoggerModuleAsyncOptions) {
    if (asyncOptions.useFactory) {
      return {
        provide: LOGGER_MODULE_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject ?? [],
      };
    }

    if (asyncOptions.useClass) {
      return {
        provide: LOGGER_MODULE_OPTIONS,
        useFactory: async (factory: LoggerModuleOptionsFactory) =>
          factory.createLoggerOptions(),
        inject: [asyncOptions.useClass],
      };
    }

    throw new Error('LoggerModule.forRootAsync requires useFactory or useClass.');
  }
}
