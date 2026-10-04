export function applyStudioRuntimeDefaults(targetEnv = process.env) {
  targetEnv.MANARATAK_GOOGLE_AI_STUDIO ??= 'true';
  targetEnv.MANARATAK_RUNTIME_PROFILE ??= 'google-ai-studio';
  targetEnv.VITE_API_URL ??= '';
  targetEnv.VITE_API_BASE_URL ??= '';
  targetEnv.VITE_PUBLIC_WEB_URL ??= '';
  targetEnv.VITE_ADMIN_URL ??= '';
  targetEnv.VITE_PUBLIC_TEMPLATE_DATA_MODE ??= 'api';
  targetEnv.VITE_LOCAL_ADMIN_READ_ONLY ??= 'false';
  targetEnv.DISABLE_HMR ??= 'false';
}
