import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElasticsearchTransporter } from '../../src/transporters/elasticsearch/elasticsearch.transporter';

function makeMockClient() {
  return {
    bulk: vi.fn().mockResolvedValue({ errors: false, items: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ElasticsearchTransporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when node is missing', () => {
    expect(() => new ElasticsearchTransporter({ node: '', index: 'logs' })).toThrow(
      'ElasticsearchTransporterOptions.node is required.',
    );
  });

  it('should throw when index is missing', () => {
    expect(
      () => new ElasticsearchTransporter({ node: 'http://localhost:9200', index: '' }),
    ).toThrow('ElasticsearchTransporterOptions.index is required.');
  });

  it('should call bulk when flush is triggered', async () => {
    const mockClient = makeMockClient();
    const transporter = new ElasticsearchTransporter(
      { node: 'http://localhost:9200', index: 'logs', interval: 0, maxLength: 100 },
      mockClient,
    );

    await transporter.send({ level: 'info', message: 'hello es', timestamp: Date.now() });
    await transporter.flush();

    expect(mockClient.bulk).toHaveBeenCalledOnce();
    const { operations } = mockClient.bulk.mock.calls[0][0];
    expect(operations).toHaveLength(2); // one index op + one document
    expect(operations[0]).toEqual({ index: { _index: 'logs' } });
    expect(operations[1].message).toBe('hello es');
    expect(operations[1].level).toBe('info');
  });

  it('should flush automatically when maxLength is reached', async () => {
    const mockClient = makeMockClient();
    const transporter = new ElasticsearchTransporter(
      { node: 'http://localhost:9200', index: 'logs', interval: 0, maxLength: 2 },
      mockClient,
    );

    await transporter.send({ level: 'info', message: 'a', timestamp: Date.now() });
    await transporter.send({ level: 'info', message: 'b', timestamp: Date.now() });

    expect(mockClient.bulk).toHaveBeenCalledOnce();
  });

  it('should close the client on close()', async () => {
    const mockClient = makeMockClient();
    const transporter = new ElasticsearchTransporter(
      { node: 'http://localhost:9200', index: 'logs', interval: 0 },
      mockClient,
    );

    await transporter.send({ level: 'warn', message: 'bye', timestamp: Date.now() });
    await transporter.close();

    expect(mockClient.close).toHaveBeenCalledOnce();
  });
});
