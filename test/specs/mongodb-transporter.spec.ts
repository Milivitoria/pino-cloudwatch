import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MongoDBTransporter } from '../../src/transporters/mongodb/mongodb.transporter';

function makeMockCollection() {
  return { insertOne: vi.fn().mockResolvedValue({ insertedId: 'abc123' }) };
}

describe('MongoDBTransporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when uri is missing', () => {
    expect(() => new MongoDBTransporter({ uri: '', dbName: 'db', collectionName: 'logs' })).toThrow(
      'MongoDBTransporterOptions.uri is required.',
    );
  });

  it('should throw when dbName is missing', () => {
    expect(
      () => new MongoDBTransporter({ uri: 'mongodb://localhost', dbName: '', collectionName: 'logs' }),
    ).toThrow('MongoDBTransporterOptions.dbName is required.');
  });

  it('should throw when collectionName is missing', () => {
    expect(
      () => new MongoDBTransporter({ uri: 'mongodb://localhost', dbName: 'db', collectionName: '' }),
    ).toThrow('MongoDBTransporterOptions.collectionName is required.');
  });

  it('should call insertOne when send() is called', async () => {
    const mockCollection = makeMockCollection();
    const transporter = new MongoDBTransporter(
      { uri: 'mongodb://localhost', dbName: 'mydb', collectionName: 'logs' },
      mockCollection,
    );

    await transporter.send({ level: 'info', message: 'mongo log', timestamp: Date.now() });

    expect(mockCollection.insertOne).toHaveBeenCalledOnce();
    const doc = mockCollection.insertOne.mock.calls[0][0];
    expect(doc.message).toBe('mongo log');
    expect(doc.level).toBe('info');
    expect(doc.timestamp).toBeInstanceOf(Date);
  });

  it('should store context and data', async () => {
    const mockCollection = makeMockCollection();
    const transporter = new MongoDBTransporter(
      { uri: 'mongodb://localhost', dbName: 'mydb', collectionName: 'logs' },
      mockCollection,
    );

    await transporter.send({
      level: 'error',
      message: 'oops',
      timestamp: Date.now(),
      context: 'Service',
      data: { code: 500 },
    });

    const doc = mockCollection.insertOne.mock.calls[0][0];
    expect(doc.context).toBe('Service');
    expect(doc.data).toEqual({ code: 500 });
  });

  it('should not close mongoClient when collection was injected', async () => {
    // When collection is injected, mongoClient is never set, so close() is a no-op
    const mockCollection = makeMockCollection();
    const transporter = new MongoDBTransporter(
      { uri: 'mongodb://localhost', dbName: 'mydb', collectionName: 'logs' },
      mockCollection,
    );

    await transporter.send({ level: 'debug', message: 'bye', timestamp: Date.now() });
    await expect(transporter.close()).resolves.toBeUndefined();
  });
});
