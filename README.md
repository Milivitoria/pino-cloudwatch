# @Milivitoria/nestjs-pino-logger

A **NestJS logger module** backed by [pino](https://getpino.io/) with a pluggable **transporter** architecture. Ship your logs to AWS CloudWatch, DynamoDB, Elasticsearch, MongoDB, PostgreSQL — or any custom destination — all from a single, unified logger.

---

## Features

- Drop-in `LoggerService` compatible with the NestJS logging interface
- Pluggable transporter pattern — send logs to multiple destinations simultaneously
- Bundled transporters: **CloudWatch**, **DynamoDB**, **Elasticsearch**, **MongoDB**, **PostgreSQL**
- Simple extension API — implement `ILogTransporter` or extend `BaseTransporter`
- `forRoot` (sync) and `forRootAsync` (factory/`ConfigModule`) registration
- Graceful shutdown: all transporters are closed via `OnApplicationShutdown`
- Backward-compatible stream API for pre-NestJS code

---

## Installation

```bash
npm install @Milivitoria/nestjs-pino-logger
```

Install the peer dependency for every transporter you use:

| Transporter | Peer dependency |
|---|---|
| CloudWatch | *(already included — `@aws-sdk/client-cloudwatch-logs`)* |
| DynamoDB | `@aws-sdk/lib-dynamodb @aws-sdk/client-dynamodb` |
| Elasticsearch | `@elastic/elasticsearch` |
| MongoDB | `mongodb` |
| PostgreSQL | `pg` |

---

## Quick Start

### 1. `forRoot` (synchronous)

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule, CloudWatchTransporter } from '@Milivitoria/nestjs-pino-logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      transporters: [
        new CloudWatchTransporter({ group: '/my-app/production' }),
      ],
    }),
  ],
})
export class AppModule {}
```

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PinoLoggerService } from '@Milivitoria/nestjs-pino-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLoggerService));
  await app.listen(3000);
}
bootstrap();
```

### 2. `forRootAsync` (with `ConfigModule`)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule, CloudWatchTransporter } from '@Milivitoria/nestjs-pino-logger';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transporters: [
          new CloudWatchTransporter({
            group: config.get('CW_LOG_GROUP'),
            aws_region: config.get('AWS_REGION'),
          }),
        ],
      }),
    }),
  ],
})
export class AppModule {}
```

---

## Transporter Reference

### CloudWatch

```typescript
import { CloudWatchTransporter } from '@Milivitoria/nestjs-pino-logger';

new CloudWatchTransporter({
  group: '/my-app/production',       // required — CloudWatch log group name
  stream: 'my-stream',               // optional — fixed stream name
  prefix: 'server',                  // optional — stream name prefix (ignored when `stream` is set)
  aws_region: 'us-east-1',
  aws_access_key_id: '...',
  aws_secret_access_key: '...',
  maxLength: 10_000,                 // flush after N buffered events (default: 10 000)
  maxSize: 262_144,                  // flush when buffer exceeds N bytes (default: 256 KB)
  interval: 1_000,                   // flush every N ms (default: 1 000 ms; 0 to disable)
})
```

### DynamoDB

Requires `@aws-sdk/lib-dynamodb` and `@aws-sdk/client-dynamodb`.
Table must have a String partition key named `id`.

```typescript
import { DynamoDBTransporter } from '@Milivitoria/nestjs-pino-logger';

new DynamoDBTransporter({
  tableName: 'app-logs',
  region: 'us-east-1',
  aws_access_key_id: '...',
  aws_secret_access_key: '...',
})
```

### Elasticsearch

Requires `@elastic/elasticsearch`.

```typescript
import { ElasticsearchTransporter } from '@Milivitoria/nestjs-pino-logger';

new ElasticsearchTransporter({
  node: 'https://my-es-cluster:9200',
  index: 'app-logs',
  auth: { username: 'elastic', password: 'changeme' },
  maxLength: 200,   // flush after N buffered documents (default: 200)
  interval: 1_000,  // flush every N ms (default: 1 000 ms)
})
```

### MongoDB

Requires `mongodb`.

```typescript
import { MongoDBTransporter } from '@Milivitoria/nestjs-pino-logger';

new MongoDBTransporter({
  uri: 'mongodb://localhost:27017',
  dbName: 'myapp',
  collectionName: 'logs',
})
```

### PostgreSQL

Requires `pg`. The table is created automatically on first use.

```typescript
import { PostgreSQLTransporter } from '@Milivitoria/nestjs-pino-logger';

// via connection string
new PostgreSQLTransporter({ connectionString: 'postgres://user:pass@localhost:5432/mydb' })

// via individual fields
new PostgreSQLTransporter({
  connection: { host: 'localhost', port: 5432, database: 'mydb', user: 'user', password: 'pass' },
  tableName: 'app_logs',  // default: 'logs'
})
```

Created table schema:

```sql
CREATE TABLE IF NOT EXISTS "logs" (
  id        BIGSERIAL    PRIMARY KEY,
  level     VARCHAR(10)  NOT NULL,
  message   TEXT         NOT NULL,
  timestamp TIMESTAMPTZ  NOT NULL,
  context   VARCHAR(255),
  data      JSONB
);
```

---

## Multiple Transporters

You can send every log entry to as many destinations as you like. Transporter errors are isolated — a failure in one destination never blocks the others.

```typescript
LoggerModule.forRoot({
  transporters: [
    new CloudWatchTransporter({ group: '/prod/app' }),
    new ElasticsearchTransporter({ node: 'http://es:9200', index: 'prod-logs' }),
    new PostgreSQLTransporter({ connectionString: process.env.DATABASE_URL }),
  ],
  errorHandler: (err) => console.error('Transporter error:', err),
})
```

---

## Custom Transporter

Extend `BaseTransporter` to route logs to any destination:

```typescript
import { BaseTransporter, LogEntry } from '@Milivitoria/nestjs-pino-logger';

export class SlackTransporter extends BaseTransporter {
  constructor(private readonly webhookUrl: string) {
    super();
  }

  protected async initialize(): Promise<void> {
    // one-time setup (e.g. validate webhook URL)
  }

  async send(entry: LogEntry): Promise<void> {
    await this.ensureInitialized();
    if (entry.level === 'error' || entry.level === 'fatal') {
      await fetch(this.webhookUrl, {
        method: 'POST',
        body: JSON.stringify({ text: `[${entry.level.toUpperCase()}] ${entry.message}` }),
      });
    }
  }
}
```

---

## Pino Options

Pass any pino logger options via `pinoOptions`:

```typescript
LoggerModule.forRoot({
  transporters: [...],
  pinoOptions: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    formatters: {
      level: (label) => ({ level: label }),
    },
  },
})
```

---

## Logger API

`PinoLoggerService` implements the NestJS `LoggerService` interface:

| Method | Pino level |
|---|---|
| `log(message, context?)` | `info` |
| `error(message, trace?, context?)` | `error` |
| `warn(message, context?)` | `warn` |
| `debug(message, context?)` | `debug` |
| `verbose(message, context?)` | `trace` |
| `fatal(message, context?)` | `fatal` |

Additional methods:

- `flush()` — flush all buffered transporters immediately
- `close()` — close all transporter connections (called automatically on app shutdown)

---

## Legacy Stream API (deprecated)

The original `pinoCloudWatch()` stream function is still exported for backward compatibility:

```typescript
import { pinoCloudWatch } from '@Milivitoria/nestjs-pino-logger';
import { pipeline } from 'stream';
import split from 'split2';

pipeline(process.stdin, split(), pinoCloudWatch({ group: 'my-group' }), (err) => {
  if (err) process.exit(1);
});
```

> **Note:** This API is deprecated. Migrate to `LoggerModule` and `CloudWatchTransporter`.

---

## CLI (deprecated)

The `pino-cloudwatch` CLI binary is preserved for backward compatibility:

```bash
node app.js | pino-cloudwatch --group /my-app/production --aws_region us-east-1
```

---

## Test

```bash
npm test
```
