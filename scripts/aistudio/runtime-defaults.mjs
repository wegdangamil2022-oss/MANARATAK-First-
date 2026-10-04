export function applyStudioRuntimeDefaults(targetEnv = process.env) {
  const configuredPublicWebUrl = targetEnv.PUBLIC_WEB_URL || targetEnv.APP_URL;
  if (configuredPublicWebUrl) {
    targetEnv.PUBLIC_WEB_URL ||= configuredPublicWebUrl;
    targetEnv.VITE_PUBLIC_WEB_URL ||= configuredPublicWebUrl;
  }
  targetEnv.ACCESS_TOKEN_TTL_SECONDS ??= '900';
  targetEnv.SESSION_TTL_SECONDS ??= '2592000';
  targetEnv.MANARATAK_GOOGLE_AI_STUDIO ??= 'true';
  targetEnv.MANARATAK_RUNTIME_PROFILE ??= 'google-ai-studio';
  targetEnv.VITE_API_URL ??= '';
  targetEnv.VITE_API_BASE_URL ??= '';
  targetEnv.VITE_ADMIN_URL ??= '';
  targetEnv.VITE_PUBLIC_TEMPLATE_DATA_MODE ??= 'api';
  targetEnv.VITE_LOCAL_ADMIN_READ_ONLY ??= 'false';
  targetEnv.DISABLE_HMR ??= 'false';
}
