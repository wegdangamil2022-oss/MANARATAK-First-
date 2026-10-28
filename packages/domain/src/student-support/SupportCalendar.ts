import type { SupportCalendar } from './SupportCase';

function parts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (key: string) => Number(values.find((part) => part.type === key)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}
function localInstant(
  year: number,
  month: number,
  day: number,
  minute: number,
  timeZone: string,
): number {
  const wanted = Date.UTC(year, month - 1, day, 0, minute);
  const normalized = new Date(wanted);
  let candidate = wanted;
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = parts(new Date(candidate), timeZone);
    const observed = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    if (observed === wanted) return candidate;
    candidate += wanted - observed;
  }
  // A work boundary inside a DST gap needs a policy decision, never a guessed deadline.
  throw Error('SUPPORT_SLA_CALENDAR_UNRESOLVED:' + normalized.toISOString().slice(0, 10));
}
export function validateSupportCalendar(calendar: SupportCalendar): void {
  try {
    parts(new Date(), calendar.timeZone);
  } catch {
    throw Error('SUPPORT_SLA_CALENDAR_INVALID');
  }
  if (
    !calendar.weekdays.length ||
    calendar.weekdays.length > 7 ||
    new Set(calendar.weekdays).size !== calendar.weekdays.length ||
    calendar.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    !Number.isInteger(calendar.opensAtMinute) ||
    !Number.isInteger(calendar.closesAtMinute) ||
    calendar.opensAtMinute < 0 ||
    calendar.closesAtMinute > 1440 ||
    calendar.opensAtMinute >= calendar.closesAtMinute ||
    calendar.holidays.length > 366 ||
    calendar.holidays.some(
      (date) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date,
    )
  )
    throw Error('SUPPORT_SLA_CALENDAR_INVALID');
}
function* intervals(start: Date, calendar: SupportCalendar): Generator<[number, number]> {
  validateSupportCalendar(calendar);
  const first = parts(start, calendar.timeZone);
  for (let offset = 0; offset < 367; offset++) {
    const day = new Date(Date.UTC(first.year, first.month - 1, first.day + offset));
    if (
      !calendar.weekdays.includes(day.getUTCDay()) ||
      calendar.holidays.includes(day.toISOString().slice(0, 10))
    )
      continue;
    yield [
      localInstant(
        day.getUTCFullYear(),
        day.getUTCMonth() + 1,
        day.getUTCDate(),
        calendar.opensAtMinute,
        calendar.timeZone,
      ),
      localInstant(
        day.getUTCFullYear(),
        day.getUTCMonth() + 1,
        day.getUTCDate(),
        calendar.closesAtMinute,
        calendar.timeZone,
      ),
    ];
  }
}
export function supportBusinessDeadline(
  start: Date,
  minutes: number,
  calendar: SupportCalendar,
): string {
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(minutes) ||
    minutes < 0 ||
    minutes > 525600
  )
    throw Error('SUPPORT_SLA_DURATION_INVALID');
  validateSupportCalendar(calendar);
  if (minutes === 0) return start.toISOString();
  let remaining = minutes * 60000;
  for (const [opens, closes] of intervals(start, calendar)) {
    const from = Math.max(opens, start.getTime());
    if (closes <= from) continue;
    if (remaining <= closes - from) return new Date(from + remaining).toISOString();
    remaining -= closes - from;
  }
  throw Error('SUPPORT_SLA_HORIZON_EXCEEDED');
}
export function supportBusinessMinutesBetween(
  start: Date,
  end: Date,
  calendar: SupportCalendar,
): number {
  validateSupportCalendar(calendar);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
    throw Error('SUPPORT_SLA_DURATION_INVALID');
  if (end <= start) return 0;
  if (end.getTime() - start.getTime() > 366 * 86400000) throw Error('SUPPORT_SLA_HORIZON_EXCEEDED');
  let total = 0;
  for (const [opens, closes] of intervals(start, calendar)) {
    if (opens >= end.getTime()) break;
    total +=
      Math.max(0, Math.min(closes, end.getTime()) - Math.max(opens, start.getTime())) / 60000;
  }
  return total;
}
