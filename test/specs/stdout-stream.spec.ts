import { describe, it, expect, vi } from 'vitest';
import { createReadStream } from 'fs';
import { resolve } from 'path';
import { pipeline } from 'stream/promises';
import split from 'split2';
import { StdoutStream } from '../../src/lib/stdout-stream';

describe('stdout-stream', () => {
  it('should copy input to stdout', async () => {
    const logSpy = vi.fn();
    const inStream = createReadStream(resolve(__dirname, '../mocks/logs.txt'));
    const stream = new StdoutStream({ stdout: true, console: { log: logSpy } });

    await pipeline(inStream, split(), stream);
    expect(logSpy).toHaveBeenCalled();
  });

  it('should not copy input to stdout', async () => {
    const logSpy = vi.fn();
    const inStream = createReadStream(resolve(__dirname, '../mocks/logs.txt'));
    const stream = new StdoutStream({ stdout: false, console: { log: logSpy } });

    await pipeline(inStream, split(), stream);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
