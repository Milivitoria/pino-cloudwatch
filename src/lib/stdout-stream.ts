import { Transform, TransformCallback, TransformOptions } from 'stream';

export interface StdoutStreamOptions extends TransformOptions {
  stdout?: boolean;
  console?: Pick<Console, 'log'>;
}

export class StdoutStream extends Transform {
  private readonly console: Pick<Console, 'log'>;
  private readonly stdout: boolean;

  constructor(options: StdoutStreamOptions = {}) {
    options.objectMode = true;
    options.readableObjectMode = true;
    options.writableObjectMode = true;
    super(options);
    this.console = options.console ?? console;
    this.stdout = options.stdout ?? false;
  }

  _transform(chunk: unknown, _encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.stdout) {
      this.console.log(chunk);
    }
    callback(null, chunk);
  }

  _flush(callback: TransformCallback): void {
    callback();
  }
}
