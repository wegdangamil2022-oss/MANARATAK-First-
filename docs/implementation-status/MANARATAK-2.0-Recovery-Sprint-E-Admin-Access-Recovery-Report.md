# MANARATAK 2.0 - Recovery Sprint E - Admin Access Recovery Report

## Goal
Make Admin Portal access visible, documented, and usable in local/Google Studio development, without exposing admin-only data publicly.

## Admin Runtime Mode
Based on inspection of `apps/admin/package.json` and the routing configuration, the Admin Portal is a **separate Vite application** that runs independently of the public web frontend. It is NOT mounted inside `apps/web`. 

## Admin Run Command and URL
- **Exact Run Command:** `npm run dev -w @manaratak/admin`
- **Exact Local URL:** `http://localhost:3001`

## Modifications Made
1. **Admin Entry on Public Site:** 
   - Added an "Admin Portal" / "لوحة التحكم" link to the footer of the public application (`apps/web/src/router/index.tsx`). 
   - Uses `import.meta.env.VITE_ADMIN_URL` with a fallback to `http://localhost:3001`.
2. **Translation Updates:** 
   - Added `nav_admin` to both `apps/web/src/i18n/ar.ts` and `apps/web/src/i18n/en.ts` dictionaries to ensure proper bilingual support.
3. **Admin Environment Variables:** 
   - Added `VITE_ADMIN_URL` and `ADMIN_BEARER_TOKEN` placeholders to `.env.example`.
4. **Documentation (README.md):** 
   - Added an `## Admin Portal` section outlining the run command, URL, and local unlock mechanism.

## Admin Login / Unlock UX (Local Flow)
The admin app is protected by a client-side access gate out of the box (`apps/admin/src/App.tsx`). To enter locally:
- Start the admin app.
- When prompted for an access code, type `admin-demo`.
- This unlocks the Admin Dashboard for local development without needing a strict production token.

## Verification
- Run `npm run verify:local` successfully.
- Build, lint, and tests (175 tests) remain green.
- Public site remains untouched in its core business logic, retaining full mobile responsivity.
- No protected APIs were exposed to the public internet.

## Remaining Blockers
None. Admin access is now successfully restored for development and properly integrated into the local UI.
