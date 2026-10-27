import { adminApiClient } from './client';

export async function submitAuthorizationChange(input: {
  endpoint: string;
  method: string;
  body: Record<string, unknown>;
  key: string;
  approver?: string;
  ticket?: string;
}): Promise<{ pendingApproval: boolean }> {
  const prefix = '/admin/authorization';
  if (!input.endpoint.startsWith(prefix + '/')) throw Error('IAM_CHANGE_TARGET_INVALID');
  const target = {
    method: input.method,
    path: input.endpoint.slice(prefix.length),
    body: input.body,
    changeTicket: input.ticket?.trim() || '',
  };
  const preview = await adminApiClient.request<{ data: { requiresApproval: boolean } }>(
    prefix + '/change-preview',
    { method: 'POST', body: JSON.stringify(target) },
  );
  if (preview.data.requiresApproval) {
    if (!input.approver || (input.ticket?.trim().length ?? 0) < 6)
      throw Error('IAM_INDEPENDENT_APPROVER_AND_TICKET_REQUIRED');
    await adminApiClient.request(prefix + '/change-requests', {
      method: 'POST',
      idempotencyKey: input.key,
      body: JSON.stringify({ id: 'ac-' + input.key, approverId: input.approver, target }),
    });
    return { pendingApproval: true };
  }
  await adminApiClient.request(input.endpoint, {
    method: input.method,
    idempotencyKey: input.key,
    body: JSON.stringify(input.body),
  });
  return { pendingApproval: false };
}
