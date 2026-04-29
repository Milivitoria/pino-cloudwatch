import { pipeline } from 'stream';
import ChunkyStream from 'chunky-stream';
import { StdoutStream, StdoutStreamOptions } from './lib/stdout-stream';
import { ThrottleStream } from './lib/throttle-stream';
import { CloudWatchStream, CloudWatchStreamOptions } from './lib/cloudwatch-stream';
import { maxLength } from './lib/max-length';
import { maxSize } from './lib/max-size';

export type PinoCloudWatchOptions = CloudWatchStreamOptions & StdoutStreamOptions;

export default function pinoCloudWatch(
  options: PinoCloudWatchOptions,
  errorHandler?: (err: Error) => void
): StdoutStream {
  const opts = { ...options, ignoreEmpty: true };

  const log = new CloudWatchStream(opts);
  const chunk = new ChunkyStream(opts);
  const throttle = new ThrottleStream();
  const stdout = new StdoutStream(opts);

  chunk.use(maxLength);
  chunk.use(maxSize as (chunks: unknown[], nextChunk?: unknown) => boolean);

  if (typeof errorHandler === 'function') {
    log.on('error', errorHandler);
  }

  log.on('flushed', () => {
    stdout.emit('flushed');
  });

  pipeline(stdout, chunk, throttle, log, (err) => {
    if (err) {
      stdout.emit('error', err);
    }
  });

  return stdout;
}
