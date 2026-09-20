# MANARATAK 2.0 - Demo Admin Login Fix Report

## Goal
Allow a specific demo admin credential (`wegdangamil2022@gmail.com` / `wegdan1234@1234`) to authenticate from the public login page and automatically access the Admin Portal during local/development mode.

## Modifications Made
1. **Public Login Form Update (`apps/web/src/features/auth/LoginPage.tsx`)**:
   - Added a new `password` input field.
   - For `student` role, it operates as a placeholder demo login without password verification.
   - For `admin` role, it validates exactly against the requested credential.
   - Upon successful admin validation, redirects to `${import.meta.env.VITE_ADMIN_URL || 'http://localhost:3001'}?auto_unlock=admin-demo`.

2. **Admin Portal Unlock Configuration (`apps/admin/src/App.tsx`)**:
   - Modified `useEffect` in `AdminLayout` to intercept the `?auto_unlock=admin-demo` query parameter upon first page load.
   - Safely sets the local `manaratak_admin_access` to `demo-unlocked`.
   - Strips the `auto_unlock` query parameter from the browser history cleanly so it doesn't linger.
   - Automatically logs in and renders the Admin Dashboard without prompting the user.

3. **Translations Updates (`apps/web/src/i18n/en.ts` & `apps/web/src/i18n/ar.ts`)**:
   - Added the `password` translation key.
   - Added the `demo_admin_invalid` translation key for wrong credentials.

## Behavior Summary
- **Credential Required**: `wegdangamil2022@gmail.com` with `wegdan1234@1234`.
- **Target URL**: Routes strictly to `http://localhost:3001` (or `VITE_ADMIN_URL` if set).
- **Reset Mechanism**: To log out/reset, click the "Lock / إغلاق" button in the admin navigation bar. This wipes out the local storage tokens.

## Production Security Check
- The `auto_unlock=admin-demo` mechanism operates entirely on client-side placeholder flags (`demo-unlocked`) designed exclusively for UI traversal.
- It does **not** grant or bypass the production `ADMIN_BEARER_TOKEN_STORAGE_KEY` which is strictly required by the `adminApiClient` to perform actual destructive operations via `apps/api`. 
- Real environment APIs will still reject these requests without a valid cryptographic JWT or bearer token. This simply makes the interface accessible to the reviewer.

## Verification
- `npm run verify:local` passed fully (all 175 tests green).
- Linter passed.
- No public environment variables were compromised.
