export const QUESTION_DURATION_MS = 7_000;

export function questionDeadline(startedAt: Date): Date {
  return new Date(startedAt.getTime() + QUESTION_DURATION_MS);
}

export function isBeforeDeadline(now: Date, deadline: Date): boolean {
  return now.getTime() < deadline.getTime();
}

export function elapsedMilliseconds(startedAt: Date, answeredAt: Date): number {
  return Math.max(0, answeredAt.getTime() - startedAt.getTime());
}
