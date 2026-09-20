# MANARATAK Frontend Security Headers — Web/Admin Delivery Contract

**Status:** SOURCE_ENFORCED / RUNTIME_DELIVERY_PENDING  
**Findings:** MNT-AUD-0101, MNT-AUD-0114  
**Applies to:** `apps/web`, `apps/admin`

## Canonical source

`apps/frontend-security/ViteFrontendSecurityHeaders.ts` is the single source-controlled browser-document header policy.

It is composed into both Vite applications and:

1. sets the policy on Vite development and preview responses;
2. emits a production `_headers` artifact from the same policy during build;
3. requires the deployment adapter/static host to preserve and apply the emitted policy;
4. requires post-deployment verification before production closure.

The API Helmet policy remains defense-in-depth only. It is not evidence that Web/Admin HTML is protected.

## Mandatory browser controls

- `Content-Security-Policy`
- `frame-ancestors 'none'`
- `X-Frame-Options: DENY`
- `script-src 'self'`
- `script-src-attr 'none'`
- `object-src 'none'`
- `base-uri 'self'`
- restrictive `Permissions-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Temporary MNT-AUD-0114 exception

The current source contains 171 React inline-style sites discovered during MNT-AUD-0101 remediation: 21 under Web and 150 under Admin at the remediation snapshot.

For compatibility, the canonical policy currently isolates one explicit exception:

`style-src-attr 'unsafe-inline'`

This exception does **not** apply to scripts or `<style>` elements. `script-src` and `style-src` remain free of `unsafe-inline`.

MNT-AUD-0101 must remain `RUNTIME_PENDING / POLICY_EXCEPTION_OPEN` until MNT-AUD-0114 removes the inline-style dependency and the exception is deleted from the canonical policy.

## Production acceptance

Do not close MNT-AUD-0101 from source inspection alone. After deployment, verify the actual Web and Admin HTML responses:

```bash
node scripts/security/verify-frontend-security-headers.mjs \
  --url https://app.manaratak.org \
  --url https://admin.manaratak.org
```

The verifier must confirm the delivered headers, not a configuration flag. The production host must also be checked to ensure `_headers` (or the equivalent host-native mapping) is actually honored.
