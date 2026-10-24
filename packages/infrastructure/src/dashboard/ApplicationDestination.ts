export type PublishedApplicationResolver = (
  id: string,
) => Promise<{ id: string; applicationUrl?: string | null } | null>;
export function safeApplicationHost(url: string): string {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    !parsed.hostname.includes('.') ||
    /(^localhost$|\.(?:local|internal|test)$|^[\d.]+$|[\[\]:])/i.test(parsed.hostname)
  )
    throw new Error('APPLICATION_DESTINATION_INVALID');
  return parsed.hostname.toLowerCase();
}
