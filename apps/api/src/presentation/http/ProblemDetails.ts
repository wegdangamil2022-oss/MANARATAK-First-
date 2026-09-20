export interface ManaratakProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  traceId: string;
  issues?: unknown;
}

const statusTitles: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export function problemDetails(input: {
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  traceId?: string;
  type?: string;
  title?: string;
  issues?: unknown;
}): ManaratakProblemDetails {
  const status = Number.isInteger(input.status) ? input.status : 500;
  const code = input.code?.trim() || `HTTP_${status}`;
  return {
    type: input.type?.trim() || `https://api.manaratak.local/problems/${code.toLowerCase().replace(/_/g, '-')}`,
    title: input.title?.trim() || statusTitles[status] || 'Request Error',
    status,
    detail: input.detail?.trim() || statusTitles[status] || 'The request could not be completed.',
    instance: input.instance?.trim() || '/',
    code,
    traceId: input.traceId?.trim() || 'unknown',
    ...(input.issues === undefined ? {} : { issues: input.issues }),
  };
}

export function isProblemDetails(value: unknown): value is ManaratakProblemDetails {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.type === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.status === 'number'
    && typeof candidate.detail === 'string'
    && typeof candidate.instance === 'string'
    && typeof candidate.code === 'string'
    && typeof candidate.traceId === 'string';
}

export function legacyErrorToProblem(input: {
  body: unknown;
  status: number;
  instance: string;
  traceId: string;
}): ManaratakProblemDetails {
  if (isProblemDetails(input.body)) return input.body;

  const body = input.body && typeof input.body === 'object'
    ? input.body as Record<string, unknown>
    : {};
  const nested = body.error && typeof body.error === 'object'
    ? body.error as Record<string, unknown>
    : undefined;
  const stringError = typeof body.error === 'string' ? body.error : undefined;
  const detail = typeof body.detail === 'string' ? body.detail
    : typeof body.message === 'string' ? body.message
      : typeof nested?.message === 'string' ? nested.message
        : stringError
          || statusTitles[input.status]
          || 'The request could not be completed.';
  const code = typeof body.code === 'string' ? body.code
    : typeof nested?.code === 'string' ? nested.code
      : stringError && /^[A-Z0-9_:-]+$/.test(stringError) ? stringError
        : `HTTP_${input.status}`;
  const issues = body.issues ?? body.errors ?? nested?.issues;

  return problemDetails({
    status: input.status,
    detail,
    instance: input.instance,
    code,
    traceId: input.traceId,
    issues,
  });
}
