export type AuditTimeZone = 'UTC' | 'LOCAL';

/** Date inputs are interpreted in the explicitly selected zone, never a fixed country offset. */
export function auditFilterParams(
  filters: Record<string, string>,
  zone: AuditTimeZone,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value.trim()) continue;
    if (key === 'from' || key === 'until') {
      const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
      if (!match) throw new Error('AUDIT_DATE_INVALID');
      const date = new Date(value + (zone === 'UTC' ? 'Z' : ''));
      const parts =
        zone === 'UTC'
          ? [
              date.getUTCFullYear(),
              date.getUTCMonth() + 1,
              date.getUTCDate(),
              date.getUTCHours(),
              date.getUTCMinutes(),
              date.getUTCSeconds(),
            ]
          : [
              date.getFullYear(),
              date.getMonth() + 1,
              date.getDate(),
              date.getHours(),
              date.getMinutes(),
              date.getSeconds(),
            ];
      if (
        !Number.isFinite(date.getTime()) ||
        parts.some((part, index) => part !== Number(match[index + 1] ?? 0))
      )
        throw new Error('AUDIT_DATE_INVALID');
      if (key === 'until' && !match[6]) date.setTime(date.getTime() + 59_999);
      params.set(key, date.toISOString());
    } else params.set(key, value.trim());
  }
  if (params.get('from') && params.get('until') && params.get('from')! > params.get('until')!)
    throw new Error('AUDIT_DATE_RANGE_INVALID');
  return params;
}

export function auditTargetLink(
  type: string,
  id: string,
  can: (permission: string) => boolean,
): string | null {
  const targets: Record<string, [string, string]> = {
    UNIVERSITY: ['admin:universities:manage', '/universities/'],
    SCHOLARSHIP: ['admin:scholarships:manage', '/scholarships/'],
    MAJOR: ['admin:majors:manage', '/majors/'],
    INTERNATIONAL_TEST: ['admin:international-tests:manage', '/international-tests/'],
    COURSE: ['admin:courses:manage', '/courses/'],
    CERTIFICATE: ['admin:certificates:view', '/certificates/'],
    INVOICE: ['admin:finance:manage', '/finance/invoices/'],
    STUDY_DESTINATION: ['admin:reference-data:manage', '/study-destinations/'],
  };
  if (type === 'IDENTITY' && can('admin:identities:manage'))
    return `/identities?search=${encodeURIComponent(id)}`;
  const target = targets[type];
  return target && can(target[0]) ? target[1] + encodeURIComponent(id) : null;
}

export function auditFormat(template: string, ...values: unknown[]): string {
  return template.replace(/\{(\d+)\}/g, (_match, index: string) =>
    String(values[Number(index)] ?? ''),
  );
}

export function auditCsvCell(value: string): string {
  const safe = /^[\s]*[=+\-@]/.test(value) || /^[\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
