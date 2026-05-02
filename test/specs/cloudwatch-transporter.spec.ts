import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudWatchTransporter } from '../../src/transporters/cloudwatch/cloudwatch.transporter';

vi.mock('@aws-sdk/client-cloudwatch-logs', () => {
  return {
    CloudWatchLogsClient: vi.fn(),
    CreateLogGroupCommand: vi.fn(),
    CreateLogStreamCommand: vi.fn(),
    PutLogEventsCommand: vi.fn(),
  };
});

function makeMockClient() {
  return {
    send: vi.fn().mockResolvedValue({}),
    destroy: vi.fn(),
  };
}

describe('CloudWatchTransporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when group is missing', () => {
    expect(() => new CloudWatchTransporter({} as any)).toThrow(
      'CloudWatchTransporterOptions.group is required.',
    );
  });

  it('should send a log entry to CloudWatch', async () => {
    const { PutLogEventsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
    const mockClient = makeMockClient();
    const transporter = new CloudWatchTransporter({ group: 'test-group', interval: 0 }, mockClient as any);

    await transporter.send({ level: 'info', message: 'hello', timestamp: Date.now() });
    await transporter.flush();

    expect(mockClient.send).toHaveBeenCalledWith(expect.any(PutLogEventsCommand as any));
  });

  it('should flush buffer on close', async () => {
    const { PutLogEventsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
    const mockClient = makeMockClient();
    const transporter = new CloudWatchTransporter({ group: 'test-group', interval: 0 }, mockClient as any);

    await transporter.send({ level: 'warn', message: 'bye', timestamp: Date.now() });
    await transporter.close();

    expect(mockClient.send).toHaveBeenCalledWith(expect.any(PutLogEventsCommand as any));
    expect(mockClient.destroy).toHaveBeenCalled();
  });

  it('should flush immediately when maxLength is reached', async () => {
    const { PutLogEventsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
    const mockClient = makeMockClient();
    const transporter = new CloudWatchTransporter(
      { group: 'test-group', maxLength: 2, interval: 0 },
      mockClient as any,
    );

    await transporter.send({ level: 'info', message: 'a', timestamp: Date.now() });
    await transporter.send({ level: 'info', message: 'b', timestamp: Date.now() });

    expect(mockClient.send).toHaveBeenCalledWith(expect.any(PutLogEventsCommand as any));
  });

  it('should not flush when buffer is empty', async () => {
    const mockClient = makeMockClient();
    const transporter = new CloudWatchTransporter({ group: 'test-group' }, mockClient as any);

    await transporter.flush();

    // Only CreateLogGroup + CreateLogStream from initialize are called, no PutLogEvents
    const putCalls = mockClient.send.mock.calls.filter(
      ([cmd]) => cmd.constructor?.name === 'PutLogEventsCommand',
    );
    expect(putCalls).toHaveLength(0);
  });
});
