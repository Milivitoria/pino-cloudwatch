const MAX_LENGTH = 10000;

export function maxLength(chunks: unknown[]): boolean {
  return chunks.length === MAX_LENGTH;
}
