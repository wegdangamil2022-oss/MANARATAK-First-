/** Shared creation/delivery semantic policy, including historical queued intents. */
export function validateNotificationVariables(variables: Readonly<Record<string, string>>): void {
  if (
    Object.keys(variables).length > 40 ||
    Object.entries(variables).some(
      ([key, value]) =>
        !/^[a-zA-Z][a-zA-Z0-9_]{0,119}$/.test(key) ||
        typeof value !== 'string' ||
        value.length > 10000 ||
        /password|token|secret|authorization|email|phone/i.test(key),
    )
  )
    throw new Error('NOTIFICATION_VARIABLES_NOT_ALLOWED');
  const url = variables.actionUrl;
  if (
    url &&
    (!url.startsWith('/') ||
      url.startsWith('//') ||
      /[\\\u0000-\u0020]/.test(url) ||
      /%[0-9a-f]{2}/i.test(url))
  )
    throw new Error('NOTIFICATION_ACTION_URL_NOT_ALLOWED');
}
