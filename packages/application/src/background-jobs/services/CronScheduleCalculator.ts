const FIELD_RANGES = [
  [0, 59],   // minute
  [0, 23],   // hour
  [1, 31],   // day of month
  [1, 12],   // month
  [0, 6],    // day of week, Sunday = 0
] as const;

function parseNumber(raw: string, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('BACKGROUND_JOB_CRON_INVALID');
  return value;
}

function expandPart(part: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  const [base, stepRaw] = part.split('/');
  const step = stepRaw === undefined ? 1 : parseNumber(stepRaw, 1, max - min + 1);
  let start = min;
  let end = max;
  if (base !== '*') {
    if (base.includes('-')) {
      const [startRaw, endRaw] = base.split('-');
      start = parseNumber(startRaw, min, max);
      end = parseNumber(endRaw, min, max);
      if (start > end) throw new Error('BACKGROUND_JOB_CRON_INVALID');
    } else {
      const value = parseNumber(base, min, max);
      start = value;
      end = value;
    }
  }
  for (let value = start; value <= end; value += step) values.add(value);
  return values;
}

function parseField(field: string, min: number, max: number): Set<number> {
  if (!field.trim()) throw new Error('BACKGROUND_JOB_CRON_INVALID');
  const result = new Set<number>();
  for (const part of field.split(',')) {
    for (const value of expandPart(part.trim(), min, max)) result.add(value);
  }
  return result;
}

export function validateCronExpression(expression: string): void {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('BACKGROUND_JOB_CRON_INVALID');
  fields.forEach((field, index) => parseField(field, FIELD_RANGES[index][0], FIELD_RANGES[index][1]));
}

/**
 * Returns the next UTC minute matching a standard five-field cron expression.
 * Search is intentionally bounded to 366 days to prevent malformed schedules
 * from turning worker startup into an unbounded loop.
 */
export function nextCronOccurrence(expression: string, after: Date): Date {
  validateCronExpression(expression);
  const [minuteField, hourField, dayField, monthField, weekdayField] = expression.trim().split(/\s+/);
  const minutes = parseField(minuteField, 0, 59);
  const hours = parseField(hourField, 0, 23);
  const days = parseField(dayField, 1, 31);
  const months = parseField(monthField, 1, 12);
  const weekdays = parseField(weekdayField, 0, 6);
  const candidate = new Date(after.getTime());
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  const maxMinutes = 366 * 24 * 60;
  for (let i = 0; i < maxMinutes; i++) {
    if (
      minutes.has(candidate.getUTCMinutes()) &&
      hours.has(candidate.getUTCHours()) &&
      days.has(candidate.getUTCDate()) &&
      months.has(candidate.getUTCMonth() + 1) &&
      weekdays.has(candidate.getUTCDay())
    ) return new Date(candidate);
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  throw new Error('BACKGROUND_JOB_CRON_NO_OCCURRENCE_WITHIN_BOUND');
}
