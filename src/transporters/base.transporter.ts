import { ILogTransporter } from './log-transporter.interface';
import { LogEntry } from './log-entry.interface';

export abstract class BaseTransporter implements ILogTransporter {
  private initializePromise: Promise<void> | null = null;

  protected async ensureInitialized(): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = this.initialize();
    }
    await this.initializePromise;
  }

  protected abstract initialize(): Promise<void>;

  abstract send(entry: LogEntry): Promise<void>;

  async flush(): Promise<void> {
    // Default no-op; override in buffered transporters
  }

  async close(): Promise<void> {
    // Default no-op; override to release resources
  }
}
