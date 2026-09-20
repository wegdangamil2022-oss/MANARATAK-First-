# MANARATAK 2.0 - Admin Entry Visibility Fix Report

## Goal
Make the Admin Portal entry clearly visible on the public homepage (immediately without scrolling) as a secondary CTA, fixing the previous footer implementation.

## Modifications Made
1. **Moved Admin Link:** Removed the "Admin Portal" / "لوحة التحكم" link from the footer in `apps/web/src/router/index.tsx`.
2. **Created Top Banner:** Added a subtle, secondary top banner above the main header inside `AppShell`'s `header` prop in `apps/web/src/router/index.tsx`. 
   - It is immediately visible on both desktop and mobile without scrolling.
   - It is not a primary CTA, positioned elegantly above the main navigation using small text, an arrow icon, and a subdued background (`bg-slate-50 text-slate-500 hover:text-slate-900`).
   - It uses the bilingual translation string `t('nav_admin')`.
3. **Fixed `@manaratak/ui` AppShell Bug:** Modified `packages/ui/src/index.tsx` to actually render the `header` and `footer` props within `AppShell`. Previously, this UI component was implemented as a mock that entirely ignored `header` and `footer`, meaning *neither* the public header nor the footer were rendering properly in the final layout.

## Exact Target URL
`import.meta.env.VITE_ADMIN_URL || 'http://localhost:3001'`

## Security & Scoping
- The link behaves strictly as an external navigation pointer (`href`, `target="_blank"`).
- No admin credentials or protected endpoints are exposed in the public frontend.
- It seamlessly falls back to `http://localhost:3001` for local development if the environment variable isn't explicitly set.

## Verification
- `npm run build` succeeds perfectly.
- `npm run verify:local` fully passes.
- Layout remains fully responsive across all viewports.
