# Sections 01–03 evidence — 2026-10-12

Matrix commit: `3b7c055ca1d42b9fed245f4787bc7f15ac2ca5db`; final picker correction source commit: `7081fb0360751f2c4e106dca4888ceffe1b25000`. Final tests use Node22.16.0. Database records are synthetic in a newly created local container; browser HTTP is intercepted. No production claim.

[Commands and environment](commands.json), [review/result register](../../SECTIONS_01_03_VERIFICATION_2026-10-12.md), and three requirement reports provide acceptance limits.

`final-node22-*` are final matching-source evidence. Other logs include historical failed attempts and scoped corrections; do not sum them or treat failures/skips as passes. The 39 skipped database cases in the final source unit run pass separately in `final-node22-postgres-eap.log`.

`diagnostic-browser01-invalidated.log` is explicitly INVALIDATED despite its old embedded PASS. Its corrected final result is `final-node22-browser01.log` on7081fb03. Commands record exact commits; unaffected 3b7c055c results were not rerun.
