import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBTransporter } from '../../src/transporters/dynamodb/dynamodb.transporter';

function makeMockDocClient() {
  return { send: vi.fn().mockResolvedValue({}), destroy: vi.fn() };
}

describe('DynamoDBTransporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when tableName is missing', () => {
    expect(() => new DynamoDBTransporter({} as any)).toThrow(
      'DynamoDBTransporterOptions.tableName is required.',
    );
  });

  it('should call docClient.send when send() is called', async () => {
    const mockDocClient = makeMockDocClient();
    const transporter = new DynamoDBTransporter({ tableName: 'logs' }, mockDocClient);

    await transporter.send({ level: 'info', message: 'hello', timestamp: Date.now() });

    expect(mockDocClient.send).toHaveBeenCalledOnce();
    const [cmd] = mockDocClient.send.mock.calls[0];
    expect(cmd.input.TableName).toBe('logs');
    expect(cmd.input.Item.level).toBe('info');
    expect(cmd.input.Item.message).toBe('hello');
  });

  it('should include context and data when provided', async () => {
    const mockDocClient = makeMockDocClient();
    const transporter = new DynamoDBTransporter({ tableName: 'logs' }, mockDocClient);

    await transporter.send({
      level: 'error',
      message: 'oops',
      timestamp: Date.now(),
      context: 'MyService',
      data: { code: 500 },
    });

    const [cmd] = mockDocClient.send.mock.calls[0];
    expect(cmd.input.Item.context).toBe('MyService');
    expect(cmd.input.Item.data).toBe(JSON.stringify({ code: 500 }));
  });

  it('should call destroy on close()', async () => {
    const mockDocClient = makeMockDocClient();
    const transporter = new DynamoDBTransporter({ tableName: 'logs' }, mockDocClient);

    await transporter.send({ level: 'debug', message: 'bye', timestamp: Date.now() });
    await transporter.close();

    expect(mockDocClient.destroy).toHaveBeenCalledOnce();
  });
});
