import { BaseTransporter } from '../base.transporter';
import { LogEntry } from '../log-entry.interface';

export interface MongoDBTransporterOptions {
  uri: string;
  dbName: string;
  collectionName: string;
}

/**
 * Transporter that writes log entries to a MongoDB collection.
 *
 * The MongoDB driver is an optional peer dependency.
 * Install `mongodb` to use this transporter.
 *
 * @param options    Transporter configuration.
 * @param collection Optional pre-built MongoDB Collection (useful for testing).
 */
export class MongoDBTransporter extends BaseTransporter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mongoClient!: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private collection!: any;

  constructor(
    private readonly options: MongoDBTransporterOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly injectedCollection?: any,
  ) {
    super();
    if (!options.uri) {
      throw new Error('MongoDBTransporterOptions.uri is required.');
    }
    if (!options.dbName) {
      throw new Error('MongoDBTransporterOptions.dbName is required.');
    }
    if (!options.collectionName) {
      throw new Error('MongoDBTransporterOptions.collectionName is required.');
    }
  }

  protected async initialize(): Promise<void> {
    if (this.injectedCollection) {
      this.collection = this.injectedCollection;
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MongoClient } = require('mongodb');
    this.mongoClient = new MongoClient(this.options.uri);
    await this.mongoClient.connect();
    this.collection = this.mongoClient
      .db(this.options.dbName)
      .collection(this.options.collectionName);
  }

  async send(entry: LogEntry): Promise<void> {
    await this.ensureInitialized();
    await this.collection.insertOne({
      level: entry.level,
      message: entry.message,
      timestamp: new Date(entry.timestamp),
      context: entry.context ?? null,
      data: entry.data ?? null,
    });
  }

  async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}

