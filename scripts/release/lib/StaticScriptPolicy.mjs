/** Parse only same-origin JavaScript entries; this is presence validation, not browser execution. */
export function staticScriptEntries(html) {
  const entries=[...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(match=>match[1]);
  if(!entries.length||entries.length>32)throw new Error('STATIC_SCRIPT_ENTRIES_REQUIRED');
  for(const value of entries) {
    let decoded;try{decoded=decodeURIComponent(value);}catch{throw new Error('STATIC_SCRIPT_PATH_INVALID');}
    if(/[\\\u0000-\u0020]/.test(decoded)||decoded.startsWith('//')||/^[a-z][a-z0-9+.-]*:/i.test(decoded)||
        decoded.split(/[/?#]/).includes('..'))throw new Error('STATIC_SCRIPT_PATH_INVALID');
    const url=new URL(value,'https://static.invalid/');
    if(url.hash||!url.pathname.endsWith('.js'))throw new Error('STATIC_SCRIPT_PATH_INVALID');
  }
  return [...new Set(entries)];
}
