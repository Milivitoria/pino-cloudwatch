import { describe, it, expect, vi } from 'vitest';
import { createReadStream } from 'fs';
import { resolve } from 'path';
import { pipeline } from 'stream/promises';
import split from 'split2';

vi.mock('@aws-sdk/client-cloudwatch-logs', () => {
  const send = vi.fn().mockResolvedValue({});
  class CloudWatchLogsClient {
    send = send;
  }
  return {
    CloudWatchLogsClient,
    CreateLogGroupCommand: vi.fn(),
    CreateLogStreamCommand: vi.fn(),
    PutLogEventsCommand: vi.fn(),
    DescribeLogStreamsCommand: vi.fn(),
  };
});

describe('pino-cloudwatch (legacy)', () => {
  it('should send logs to CloudWatch Logs', async () => {
    const { pinoCloudWatch } = await import('../../src/index');
    const inStream = createReadStream(resolve(__dirname, '../mocks/logs.txt'));
    await pipeline(inStream, split(), pinoCloudWatch({ group: 'test' }));
  });

  it('should not send logs to CloudWatch Logs for empty log', async () => {
    const { pinoCloudWatch } = await import('../../src/index');
    const inStream = createReadStream(resolve(__dirname, '../mocks/log_empty.txt'));
    await pipeline(inStream, split(), pinoCloudWatch({ group: 'test' }));
  });

  it('should emit a flushed event', async () => {
    const { pinoCloudWatch } = await import('../../src/index');
    const inStream = createReadStream(resolve(__dirname, '../mocks/log_single.txt'));
    const pinoCloudwatchStream = pinoCloudWatch({ group: 'test' });

    const flushedPromise = new Promise<void>((resolve) => {
      pinoCloudwatchStream.on('flushed', resolve);
    });

    pipeline(inStream, split(), pinoCloudwatchStream).catch(() => {});
    await flushedPromise;
  });
});
