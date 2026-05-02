import { BaseTransporter } from '../base.transporter';
import { LogEntry } from '../log-entry.interface';

export interface PostgreSQLConnectionOptions {
  host: string;
  port?: number;
  database: string;
  user: string;
  password: string;
}

export interface PostgreSQLTransporterOptions {
  /** A PostgreSQL connection string, e.g. `postgres://user:pass@host:5432/db` */
  connectionString?: string;
  /** Individual connection fields; ignored when `connectionString` is provided */
  connection?: PostgreSQLConnectionOptions;
  /** Name of the table used to store log entries (default: `logs`) */
  tableName?: string;
}

const DEFAULT_TABLE = 'logs';

/**
 * Transporter that writes log entries to a PostgreSQL table.
 *
 * The pg driver is an optional peer dependency.
 * Install `pg` to use this transporter.
 *
 * The transporter creates the table on first use if it does not exist:
 * ```sql
 * CREATE TABLE IF NOT EXISTS <tableName> (
 *   id        BIGSERIAL PRIMARY KEY,
 *   level     VARCHAR(10)  NOT NULL,
 *   message   TEXT         NOT NULL,
 *   timestamp TIMESTAMPTZ  NOT NULL,
 *   context   VARCHAR(255),
 *   data      JSONB
 * );
 * ```
 *
 * @param options  Transporter configuration.
 * @param pool     Optional pre-built pg Pool (useful for testing).
 */
export class PostgreSQLTransporter extends BaseTransporter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pool!: any;
  private readonly tableName: string;

  constructor(
    private readonly options: PostgreSQLTransporterOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly injectedPool?: any,
  ) {
    super();
    if (!options.connectionString && !options.connection) {
      throw new Error(
        'PostgreSQLTransporterOptions requires either connectionString or connection fields.',
      );
    }
    this.tableName = options.tableName ?? DEFAULT_TABLE;
  }

  protected async initialize(): Promise<void> {
    if (this.injectedPool) {
      this.pool = this.injectedPool;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg');
      const config = this.options.connectionString
        ? { connectionString: this.options.connectionString }
        : this.options.connection;
      this.pool = new Pool(config);
    }

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS "${this.tableName}" (
        id        BIGSERIAL    PRIMARY KEY,
        level     VARCHAR(10)  NOT NULL,
        message   TEXT         NOT NULL,
        timestamp TIMESTAMPTZ  NOT NULL,
        context   VARCHAR(255),
        data      JSONB
      )
    `);
  }

  async send(entry: LogEntry): Promise<void> {
    await this.ensureInitialized();
    await this.pool.query(
      `INSERT INTO "${this.tableName}" (level, message, timestamp, context, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.level,
        entry.message,
        new Date(entry.timestamp),
        entry.context ?? null,
        entry.data ? JSON.stringify(entry.data) : null,
      ],
    );
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

