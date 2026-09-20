# MNT-AUD-0114 — Inline Style Attributes Prevent Full No-`unsafe-inline` Frontend CSP

- **Discovered:** 2026-09-06 during remediation of MNT-AUD-0101
- **Severity:** P1 — HIGH
- **Wave:** W1 / W4 / W6
- **Status:** SOURCE_VERIFIED — RUNTIME_BROWSER_VERIFICATION_PENDING
- **Category:** SECURITY / CSP / XSS / FRONTEND / ADMIN / WEB

## Evidence

The remediation sweep originally found 177 React inline-style attributes across Web/Admin and three inline `<style>` elements in public course/test pages. Those source-level CSP blockers have now been removed.

Current source sweep:

- `apps/web/src`: 0 inline `style={...}` attributes and 0 inline `<style>` elements.
- `apps/admin/src`: 0 inline `style={...}` attributes and 0 inline `<style>` elements.
- Certificate preview colors now resolve through a finite, source-controlled palette rather than arbitrary runtime CSS declarations.
- Dynamic progress rendering uses native `<progress>` controls styled from source CSS; animation timing/keyframes moved to `template.css`.

## Required remediation

1. Remove or migrate every React inline style attribute from production Web/Admin code.
2. Prefer static classes and stylesheet rules for constant presentation values.
3. For bounded dynamic themes, map governed tokens to predefined classes; do not accept arbitrary CSS from API/user input.
4. Where truly dynamic visual values are required, use a reviewed stylesheet/CSSOM strategy that remains compatible with strict CSP and cannot inject arbitrary declarations.
5. Add a source verifier whose target is exactly zero production `style={{...}}` occurrences unless an individually reviewed exception is registered.
6. Remove `style-src-attr 'unsafe-inline'` from `ViteFrontendSecurityHeaders.ts` when the counter reaches zero.
7. Run browser smoke tests for Web and Admin under the final CSP before MNT-AUD-0101/0114 closure.

## Closure evidence

- [x] Web inline-style count = 0.
- [x] Admin inline-style count = 0.
- [x] Canonical frontend CSP contains no `unsafe-inline` directive.
- [ ] Built Web/Admin artifacts contain the final `_headers` policy.
- [ ] Deployed Web/Admin responses pass the frontend header verifier.
- [ ] Browser smoke tests pass under final CSP.
