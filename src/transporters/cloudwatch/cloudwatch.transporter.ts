import * as os from 'os';
import {
  CloudWatchLogsClient,
  CloudWatchLogsClientConfig,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { BaseTransporter } from '../base.transporter';
import { LogEntry } from '../log-entry.interface';

export interface CloudWatchTransporterOptions {
  group: string;
  prefix?: string;
  stream?: string;
  aws_region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  /** Maximum number of buffered log events before a forced flush (default: 10 000) */
  maxLength?: number;
  /** Maximum total byte size of buffered events before a forced flush (default: 256 KB) */
  maxSize?: number;
  /** Interval in ms for automatic flushing (default: 1 000 ms, 0 to disable) */
  interval?: number;
}

const DEFAULT_MAX_LENGTH = 10_000;
// Each event has a 26-byte overhead in CloudWatch pricing
const EVENT_OVERHEAD = 26;
const DEFAULT_MAX_SIZE = 262_144; // 256 KB
const DEFAULT_INTERVAL_MS = 1_000;

export class CloudWatchTransporter extends BaseTransporter {
  private readonly logGroupName: string;
  private readonly logStreamName: string;
  private readonly client: CloudWatchLogsClient;
  private readonly maxLength: number;
  private readonly maxSize: number;
  private readonly interval: number;

  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param options  Transporter configuration.
   * @param client   Optional pre-built CloudWatchLogsClient (useful for testing).
   */
  constructor(
    private readonly options: CloudWatchTransporterOptions,
    client?: CloudWatchLogsClient,
  ) {
    super();
    if (!options.group) {
      throw new Error('CloudWatchTransporterOptions.group is required.');
    }

    this.logGroupName = options.group;
    this.logStreamName =
      options.stream ??
      (options.prefix ? options.prefix + '-' : '') +
        os.hostname() +
        '-' +
        process.pid +
        '-' +
        Date.now();

    this.maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
    this.interval = options.interval ?? DEFAULT_INTERVAL_MS;

    if (client) {
      this.client = client;
    } else {
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
      this.client = new CloudWatchLogsClient(clientConfig);
    }
  }

  protected async initialize(): Promise<void> {
    try {
      await this.client.send(new CreateLogGroupCommand({ logGroupName: this.logGroupName }));
    } catch (err: unknown) {
      if (!isResourceAlreadyExists(err)) throw err;
    }

    try {
      await this.client.send(
        new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        }),
      );
    } catch (err: unknown) {
      if (!isResourceAlreadyExists(err)) throw err;
    }
  }

  async send(entry: LogEntry): Promise<void> {
    await this.ensureInitialized();

    this.buffer.push(entry);

    if (this.shouldFlushNow(entry)) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  async flush(): Promise<void> {
    this.cancelScheduledFlush();

    if (this.buffer.length === 0) return;

    const events = this.buffer.splice(0);
    const logEvents = events.map((e) => ({
      timestamp: e.timestamp,
      message: e.message,
    }));

    await this.client.send(
      new PutLogEventsCommand({
        logEvents,
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
      }),
    );
  }

  async close(): Promise<void> {
    await this.flush();
    this.client.destroy();
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private shouldFlushNow(newEntry: LogEntry): boolean {
    if (this.buffer.length >= this.maxLength) return true;

    const bufferedSize = this.buffer.reduce((sum, e) => sum + e.message.length + EVENT_OVERHEAD, 0);
    if (bufferedSize + newEntry.message.length + EVENT_OVERHEAD >= this.maxSize) return true;

    return false;
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null || this.interval === 0) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch(() => undefined);
    }, this.interval);
  }

  private cancelScheduledFlush(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
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
