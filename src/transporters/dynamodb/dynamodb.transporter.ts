import { randomUUID } from 'crypto';
import { BaseTransporter } from '../base.transporter';
import { LogEntry } from '../log-entry.interface';

export interface DynamoDBTransporterOptions {
  tableName: string;
  region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
}

/**
 * Transporter that writes log entries to an AWS DynamoDB table.
 *
 * Required table schema:
 *   - Partition key: `id` (String)
 *
 * The AWS SDK for DynamoDB is an optional peer dependency.
 * Install `@aws-sdk/lib-dynamodb` to use this transporter.
 *
 * @param options  Transporter configuration.
 * @param client   Optional pre-built DynamoDB document client (useful for testing).
 */
export class DynamoDBTransporter extends BaseTransporter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private docClient!: any;

  constructor(
    private readonly options: DynamoDBTransporterOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly injectedClient?: any,
  ) {
    super();
    if (!options.tableName) {
      throw new Error('DynamoDBTransporterOptions.tableName is required.');
    }
  }

  protected async initialize(): Promise<void> {
    if (this.injectedClient) {
      this.docClient = this.injectedClient;
      return;
    }

    // Dynamically import to keep @aws-sdk/lib-dynamodb optional
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

    const clientConfig: Record<string, unknown> = {};
    if (this.options.region) {
      clientConfig.region = this.options.region;
    }
    if (this.options.aws_access_key_id && this.options.aws_secret_access_key) {
      clientConfig.credentials = {
        accessKeyId: this.options.aws_access_key_id,
        secretAccessKey: this.options.aws_secret_access_key,
      };
    }

    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async send(entry: LogEntry): Promise<void> {
    await this.ensureInitialized();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PutCommand } = require('@aws-sdk/lib-dynamodb');

    await this.docClient.send(
      new PutCommand({
        TableName: this.options.tableName,
        Item: {
          id: randomUUID(),
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp,
          context: entry.context ?? null,
          data: entry.data ? JSON.stringify(entry.data) : null,
        },
      }),
    );
  }

  async close(): Promise<void> {
    if (this.docClient && typeof this.docClient.destroy === 'function') {
      this.docClient.destroy();
    }
  }
}
