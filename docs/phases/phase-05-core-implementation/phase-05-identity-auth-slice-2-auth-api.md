# Phase 05 Identity/Auth Slice 2: Auth API & Token Lifecycle Wiring

This document describes the design, implementation, and verification of the minimal end-user authentication API wiring.

## Overview

We have wired the existing `AuthService` into the API runtime, exposing a secure, minimal `/api/v1/auth` REST API for the authentication lifecycle.

### API Routes Exposed
All endpoints are prefix-mounted at `/api/v1/auth`:
- `POST /login`: Validates the request email, queries the identity by email, and uses `AuthService.login(userId)` to establish and return a new session.
- `POST /refresh`: Authenticates and rotates session refresh tokens.
- `POST /logout`: Revokes the session by user ID and refresh token.

### Security Guarantees & Non-Exposure
- Payload validation is strictly enforced using `zod`.
- Responses are completely filtered to ensure only safe tokens (`accessToken`, `refreshToken`) and message structures are returned.
- Under no circumstances are `JWT_SECRET`, `ADMIN_BEARER_TOKEN`, `DATABASE_URL`, or user password credentials exposed in any response, log, or intermediate error payload.
- Error payloads are normalized and standard; stack traces are never sent to clients.

### Auditing (Deferred)
- **Status**: Audit dispatching on key authentication events is **deferred** to the downstream Phase 05 Audit slice.

### Boundary Preservation
- Strictly adheres to **ADR-027** boundaries.
- No Organization, Employer, Phase 25, or Search Platform references have been introduced.
- Existing Admin Authentication Guard rules remain unchanged.
