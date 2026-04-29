const MAX_DURATION = 24 * 60 * 60 * 1000;
let startTime: number | null = null;

export function maxSpan(chunks: unknown[]): boolean {
  if (!startTime) {
    startTime = Date.now();
  }

  if (chunks.length === 0) {
    return false;
  }

  const endTime = Date.now();
  const flush = (endTime - startTime) > MAX_DURATION;

  if (flush) {
    startTime = endTime;
  }

  return flush;
}
