import { describe, expect, it } from 'vitest';
import { elapsedMilliseconds, isBeforeDeadline, QUESTION_DURATION_MS, questionDeadline } from '../src/utils/timing.js';

describe('per-question timing', () => {
  it('uses a strict seven-second server deadline', () => {
    const startedAt = new Date('2026-10-12T08:00:00.000Z');
    const deadline = questionDeadline(startedAt);

    expect(deadline.getTime() - startedAt.getTime()).toBe(QUESTION_DURATION_MS);
    expect(isBeforeDeadline(new Date('2026-10-12T08:00:06.999Z'), deadline)).toBe(true);
    expect(isBeforeDeadline(deadline, deadline)).toBe(false);
  });

  it('never records negative time when clocks are out of order', () => {
    const startedAt = new Date('2026-10-12T08:00:01.000Z');
    expect(elapsedMilliseconds(startedAt, new Date('2026-10-12T08:00:00.000Z'))).toBe(0);
  });

  it('gives every question its own fresh seven-second window', () => {
    const questionStartTimes = Array.from({ length: 15 }, (_, index) => (
      new Date(Date.UTC(2026, 9, 12, 8, 0, index))
    ));

    const deadlines = questionStartTimes.map(questionDeadline);

    deadlines.forEach((deadline, index) => {
      expect(deadline.getTime() - questionStartTimes[index].getTime()).toBe(QUESTION_DURATION_MS);
    });
    expect(deadlines[0]).not.toEqual(deadlines[1]);
  });

  it('keeps a persisted deadline unchanged when an attempt is refreshed', () => {
    const startedAt = new Date('2026-10-12T08:00:00.000Z');
    const persistedDeadline = questionDeadline(startedAt);
    const refreshedAt = new Date('2026-10-12T08:00:03.000Z');

    expect(persistedDeadline).toEqual(questionDeadline(startedAt));
    expect(isBeforeDeadline(refreshedAt, persistedDeadline)).toBe(true);
    expect(persistedDeadline.getTime() - refreshedAt.getTime()).toBe(4_000);
  });
});
