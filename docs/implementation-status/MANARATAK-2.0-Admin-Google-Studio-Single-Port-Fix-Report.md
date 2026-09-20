# MANARATAK 2.0 - Admin Google Studio Single-Port Fix Report

## Goal
Make admin access usable inside Google Studio while preserving the production architecture where `apps/admin` remains a separate Admin Portal app on port 3001. Resolve missing Arabic translation keys that caused raw key variables to show in the UI.

## Root Cause
- **Translation Keys**: The previous text-replacement scripts targeting `apps/web/src/i18n/ar.ts` failed due to missing anchor text, leaving raw translation keys like `admin_portal_access` and `demo_admin_unlocked` exposed to users in Arabic mode.
- **Port Constraints in Hosted Previews**: Google Studio and similar single-port preview environments only expose port `3000`. `apps/admin`, which runs on port `3001` in local development, is unreachable. The `/admin` fallback route merely showed instructions, offering no functional preview of the admin interface to the end user.

## Modifications Made
1. **Arabic Translations Fixed (`apps/web/src/i18n/ar.ts`)**:
   - Manually appended the missing keys: `admin_portal_access`, `demo_admin_unlocked`, `admin_portal_external`, `open_admin_portal`, `admin_portal_local_desc`, and `demo_admin_invalid`. 
   - Users now see correct Arabic text in the login and admin access screens.

2. **Google Studio Admin Preview Shell (`apps/web/src/features/admin-preview/AdminPreviewShell.tsx`)**:
   - Built a same-origin React component (`AdminPreviewShell`) to simulate the Admin Portal interface within `apps/web`.
   - Uses Lucide icons and Tailwind to present a clear, mobile-friendly navigation grid matching the admin portal features (Dashboard, Scholarships, Universities, Majors, International Tests, Courses, Services, CMS, Student Tools, Health / Readiness).
   - Placed clear messaging indicating this is a Google Studio development preview shell.
   - Provides a direct "Logout from Demo Admin" action.

3. **Bridge Route Refactored (`apps/web/src/router/index.tsx`)**:
   - `AdminAccessBridgePage` now evaluates the environment and `demoUnlocked` state.
   - If not unlocked, securely shows "Access Denied" and links to login.
   - If unlocked and running in Google Studio (no external `VITE_ADMIN_URL` and not localhost), cleanly mounts `AdminPreviewShell` directly on the `/admin` route instead of a dead-end instruction page.
   - If an external URL *is* provided in `VITE_ADMIN_URL`, it preserves the production handoff logic (rendering the "Open Admin Portal" bridge button).

## Behavior Summary
- **Local Development**: `npm run dev` correctly guides the user to `http://localhost:3001` where `apps/admin` operates.
- **Google Studio**: Logging in as admin on port 3000 routes the user to `/admin`, granting immediate access to the `AdminPreviewShell` without requiring a secondary port or process.
- **Production Integrity**: `apps/admin` remains an isolated application. The public web bundle only contains the lightweight preview shell for demo routing.

## Verification
- Local build completed successfully.
- Linter passed.
- Unit tests (`npm run test`) verified.
- The `AdminPreviewShell` correctly utilizes RTL layout in Arabic mode.
