# MANARATAK Authentication Token & Key Rotation Runbook

**Status:** ACTIVE OPERATIONAL AUTHORITY  
**Security model:** RS256 access JWT + opaque single-use refresh credential  
**Maximum access-token TTL:** 900 seconds

## 1. Trust boundary

- Only the API signing boundary receives `JWT_PRIVATE_KEY_PEM`.
- Verifiers receive public keys only. The canonical public distribution endpoint is `GET /api/v1/auth/jwks.json`.
- Every access JWT header must use `alg=RS256`, `typ=JWT`, and a stable `kid`.
- `JWT_ACTIVE_KEY_ID` identifies the current signing key.
- `JWT_PUBLIC_KEY_PEM` is the public half of the active key.
- `JWT_PREVIOUS_PUBLIC_KEYS_JSON` contains only overlap/retiring public keys keyed by `kid`; it must never contain private key material.
- Refresh credentials are random opaque values and are resolved only through the persisted session store. They are never JWTs and never contain identity claims.

## 2. Rotation sequence

1. Generate a new RSA key pair in deployment-managed key custody.
2. Publish the new public key to verifiers before signing with it.
3. Keep the previous public key in `JWT_PREVIOUS_PUBLIC_KEYS_JSON` for at least the maximum access-token lifetime plus clock-skew allowance.
4. Set the new `JWT_ACTIVE_KEY_ID`, private key and public key on the signer and deploy.
5. Verify JWKS exposes both active and overlap keys while exposing no private `d` parameter.
6. After all tokens signed by the retired key must have expired, remove that public key from overlap configuration.
7. For suspected signing-key compromise, stop signing with the key immediately, remove it from accepted verification keys as policy requires, revoke affected sessions, and require re-authentication.

## 3. Refresh rotation / replay policy

- Refresh credentials are persisted only as SHA-256 hashes.
- A refresh is consumed with `consumeAndRotateRefreshSession` in one database transaction.
- The parent can transition from active to rotated exactly once; the child is created in the same transaction and carries `familyId` + `parentSessionId` lineage.
- Reuse of an already-rotated parent is treated as replay and can revoke all active sessions in that family.
- Logout and identity access-denial operations use the same canonical session records.

## 4. Required environment contract

```text
JWT_ACTIVE_KEY_ID=<stable-kid>
JWT_PRIVATE_KEY_PEM=<deployment-managed RSA private key PEM>
JWT_PUBLIC_KEY_PEM=<matching RSA public key PEM>
JWT_PREVIOUS_PUBLIC_KEYS_JSON={}
JWT_ISSUER=<stable issuer>
JWT_AUDIENCE=<stable audience>
ACCESS_TOKEN_TTL_SECONDS=900
SESSION_TTL_SECONDS=604800
```

Production/staging startup must fail closed if key material is absent, the access TTL is outside 60–900 seconds, or issuer/audience are not stable.

## 5. Evidence required before production closure

- token-provider unit tests: RS256, wrong key, algorithm confusion, tampering, unknown/retired `kid`, TTL boundary, opaque refresh format, JWKS private-material exclusion.
- database integration test proving two concurrent refreshes produce exactly one rotation winner and one rejected replay.
- post-rotation replay test plus logout/revoke-all behavior.
- staging key-overlap exercise proving old access tokens verify during overlap and fail after retirement.
- runtime evidence must be attached to the remediation register; source tests alone do not constitute production closure.
