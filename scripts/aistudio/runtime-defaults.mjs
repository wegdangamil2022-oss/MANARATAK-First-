export function applyStudioRuntimeDefaults(env) {
  const configuredPublicWebUrl = env.PUBLIC_WEB_URL || env.APP_URL;
  if (configuredPublicWebUrl) {
    env.PUBLIC_WEB_URL ||= configuredPublicWebUrl;
    env.VITE_PUBLIC_WEB_URL ||= configuredPublicWebUrl;
  }
  env.ACCESS_TOKEN_TTL_SECONDS ??= '900';
  env.SESSION_TTL_SECONDS ??= '2592000';
}
