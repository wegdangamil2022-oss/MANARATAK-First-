# P7 Canonical Reference Upstream Closure — 2026-09-03

## Scope
This repair implements the P7 slice required by `MANARATAK_Source_Closure_Repair_Plan_v1.0_2026-09-03`: Country, Administrative Region, City, Language, and Currency remain owned by Phase 07 and expose stable canonical internal identities for downstream relationships.

## Changes
- Country, Currency, Language, City, and Administrative Region read DTOs now expose a stable `id` as a required read-side identity where the persistence layer already guarantees one.
- `AdministrativeRegion` and `ReferenceCity` now have nullable `countryReferenceId` relations to `ReferenceCountry` while retaining `countryIso2Code` for standard-code lookup, source compatibility, provenance, and staged migration safety.
- City writes resolve the active canonical Country before persistence and pass its internal ID to the repository.
- Seed application uses the same canonical Country identity path.
- Repository persistence rejects a supplied canonical Country ID when it conflicts with the ISO2 source key.
- Public web contracts expose the stable Country/City IDs already returned by the API.
- A source migration backfills the new canonical country links; it is not auto-applied and remains subject to the repository's normal DB remediation gate.

## Non-goals / compatibility
- No existing `countryIso2Code` field was removed.
- No downstream P8–P12 ownership was moved into P7.
- No Country Study Destination enrichment was moved into P7.
- No lifecycle/alias feature outside the repair-plan P7 requirement was invented.
- No migration was executed against a live database.

## Verification
- Existing W3 source verifier must continue to pass.
- `npm run phase7:plan:verify` checks the new canonical-ID/FK invariants.
- Full TypeScript/build/test verification remains required when dependency installation/runtime is available.

## Closure classification
`P7_SOURCE_REPAIR_COMPLETE_DB_MIGRATION_PENDING_GATE`
