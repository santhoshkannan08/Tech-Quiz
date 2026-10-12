import { describe, expect, it } from 'vitest';
import { hasUniqueValues, secureShuffle } from '../src/utils/shuffle.js';

describe('secureShuffle', () => {
  it('preserves every item without duplication', () => {
    const original = ['q1', 'q2', 'q3', 'q4'];
    const shuffled = secureShuffle(original);
    expect(shuffled).toHaveLength(original.length);
    expect(new Set(shuffled)).toEqual(new Set(original));
    expect(hasUniqueValues(shuffled)).toBe(true);
    expect(original).toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});
