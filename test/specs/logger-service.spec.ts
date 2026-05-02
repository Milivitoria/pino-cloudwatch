import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinoLoggerService } from '../../src/logger.service';
import { ILogTransporter } from '../../src/transporters/log-transporter.interface';
import { LogEntry } from '../../src/transporters/log-entry.interface';

function makeTransporter(): ILogTransporter & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    send: vi.fn(async (entry: LogEntry) => {
      entries.push(entry);
    }),
    flush: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
}

describe('PinoLoggerService', () => {
  let transporter: ReturnType<typeof makeTransporter>;
  let service: PinoLoggerService;

  beforeEach(() => {
    transporter = makeTransporter();
    service = new PinoLoggerService(
      { transporters: [transporter] },
      [transporter],
    );
  });

  it('log() dispatches an info entry', async () => {
    service.log('hello world', 'TestContext');
    await vi.waitFor(() => expect(transporter.send).toHaveBeenCalled());
    const entry = transporter.entries[0];
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('hello world');
    expect(entry.context).toBe('TestContext');
  });

  it('error() dispatches an error entry with trace', async () => {
    service.error('boom', 'stack trace', 'ErrCtx');
    await vi.waitFor(() => expect(transporter.send).toHaveBeenCalled());
    const entry = transporter.entries[0];
    expect(entry.level).toBe('error');
    expect(entry.data).toEqual({ trace: 'stack trace' });
  });

  it('warn() dispatches a warn entry', async () => {
    service.warn('careful', 'WarnCtx');
    await vi.waitFor(() => expect(transporter.send).toHaveBeenCalled());
    expect(transporter.entries[0].level).toBe('warn');
  });

  it('debug() dispatches a debug entry', async () => {
    service.debug('debug msg', 'DbgCtx');
    await vi.waitFor(() => expect(transporter.send).toHaveBeenCalled());
    expect(transporter.entries[0].level).toBe('debug');
  });

  it('verbose() dispatches a trace entry', async () => {
    service.verbose('trace msg', 'VCtx');
    await vi.waitFor(() => expect(transporter.send).toHaveBeenCalled());
    expect(transporter.entries[0].level).toBe('trace');
  });

  it('fatal() dispatches a fatal entry', async () => {
    service.fatal('fatal msg');
    await vi.waitFor(() => expect(transporter.send).toHaveBeenCalled());
    expect(transporter.entries[0].level).toBe('fatal');
  });

  it('flush() calls flush on all transporters', async () => {
    await service.flush();
    expect(transporter.flush).toHaveBeenCalledOnce();
  });

  it('close() calls close on all transporters', async () => {
    await service.close();
    expect(transporter.close).toHaveBeenCalledOnce();
  });

  it('errorHandler is called when a transporter throws', async () => {
    const errorHandler = vi.fn();
    (transporter.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('transport fail'));

    const svc = new PinoLoggerService({ transporters: [transporter], errorHandler }, [transporter]);
    svc.log('trigger error');

    await vi.waitFor(() => expect(errorHandler).toHaveBeenCalled());
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ message: 'transport fail' }));
  });
});
