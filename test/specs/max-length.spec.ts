import { describe, it, expect } from 'vitest';
import { maxLength } from '../../src/lib/max-length';

describe('max-length', () => {
  it('should return false when below MAX_LENGTH (10000)', () => {
    expect(maxLength([])).toBe(false);
  });

  it('should return true when equal MAX_LENGTH (10000)', () => {
    const chunks = new Array(10000).fill({});
    expect(maxLength(chunks)).toBe(true);
  });
});
