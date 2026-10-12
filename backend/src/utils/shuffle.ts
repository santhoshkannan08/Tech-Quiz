import { randomInt } from 'node:crypto';

export function secureShuffle<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}
