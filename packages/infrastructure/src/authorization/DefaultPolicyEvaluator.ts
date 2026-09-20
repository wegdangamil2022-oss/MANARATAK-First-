import { isIP } from 'node:net';
import { Policy, IPolicyEvaluator, EvaluationContext, AccessDecision } from '@manaratak/domain';

type TimeRule = {
  start: string;
  end: string;
  timezone?: string;
  daysOfWeek?: number[];
};

type IpRule = {
  allowedIps: string[];
};

export class DefaultPolicyEvaluator implements IPolicyEvaluator {
  public async evaluate(policy: Policy, context: EvaluationContext): Promise<AccessDecision> {
    try {
      switch (policy.ruleType.trim().toUpperCase()) {
        case 'TIME':
          return this.evaluateTime(policy.ruleConfiguration, context);
        case 'IP':
          return this.evaluateIp(policy.ruleConfiguration, context);
        default:
          return AccessDecision.denied(`Unsupported policy rule type: ${policy.ruleType}`);
      }
    } catch {
      return AccessDecision.denied(`Malformed policy rule: ${policy.id}`);
    }
  }

  private evaluateTime(configuration: string, context: EvaluationContext): AccessDecision {
    const rule = this.parseTimeRule(configuration);
    const current = this.contextDate(context);
    const { minutes, weekday } = this.localClock(current, rule.timezone);

    if (rule.daysOfWeek && !rule.daysOfWeek.includes(weekday)) {
      return AccessDecision.denied('TIME policy day restriction not satisfied');
    }

    const start = this.parseClock(rule.start);
    const end = this.parseClock(rule.end);
    const allowed = start <= end
      ? minutes >= start && minutes <= end
      : minutes >= start || minutes <= end;

    return allowed
      ? AccessDecision.granted('TIME policy satisfied')
      : AccessDecision.denied('TIME policy restriction not satisfied');
  }

  private evaluateIp(configuration: string, context: EvaluationContext): AccessDecision {
    const rule = this.parseIpRule(configuration);
    const candidate = this.contextIp(context);
    if (!candidate || isIP(candidate) === 0) {
      return AccessDecision.denied('IP policy requires a valid request IP');
    }

    const allowed = rule.allowedIps.some((value) => value === candidate);
    return allowed
      ? AccessDecision.granted('IP policy satisfied')
      : AccessDecision.denied('IP policy restriction not satisfied');
  }

  private parseTimeRule(configuration: string): TimeRule {
    const trimmed = configuration.trim();
    if (!trimmed) throw new Error('TIME_POLICY_CONFIGURATION_REQUIRED');

    if (!trimmed.startsWith('{')) {
      const [start, end, extra] = trimmed.split('-').map((value) => value.trim());
      if (!start || !end || extra) throw new Error('TIME_POLICY_CONFIGURATION_INVALID');
      this.parseClock(start);
      this.parseClock(end);
      return { start, end };
    }

    const parsed = JSON.parse(trimmed) as Partial<TimeRule>;
    if (typeof parsed.start !== 'string' || typeof parsed.end !== 'string') {
      throw new Error('TIME_POLICY_CONFIGURATION_INVALID');
    }
    this.parseClock(parsed.start);
    this.parseClock(parsed.end);
    if (parsed.timezone !== undefined && typeof parsed.timezone !== 'string') {
      throw new Error('TIME_POLICY_TIMEZONE_INVALID');
    }
    if (parsed.daysOfWeek !== undefined) {
      if (!Array.isArray(parsed.daysOfWeek) || parsed.daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
        throw new Error('TIME_POLICY_DAYS_INVALID');
      }
    }
    return {
      start: parsed.start,
      end: parsed.end,
      timezone: parsed.timezone,
      daysOfWeek: parsed.daysOfWeek,
    };
  }

  private parseIpRule(configuration: string): IpRule {
    const trimmed = configuration.trim();
    if (!trimmed) throw new Error('IP_POLICY_CONFIGURATION_REQUIRED');

    let allowedIps: string[];
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        allowedIps = parsed.filter((value): value is string => typeof value === 'string');
      } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { allowedIps?: unknown }).allowedIps)) {
        allowedIps = (parsed as { allowedIps: unknown[] }).allowedIps.filter(
          (value): value is string => typeof value === 'string',
        );
      } else {
        throw new Error('IP_POLICY_CONFIGURATION_INVALID');
      }
    } else {
      allowedIps = trimmed.split(',').map((value) => value.trim()).filter(Boolean);
    }

    if (allowedIps.length === 0 || allowedIps.some((value) => isIP(value) === 0)) {
      throw new Error('IP_POLICY_CONFIGURATION_INVALID');
    }
    return { allowedIps };
  }

  private parseClock(value: string): number {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) throw new Error('TIME_POLICY_CLOCK_INVALID');
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) throw new Error('TIME_POLICY_CLOCK_INVALID');
    return hours * 60 + minutes;
  }

  private contextDate(context: EvaluationContext): Date {
    const candidate = context.now ?? context.currentTime ?? context.requestTime;
    if (candidate === undefined) return new Date();
    const date = candidate instanceof Date ? candidate : new Date(candidate as string | number);
    if (Number.isNaN(date.getTime())) throw new Error('POLICY_CONTEXT_TIME_INVALID');
    return date;
  }

  private contextIp(context: EvaluationContext): string | null {
    const candidate = context.ip ?? context.clientIp ?? context.requestIp;
    if (typeof candidate !== 'string') return null;
    const normalized = candidate.trim();
    if (normalized.startsWith('::ffff:') && isIP(normalized.slice(7)) === 4) {
      return normalized.slice(7);
    }
    return normalized;
  }

  private localClock(date: Date, timezone?: string): { minutes: number; weekday: number } {
    if (!timezone) {
      return { minutes: date.getUTCHours() * 60 + date.getUTCMinutes(), weekday: date.getUTCDay() };
    }

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    const hour = Number(value('hour')) % 24;
    const minute = Number(value('minute'));
    const weekdayName = value('weekday');
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdayName ? weekdays.indexOf(weekdayName) : -1;
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || weekday < 0) {
      throw new Error('TIME_POLICY_TIMEZONE_INVALID');
    }
    return { minutes: hour * 60 + minute, weekday };
  }
}
