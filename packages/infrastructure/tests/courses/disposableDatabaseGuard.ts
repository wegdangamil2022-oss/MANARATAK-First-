export function destructiveDatabaseTestsEnabled(url = process.env.DATABASE_URL): boolean {
  if (process.env.RUN_DATABASE_INTEGRATION_TESTS !== 'true' || process.env.DATABASE_MUTATIONS_ALLOWED !== 'true' || !url) return false;
  try {
    const parsed = new URL(url);
    const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    const database = parsed.pathname.replace(/^\//, '').toLowerCase();
    return local && /(test|ci|disposable|wpic10|wp_ic_10|wp-ic-10)/.test(database);
  } catch { return false; }
}
