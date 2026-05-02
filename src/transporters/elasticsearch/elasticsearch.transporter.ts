import { BaseTransporter } from '../base.transporter';
import { LogEntry } from '../log-entry.interface';

export interface ElasticsearchAuth {
  username: string;
  password: string;
}

export interface ElasticsearchTransporterOptions {
  node: string;
  index: string;
  auth?: ElasticsearchAuth;
  /** Maximum number of buffered log entries before a forced flush (default: 200) */
  maxLength?: number;
  /** Interval in ms for automatic flushing (default: 1 000 ms, 0 to disable) */
  interval?: number;
}

const DEFAULT_MAX_LENGTH = 200;
const DEFAULT_INTERVAL_MS = 1_000;

/**
 * Transporter that writes log entries to an Elasticsearch index using the bulk API.
 *
 * The Elasticsearch client is an optional peer dependency.
 * Install `@elastic/elasticsearch` to use this transporter.
 *
 * @param options  Transporter configuration.
 * @param client   Optional pre-built Elasticsearch client (useful for testing).
 */
export class ElasticsearchTransporter extends BaseTransporter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client!: any;
  private readonly maxLength: number;
  private readonly interval: number;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly options: ElasticsearchTransporterOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly injectedClient?: any,
  ) {
    super();
    if (!options.node) {
      throw new Error('ElasticsearchTransporterOptions.node is required.');
    }
    if (!options.index) {
      throw new Error('ElasticsearchTransporterOptions.index is required.');
    }
    this.maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
    this.interval = options.interval ?? DEFAULT_INTERVAL_MS;
  }

  protected async initialize(): Promise<void> {
    if (this.injectedClient) {
      this.client = this.injectedClient;
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('@elastic/elasticsearch');
    const clientOptions: Record<string, unknown> = { node: this.options.node };
    if (this.options.auth) {
      clientOptions.auth = this.options.auth;
    }
    this.client = new Client(clientOptions);
  }

  async send(entry: LogEntry): Promise<void> {
    await this.ensureInitialized();

    this.buffer.push(entry);

    if (this.buffer.length >= this.maxLength) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  async flush(): Promise<void> {
    this.cancelScheduledFlush();

    if (this.buffer.length === 0) return;

    const entries = this.buffer.splice(0);
    const operations = entries.flatMap((entry) => [
      { index: { _index: this.options.index } },
      {
        level: entry.level,
        message: entry.message,
        '@timestamp': new Date(entry.timestamp).toISOString(),
        context: entry.context,
        data: entry.data,
      },
    ]);

    await this.client.bulk({ operations, refresh: false });
  }

  async close(): Promise<void> {
    await this.flush();
    if (this.client) {
      await this.client.close();
    }
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

