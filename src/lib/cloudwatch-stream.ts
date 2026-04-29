import * as os from 'os';
import { Writable, WritableOptions } from 'stream';
import {
  CloudWatchLogsClient,
  CloudWatchLogsClientConfig,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

export interface CloudWatchStreamOptions extends WritableOptions {
  group: string;
  prefix?: string;
  stream?: string;
  aws_region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
}

export class CloudWatchStream extends Writable {
  private readonly logGroupName: string;
  private readonly logStreamName: string;
  private readonly cloudWatchLogs: CloudWatchLogsClient;
  private initialized: boolean;

  constructor(options: CloudWatchStreamOptions) {
    if (!options.group) {
      throw new Error('options.group is required.');
    }

    const writableOptions: WritableOptions = {
      ...options,
      objectMode: true,
    };

    super(writableOptions);

    this.logGroupName = options.group;
    this.logStreamName =
      options.stream ??
      (options.prefix ? options.prefix + '-' : '') +
        os.hostname() +
        '-' +
        process.pid +
        '-' +
        Date.now();
    this.initialized = false;

    const clientConfig: CloudWatchLogsClientConfig = {};
    if (options.aws_region || options.aws_access_key_id || options.aws_secret_access_key) {
      clientConfig.region = options.aws_region;
      if (options.aws_access_key_id && options.aws_secret_access_key) {
        clientConfig.credentials = {
          accessKeyId: options.aws_access_key_id,
          secretAccessKey: options.aws_secret_access_key,
        };
      }
    }

    this.cloudWatchLogs = new CloudWatchLogsClient(clientConfig);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.cloudWatchLogs.send(
        new CreateLogGroupCommand({ logGroupName: this.logGroupName })
      );
    } catch (err: unknown) {
      if (!isResourceAlreadyExists(err)) throw err;
    }

    try {
      await this.cloudWatchLogs.send(
        new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        })
      );
    } catch (err: unknown) {
      if (!isResourceAlreadyExists(err)) throw err;
    }

    this.initialized = true;
  }

  async _write(
    chunks: unknown,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): Promise<void> {
    const chunkArray = Array.isArray(chunks) ? chunks : [chunks];

    const logEvents = chunkArray.map((c) => ({
      timestamp: Date.now(),
      message: String(c),
    }));

    try {
      await this.ensureInitialized();

      await this.cloudWatchLogs.send(
        new PutLogEventsCommand({
          logEvents,
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        })
      );

      this.emit('flushed');
      callback();
    } catch (err: unknown) {
      callback(err instanceof Error ? err : new Error(String(err)));
    }
  }
}

function isResourceAlreadyExists(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'ResourceAlreadyExistsException'
  );
}
