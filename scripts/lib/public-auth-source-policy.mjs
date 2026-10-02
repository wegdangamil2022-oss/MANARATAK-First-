// Removing obsolete credentials is safe; reading/writing them would restore client authority.
export function hasClientAuthStorage(source) {
  const withoutCleanup = source.replace(/(?:localStorage|sessionStorage)\s*(?:\?\.|\.)\s*removeItem\s*\(\s*(['"])[^'"\r\n]*\1\s*\)/g, '');
  return /(?:localStorage|sessionStorage)[^\n]*(?:role|permission|admin_access|user_email|token)/i.test(withoutCleanup) ||
    /(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem)\s*\(\s*['"][^'"]*(?:role|permission|admin_access|user_email|token)/i.test(withoutCleanup);
}
