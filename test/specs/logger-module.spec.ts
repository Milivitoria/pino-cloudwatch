import { describe, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { LoggerModule } from '../../src/logger.module';
import { PinoLoggerService } from '../../src/logger.service';
import { ILogTransporter } from '../../src/transporters/log-transporter.interface';
import { LogEntry } from '../../src/transporters/log-entry.interface';

function nopTransporter(): ILogTransporter {
  return {
    send: vi.fn(async (_e: LogEntry) => {}),
    flush: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
}

describe('LoggerModule', () => {
  it('forRoot() provides PinoLoggerService', async () => {
    const transporter = nopTransporter();
    const module = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ transporters: [transporter] })],
    }).compile();

    const svc = module.get(PinoLoggerService);
    expect(svc).toBeInstanceOf(PinoLoggerService);
  });

  it('forRootAsync() provides PinoLoggerService via useFactory', async () => {
    const transporter = nopTransporter();
    const module = await Test.createTestingModule({
      imports: [
        LoggerModule.forRootAsync({
          useFactory: () => ({ transporters: [transporter] }),
        }),
      ],
    }).compile();

    const svc = module.get(PinoLoggerService);
    expect(svc).toBeInstanceOf(PinoLoggerService);
  });

  it('forRoot() — service dispatches to transporter', async () => {
    const transporter = nopTransporter();
    const module = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ transporters: [transporter] })],
    }).compile();

    const svc = module.get(PinoLoggerService);
    svc.log('integration test', 'TestCtx');

    await vi.waitFor(() => expect(transporter.send).toHaveBeenCalled());
    const entry = (transporter.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as LogEntry;
    expect(entry.message).toBe('integration test');
    expect(entry.context).toBe('TestCtx');
  });

  it('onApplicationShutdown() calls close on transporters', async () => {
    const transporter = nopTransporter();
    const module = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ transporters: [transporter] })],
    }).compile();

    await module.close();
    expect(transporter.close).toHaveBeenCalledOnce();
  });
});
