import { LogEntry } from './log-entry.interface';

export interface ILogTransporter {
  send(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}
