import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgreSQLTransporter } from '../../src/transporters/postgresql/postgresql.transporter';

function makeMockPool() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn().mockResolvedValue(undefined),
  };
}

describe('PostgreSQLTransporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when neither connectionString nor connection is provided', () => {
    expect(() => new PostgreSQLTransporter({})).toThrow(
      'PostgreSQLTransporterOptions requires either connectionString or connection fields.',
    );
  });

  it('should create the logs table on first use', async () => {
    const mockPool = makeMockPool();
    const transporter = new PostgreSQLTransporter(
      { connectionString: 'postgres://localhost/test' },
      mockPool,
    );

    await transporter.send({ level: 'info', message: 'hello pg', timestamp: Date.now() });

    // First call is CREATE TABLE, second call is INSERT
    expect(mockPool.query).toHaveBeenCalledTimes(2);
    const createCall = mockPool.query.mock.calls[0][0] as string;
    expect(createCall).toContain('CREATE TABLE IF NOT EXISTS');
    expect(createCall).toContain('"logs"');
  });

  it('should INSERT a log entry', async () => {
    const mockPool = makeMockPool();
    const transporter = new PostgreSQLTransporter(
      { connectionString: 'postgres://localhost/test' },
      mockPool,
    );

    await transporter.send({
      level: 'error',
      message: 'pg error',
      timestamp: Date.now(),
      context: 'MyService',
    });

    const insertCall = mockPool.query.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO');
    expect(insertCall[1][0]).toBe('error');
    expect(insertCall[1][1]).toBe('pg error');
    expect(insertCall[1][3]).toBe('MyService');
  });

  it('should use a custom table name', async () => {
    const mockPool = makeMockPool();
    const transporter = new PostgreSQLTransporter(
      { connectionString: 'postgres://localhost/test', tableName: 'app_logs' },
      mockPool,
    );

    await transporter.send({ level: 'warn', message: 'custom table', timestamp: Date.now() });

    const createCall = mockPool.query.mock.calls[0][0] as string;
    expect(createCall).toContain('"app_logs"');
  });

  it('should end the pool on close()', async () => {
    const mockPool = makeMockPool();
    const transporter = new PostgreSQLTransporter(
      { connectionString: 'postgres://localhost/test' },
      mockPool,
    );

    await transporter.send({ level: 'info', message: 'bye', timestamp: Date.now() });
    await transporter.close();

    expect(mockPool.end).toHaveBeenCalledOnce();
  });
});
