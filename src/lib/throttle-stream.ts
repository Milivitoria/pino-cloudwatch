import { Transform, TransformCallback, TransformOptions } from 'stream';

export class ThrottleStream extends Transform {
  private lastTime: number;
  private readonly interval: number;
  private timeoutId: ReturnType<typeof setTimeout> | null;
  private buffer: unknown[];

  constructor(options: TransformOptions = {}) {
    options.objectMode = true;
    options.readableObjectMode = true;
    options.writableObjectMode = true;
    super(options);
    this.lastTime = 0;
    this.interval = 1000 / 5;
    this.timeoutId = null;
    this.buffer = [];
  }

  flush(callback?: TransformCallback): void {
    if (this.buffer.length > 0) {
      const chunk = this.buffer.shift();
      this.push(chunk);

      if (this.buffer.length > 0) {
        this.timeoutId = setTimeout(() => this.flush(callback), this.interval);
      } else if (callback) {
        callback();
      }
    }
  }

  _transform(chunk: unknown, _encoding: BufferEncoding, callback: TransformCallback): void {
    const duration = Date.now() - this.lastTime;
    this.lastTime = Date.now();

    if (duration > this.interval) {
      callback(null, chunk);
      return;
    }

    this.buffer.push(chunk);
    this.timeoutId = setTimeout(() => this.flush(callback), duration);
  }

  _flush(callback: TransformCallback): void {
    this.flush(callback);
  }
}
