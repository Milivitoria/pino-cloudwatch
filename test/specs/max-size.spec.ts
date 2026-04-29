import { describe, it, expect } from 'vitest';
import { maxSize } from '../../src/lib/max-size';

describe('max-size', () => {
  it('should return false when below MAX_SIZE', () => {
    expect(maxSize(['1', '2'], '1')).toBe(false);
  });

  it('should return true when size exceeds MAX_SIZE', () => {
    const chunks: string[] = [];
    for (let i = 0; i < Math.floor(1048576 / (10 + 26)) - 1; i++) {
      chunks.push('1234567890');
    }
    expect(maxSize(chunks, '1234567890')).toBe(true);
  });
});
