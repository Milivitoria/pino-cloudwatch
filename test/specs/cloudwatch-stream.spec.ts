import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('cloudwatch-stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should error if no Log Group name specified', async () => {
    const { CloudWatchStream } = await import('../../src/lib/cloudwatch-stream');
    expect(() => new CloudWatchStream({} as any)).toThrow('options.group is required.');
  });

  it('should send the chunks to CloudWatch Logs', async () => {
    const { CloudWatchStream } = await import('../../src/lib/cloudwatch-stream');
    const stream = new CloudWatchStream({ group: 'test' });
    const inStream = createReadStream(resolve(__dirname, '../mocks/logs.txt'));

    await pipeline(inStream, split(), stream);
  });

  it('should emit a flushed event', async () => {
    const { CloudWatchStream } = await import('../../src/lib/cloudwatch-stream');
    const stream = new CloudWatchStream({ group: 'test' });
    const inStream = createReadStream(resolve(__dirname, '../mocks/log_single.txt'));

    const flushedPromise = new Promise<void>((resolve) => {
      stream.on('flushed', resolve);
    });

    pipeline(inStream, split(), stream).catch(() => {});
    await flushedPromise;
  });
});
