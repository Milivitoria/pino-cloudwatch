declare module 'chunky-stream' {
  import { Transform, TransformOptions } from 'stream';

  interface ChunkyStreamOptions extends TransformOptions {
    ignoreEmpty?: boolean;
  }

  type Predicate = (chunks: unknown[], nextChunk?: unknown) => boolean;

  class ChunkyStream extends Transform {
    constructor(options?: ChunkyStreamOptions);
    use(predicate: Predicate): void;
  }

  export = ChunkyStream;
}
