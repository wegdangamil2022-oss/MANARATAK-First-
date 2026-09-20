export class DefaultSanitizer {
  /**
   * Sanitizes input payload.
   * - Must not destroy Markdown
   * - Must not strip Arabic text
   * - Must not mutate rich content unexpectedly
   * We will do a very lightweight basic sanitization (like trimming strings).
   * For XSS, we rely on React/Frontend and explicit rich-text sanitizers where applicable.
   */
  public sanitize(payload: any): any {
    if (payload === null || payload === undefined) {
      return payload;
    }

    if (typeof payload === 'string') {
      // Basic trim, but DO NOT strip out HTML or Markdown tags here to avoid destroying rich content.
      // Doing heavy HTML sanitization generically here is dangerous and breaks WYSIWYG/Markdown.
      // So we just return the string. If domain needs strict stripping, it should do it.
      return payload.trim();
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitize(item));
    }

    if (typeof payload === 'object') {
      const sanitizedObj: any = {};
      for (const key of Object.keys(payload)) {
        sanitizedObj[key] = this.sanitize(payload[key]);
      }
      return sanitizedObj;
    }

    return payload;
  }
}
