import { describe, expect, it } from 'vitest';
import { safeRichTextPreview } from './safeRichTextPreview';

describe('safeRichTextPreview', () => {
  it('turns legacy executable markup into inert readable text', () => {
    expect(safeRichTextPreview('<p>Hello</p><img src=x onerror="globalThis.pwned=true"><script>alert(1)</script>'))
      .toBe('Hello alert(1)');
  });

  it('normalizes malformed markup without returning an HTML element', () => {
    expect(safeRichTextPreview('<a href="javascript:alert(1)">Unsafe link</a>'))
      .toBe('Unsafe link');
  });
});
