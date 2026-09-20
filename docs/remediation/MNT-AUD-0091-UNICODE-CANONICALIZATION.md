# MNT-AUD-0091 — Unicode/Arabic canonicalization remediation

Status: **SOURCE_VERIFIED / DATABASE_BACKFILL_PENDING**.

## Canonical identity authority

Services and Careers share `packages/application/src/canonicalization/UnicodeCanonicalization.ts` and `OwnerDomainIdentityPolicies.ts`.

Rules are explicit: NFKC, Unicode lower-case, whitespace collapse, Arabic tatweel/diacritics removal, Alef variants (`أ/إ/آ/ٱ`) to `ا`, `ى` to `ي`, and Arabic/Persian digits to ASCII. Unicode letters and numbers are retained. `ة`, `ؤ`, and `ئ` are intentionally not collapsed.

Dedup identity and public URL presentation are separate. `publicId` remains the stable identity. Slugs preserve Unicode letters/numbers and are not used as the dedup key.

## Existing-data remediation

Run read-only first:

```bash
npm run data:canonicalization:plan
```

The plan scans Services, Career Employers and Career Jobs, reports empty/degenerate canonical values, fallback-only slugs, and proposed dedup/slug collisions. No database mutation occurs in plan mode.

Apply is blocked when any collision or empty canonical identity exists and requires the governed database mutation gate:

```bash
npm run data:canonicalization:apply
```

Apply uses two-phase temporary keys so a collision-free re-key cannot fail because another row still holds an old unique key. Existing non-fallback slugs are preserved to protect deep links; only historical `service-<hash>` / `career-<hash>` fallback slugs are rewritten unless `--preserve-fallback-slugs` is selected.

No production/staging database has been changed by this source remediation.
