# Public design import — 2026-09-14

Source: user-supplied remix-manaratal-final.zip. Import only the Public Web design;
do not copy its frontend-only root configuration, partial packages, Admin application,
preview entrypoint, or global mock API. The floating demo/Admin switcher from that
entrypoint is intentionally absent.

Preserve the runtime monorepo, existing source safeguards, and canonical ID navigation.
Static inline styles are represented by CSS-backed attributes for the existing CSP.
The supplied circular logo is kept byte-for-byte as brand/manaratak-logo.png
(SHA-256 a1ad2bedd8cacbdb05a3c6b883edd0f4460112f658f69d9595c8324af1b6aef2).
The previous official logo remains unchanged; the source guard validates both assets.
Unused poster images from the archive are not imported.

Public fixture datasets remain available as a template. Google AI Studio's isolated
development preview defaults to prototype data only when no external VITE_API_URL
and no explicit data-mode choice is configured. Configuring an API selects live data;
there is no network-error fallback to fixtures. Production builds retain their
existing prohibition on prototype data. Admin, API, database and secrets are unchanged.
