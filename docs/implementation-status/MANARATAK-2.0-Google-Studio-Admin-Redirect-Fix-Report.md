# MANARATAK 2.0 - Google Studio Admin Redirect Fix Report

## Goal
Make the Admin Portal redirect work correctly in both local development and hosted Google Studio preview environments. The core issue was that the demo login implicitly redirected to `http://localhost:3001` when `VITE_ADMIN_URL` was unset, which resulted in a "refused to connect" error when testing inside a hosted environment where port 3001 is unexposed.

## Root Cause
- `VITE_ADMIN_URL` defaults to `http://localhost:3001` inside `apps/web/src/features/auth/LoginPage.tsx`.
- Google Studio preview uses a single exposed port (3000) for the main web application through a reverse proxy. 
- Connecting to `localhost:3001` inside a browser operating via Google Studio preview resolves to the user's actual local machine, not the hosted preview container.

## Modifications Made
1. **Public Login Form Update (`apps/web/src/features/auth/LoginPage.tsx`)**:
   - Implemented runtime environment detection (`window.location.hostname`).
   - If `VITE_ADMIN_URL` is undefined, the app checks if the hostname is `localhost` or `127.0.0.1`.
   - If running locally, it redirects to `http://localhost:3001` to maintain the multi-port local development experience.
   - If running in a hosted environment (like Google Studio), it safely routes the user to a same-origin fallback (`/admin-demo-preview`).

2. **Same-Origin Fallback Route (`apps/web/src/router/index.tsx`)**:
   - Added a new `AdminDemoPreviewPage` component.
   - Added a `/admin-demo-preview` route to the public web application router.
   - The page acts as a placeholder, explaining to the user that they successfully authenticated as the demo admin and outlining the local instructions for running the separate Admin Portal, effectively preventing the "refused to connect" error state.

3. **Documentation Updates**:
   - `README.md`: Elaborated on Admin Portal deployment details, clarifying local URL behavior, Google Studio preview handling, and configuring `VITE_ADMIN_URL`.
   - `.env.example`: Fixed a formatting issue (missing newline) and added detailed comments regarding `VITE_ADMIN_URL` and `ADMIN_BEARER_TOKEN`.

## Behavior Summary
- **Local Redirect Behavior**: Navigates to `http://localhost:3001?auto_unlock=admin-demo`.
- **Google Studio Redirect Behavior**: Navigates to `/admin-demo-preview` (same-origin placeholder).
- **Exact Admin URL Behavior**: If `VITE_ADMIN_URL` is populated, the app will unconditionally route to that provided URL.

## Verification
- Local build, test, and lint suites successfully complete.
- Fallback route logic respects existing application routing boundaries (react-router-dom).

## Remaining Blockers
- None. The dual-port administration environment is securely mitigated for single-port preview containers.
