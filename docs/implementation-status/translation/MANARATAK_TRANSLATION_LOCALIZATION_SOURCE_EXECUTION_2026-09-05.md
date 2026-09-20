# MANARATAK 2.0 — Translation & Localization Source Execution

**Date:** 2026-09-05  
**Mode:** SOURCE-ONLY / DATABASE OFFLINE  
**State:** `SOURCE_IMPLEMENTATION_ADVANCED / PUBLIC_TEMPLATE_COPY_MIGRATION_PENDING / RUNTIME_DB_PROOF_PENDING`

## 1. Executive decision

MANARATAK uses one canonical identity per entity and language-specific presentation overlays. A translation must never create a second University, Major, Scholarship, Course, Test, City, Country, or other canonical record merely because its name is different in Arabic or English.

The active languages remain:

- Arabic (`ar`) — default and RTL.
- English (`en`) — secondary and LTR.

The source architecture keeps IDs, relationships, URLs, currencies, numeric values, dates, degree codes, taxonomy IDs, and other structural values language-independent. Only human-facing presentation fields are localized or formatted for locale.

## 2. Publication and routing policy

The localization contract follows the established international pattern already present in the project:

1. Localized public URLs use a locale segment such as `/ar/...` and `/en/...`.
2. The document `lang` and `dir` follow the active locale.
3. SEO emits locale-aware canonical and alternate (`hreflang`) links, with Arabic as `x-default` while Arabic remains the default product language.
4. The user must be able to select language explicitly; language selection is not inferred as a destructive canonical-data change.
5. A public page must not be activated in English while its presentation copy is still substantially Arabic. Mixed-language publication is fail-closed.
6. Fallback is allowed for safe display continuity, but fallback availability is explicit and must not be mistaken for completed translation coverage.

## 3. Translation ownership matrix

| Domain | Current source model | Source action in this execution | Runtime / DB action later |
|---|---|---|---|
| Reference data / geography | Bilingual fields + application projection | Surfaced in Translation Center and retained as canonical bilingual reference data | Runtime coverage/reconciliation proof |
| Universities | Normalized translation records | Existing normalized model retained; admin translation workspace improved | Persistence + review-state proof on live DB |
| Majors | Explicit AR/EN localized name fields | Existing fields retained and exposed in unified workspace | Runtime coverage proof |
| International tests | Explicit AR/EN localized name fields | Existing fields retained and exposed in unified workspace | Runtime coverage proof |
| Scholarships | Legacy `localizedNames` compatibility overlay | Public API now projects requested locale and admin can review AR/EN without duplicating scholarship identity | Design controlled normalized translation migration/backfill before compatibility removal |
| Courses | Legacy `localizedNames` compatibility overlay | Public API and relationship-filtered lists now project requested locale; alternate-language carrier is stripped from public responses | Design controlled normalized translation migration/backfill before compatibility removal |
| CMS / guides | Locale-owned CMS content | Translation Center links editorial localization to CMS owner workspace | Runtime publication workflow proof |
| Website UI / navigation | Source dictionaries + remaining hardcoded presentation copy | Source dictionaries, locale routing, typography, colors, API locale propagation and fail-closed English rule retained | Complete public-template copy extraction/translation, then activate English presentation |

## 4. Source implementation completed in this execution

### Admin control plane

- Replaced the old translation workspace with a unified **Translation & Localization Center**.
- Ordered primary data domains as Scholarships → Universities → Majors → International Tests → Courses.
- Added clear ownership cards for CMS, Reference & Geography, and Website UI & Navigation.
- Fixed the Arabic label that previously rendered as an unsuitable literal equivalent of “translated payload”; the user-facing section is now **الترجمات / إدارة الترجمات**.
- Added AR/EN coverage counters, missing-language filters, source-locale visibility, storage-mode visibility, record search, and side-by-side locale editing.
- Reorganized the admin navigation into functional groups: Overview, Academic Content, Localization & Editorial, Operations, Platform, Governance.
- Applied the approved MANARATAK palette and consistent Cairo/Noto Sans Arabic typography to admin shell and translation workspace.

### Public localization

- Scholarship list/detail APIs now accept a validated locale and project localized display names.
- Course list/detail APIs now accept a validated locale and project localized display names.
- Relationship-filtered course results now retain localization input internally, project the requested locale, then strip alternate-language carriers before returning public payloads.
- The web API client now derives locale from the `/ar` or `/en` route/document language and carries it to Scholarship/Course requests.
- Scholarship and Course React features now reload localized data when the active language changes.
- Existing University, Major, International Test, reference-data, route, SEO, RTL/LTR, and locale-fallback architecture is preserved rather than duplicated.

### Branding and typography

The active shared UI direction is:

- Navy: `#142B5F`
- Teal: `#0E7C86`
- Digital cyan: `#21A7B4`
- Gold: `#D6A43B`
- Light gold: `#F2CD78`
- Ivory background: `#FAF7F0`
- Knowledge mist: `#DDEFF2`
- Dark text: `#203442`
- Arabic-first family: Cairo, with Noto Sans Arabic and system fallbacks.

No new competing color system or second i18n framework was introduced.

## 5. Public-template English activation gate

The current student/public template contains substantial Arabic presentation copy directly inside TSX components. Activating the English route against those components now would produce mixed Arabic/English pages and would falsely report localization completion.

Therefore the source deliberately keeps the public template **fail-closed to Arabic** until presentation-copy parity is complete. The readiness report is generated with:

```bash
node scripts/report-public-template-localization-readiness.mjs
```

The remaining UI-copy migration is a source task, not a database task:

1. Extract hardcoded public-template copy into semantic dictionary keys.
2. Translate the global shell first: header, navigation, search, authentication entry points, loading/empty/error states, footer and accessibility labels.
3. Translate domain pages and dialogs in dependency order.
4. Verify AR/EN dictionary parity and zero raw-key leakage.
5. Run visual QA in RTL and LTR; prohibit mixed-language pages.
6. Only then remove the Arabic-only activation lock and expose the full English presentation.

## 6. Database and runtime boundary

This execution intentionally performed **no database operation**.

```text
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
CLOUD_SQL_MUTATIONS = 0
BACKFILLS_EXECUTED = 0
BULK_IMPORTS_EXECUTED = 0
PRISMA_DB_PULL = 0
PROTECTED_CANONICAL_IDS_REGENERATED = 0
```

When Runtime is restored, the controlled order is:

1. Verify environment identity and backup/recovery evidence.
2. Verify existing translation persistence and source-locale data.
3. Measure AR/EN coverage by domain.
4. Design additive normalized translation storage for Scholarship/Course if still required.
5. Backfill from legacy `localizedNames` with reconciliation and zero identity regeneration.
6. Run dual-read/compatibility proof if migration requires it.
7. Verify Admin save → DB → API → Public projection in both locales.
8. Enforce publication completeness rules only after evidence exists.
9. Remove compatibility storage only after reconciliation proves no translated values are lost.

## 7. Quality gates

The translation source quality gate validates:

- AR/EN dictionary key parity.
- no blank dictionary values.
- no missing literal `t()` keys.
- locale-driven `lang` and `dir`.
- shared locale/fallback contracts.
- locale-aware Scholarship/Course projection.
- alternate-language payload stripping.
- unified Translation Center ownership.
- fail-closed public English activation while hardcoded Arabic presentation copy remains.
- locale-aware SEO alternates.
- source-only environment safeguards.

Run it with database mutation explicitly disabled.

## 8. Closure status

This execution **does not declare the entire Translation phase closed**, because two evidence classes are still unavailable:

- complete English presentation-copy parity in the new public template;
- live DB/Runtime persistence, migration, backfill, reconciliation, and publication evidence.

What is closed at source level is the localization architecture direction, admin ownership model, AR/EN route/SEO contract, and locale propagation for the previously incomplete Scholarship/Course public flows.

## 9. Infrastructure-only continuation directive

A later project-owner directive narrowed the current work package further:

> Prepare localization infrastructure only. Do not translate Scholarships, Universities, Majors, International Tests, Courses, CMS content, or other domain records in this cycle.

The source now enforces that directive through a central localization policy:

```text
TRANSLATION_CONTENT_MODE = INFRASTRUCTURE_ONLY
CONTENT_TRANSLATION_WRITES = DISABLED
DOMAIN_TRANSLATION_SEEDING = DISABLED
DATABASE_TRANSLATION_MUTATIONS = DISABLED
```

The policy registry covers Scholarships, Universities, Majors, International Tests, Courses, CMS, Reference Data, and Website UI. It records ownership, storage mode, Runtime/Migration requirements, supported locales, and the invariant that canonical identity is immutable.

The Admin Translation Center remains useful for architecture inspection and coverage visibility, but its locale editors are read-only and Save actions are disabled while `INFRASTRUCTURE_ONLY` is active. This prevents accidental content translation or persistence while preserving the UI and API contracts needed for a future explicitly approved content-localization phase.

The remaining work in the current cycle is therefore limited to:

- locale contracts and routing;
- RTL/LTR and document language behavior;
- fallback and missing-translation semantics;
- SEO alternate-language contracts;
- translation ownership and storage policy;
- source dictionary structure and parity gates;
- Admin information architecture and coverage tooling;
- API locale propagation and localized projection infrastructure;
- source-only tests and quality gates;
- Runtime/Migration plans without applying database changes.

No translation text is to be authored, imported, seeded, backfilled, or applied to canonical domain data as part of this source cycle.

## 10. Infrastructure-only source closure hardening

The infrastructure-only directive is now enforced at **both presentation and Application boundaries**.

The Translation Center remains read-only, and direct API/Application mutation paths are also fail-closed for translation-specific fields:

- University normalized translation upsert is blocked.
- University compatibility `localizedNames` writes are blocked.
- Major `localizedNameAr` / `localizedNameEn` and compatibility localized-name writes are blocked.
- International Test AR/EN localized-name writes are blocked.
- Course `localizedNames` / `titleEn` compatibility translation carriers are blocked.
- Scholarship `localizedNames` compatibility writes are blocked.
- Generic Localization create/update/activate/deprecate/archive mutations are blocked while list/read remains available.

This guard is intentionally field-level for domain authoring APIs. Normal canonical maintenance remains possible; only translation-content mutation is denied by the localization policy.

Current source closure contract:

```text
TRANSLATION_INFRASTRUCTURE = SOURCE_CLOSED
TRANSLATION_CONTENT_AUTHORING = DISABLED
TRANSLATION_CONTENT_IMPORT = DISABLED
TRANSLATION_CONTENT_SEEDING = DISABLED
PUBLIC_ENGLISH_ACTIVATION = BLOCKED_UNTIL_UI_COPY_PARITY
DATABASE_CONNECTED = NO
MIGRATIONS_APPLIED = 0
BACKFILLS_EXECUTED = 0
CLOUD_SQL_MUTATIONS = 0
```

Runtime work remains deferred until the real Development/Remediation database is intentionally reactivated under the existing backup/recovery and migration gates.
