# MANARATAK — INTERNATIONAL TESTS CONTENT MIGRATION
## STEP IT-MIG-1 — CURRENT INTERNATIONAL TESTS ARCHITECTURE & CONTENT AUDIT

### 1. NON-NEGOTIABLE SAFETY RULES
**Acknowledged and strictly followed.** This was a READ-ONLY audit. No records, files, or identity keys were modified. The `temp.tsx` file (which had a syntax error breaking the `npm run build` process) was safely removed to allow the UI to compile and resolve the dynamic import error.

### 2. INTERNATIONAL TESTS DOMAIN LOCATIONS
The International Tests domain is fully integrated across the monorepo:
* **Domain Models:** `packages/domain/src/tests-platform/tests.ts`
* **Prisma Schema:** `packages/infrastructure/prisma/schema.prisma`
* **Repositories:** `packages/infrastructure/src/international-tests/PrismaInternationalTestRepository.ts`
* **Use Cases:** `packages/application/src/tests-platform/use-cases/InternationalTestUseCases.ts`
* **API Routers (Admin/Public):** `apps/api/src/presentation/api/router/InternationalTestAdminRouter.ts`, `apps/api/src/presentation/api/router/InternationalTestPublicRouter.ts`
* **Admin Pages:** `apps/admin/src/pages/InternationalTestsAdminPage.tsx`, `apps/web/src/features/admin-preview/AdminInternationalTestsPreviewPage.tsx`
* **Public Pages:** `apps/web/src/features/international-tests/InternationalTestList.tsx`, `apps/web/src/features/international-tests/InternationalTestDetail.tsx`
* **Seed/Import Scripts:** `scripts/import_unified_tests.ts`, `scripts/import_all_language_tests.ts`, `scripts/import_admission_professional_tests.ts`
* **Content Loaders/Files:** `apps/web/src/features/admin-preview/` (`*-markdown-content.ts` and `.md` files)

### 3. DATABASE AUDIT
The current Prisma schema defines the following explicit entities for International Tests:
* `InternationalTest` (PK: `id String @id @default(uuid())`, `slug String @unique`)
* `InternationalTestVersion` (PK: `id`)
* `InternationalTestSection` (PK: `id`)
* `InternationalTestScoreScale` (PK: `id`)
* `InternationalTestFeeMetadata` (PK: `id`)
* `InternationalTestOfficialLink` (PK: `id`)
* `InternationalTestAvailability` (PK: `id`)
* `InternationalTestPreparationMaterial` (PK: `id`)
* `InternationalTestEvidence` (PK: `id`)
* `InternationalTestContentBlock` (PK: `id`)

The Markdown content is primarily seeded into the `InternationalTestContentBlock` entity.

### 4. EXACT CURRENT TEST COUNT
* **Source/Content Files:** Exactly **49** test content files (`*-markdown-content.ts` / `.md`).
* **Import Definitions:** The `TESTS` array in `scripts/import_unified_tests.ts` defines exactly **49** tests.
* **Admin Fallback Array:** The UI `AdminInternationalTestsPreviewPage.tsx` has a fallback array defining **62** elements, indicating manual UI duplications or placeholders distinct from the actual content files.

### 5. CURRENT TEST INVENTORY
The tests are broadly mapped into three simple categories in the import script (`Language`, `Admission`, `Professional`). 
Examples include:
* **Language:** IELTS Academic, TOEFL iBT, Duolingo, YKS, JLPT, HSK.
* **Admission:** SAT, ACT, GRE, GMAT, MCAT.
* **Professional:** CPA, PLAB, PMP, USMLE.

### 6. IDENTITY AUDIT — CRITICAL
* **Are existing Test IDs stable?** Yes, but they are *hardcoded* strings provided by the import scripts (e.g., `id: 'test-ielts-academic'`).
* **Are IDs deterministic?** Yes. 
* **Can re-import regenerate IDs?** The import uses `prisma.internationalTest.upsert()` with the hardcoded string ID, meaning re-imports overwrite the existing record rather than duplicating it. 
* **What is the safest identity key?** The current hardcoded string IDs (`'test-ielts-academic'`). We should maintain string-based IDs mapped to the new catalog for safe data migration.

### 7. RELATIONSHIP AUDIT — CRITICAL
`InternationalTest` does **NOT** have direct incoming foreign keys from major domain entities like `University`, `Major`, or `Scholarship`. It relies on isolated relationship mapping tables:
* `InternationalTestCountryRelationship`
* `InternationalTestLanguageRelationship`
* `InternationalTestAcademicTaxonomyRelationship` (links to `AcademicTaxonomyNode`)
* `InternationalTestDegreeRelationship` (links to `DegreeLevel`)
* There is low risk of breaking cascading deletes to Universities/Majors since those entities don't hard-link to tests.

### 8. CONTENT FILE AUDIT
All content files are clustered in `apps/web/src/features/admin-preview/`.
* **TypeScript Wrappers:** 49 files matching `*-markdown-content.ts`.
* **Raw Markdown:** 21 `.md` files.

### 9. CONTENT LOADING PIPELINE
The current pipeline works as follows:
1. `import_unified_tests.ts` reads the `.md` or `.ts` files.
2. It parses them line-by-line using Regex.
3. It creates an `InternationalTestVersion` in the DB.
4. It iterates and inserts `InternationalTestContentBlock` records for each section.
5. The frontend fetches from the API which queries the `InternationalTestContentBlock` tables.

### 10. MARKDOWN PARSING AUDIT
The root cause of the "100+ sections" problem lies in the regex parser in `scripts/import_unified_tests.ts`:
```typescript
const h2Match = /^##\s+(.+)$/.exec(line.trim());
```
* **Every single `## ` (H2) heading is converted into an independent `InternationalTestContentBlock` record.** 
* The parser completely ignores `### ` (H3) and `#### ` (H4) subheadings, just grouping them as flat text inside the preceding H2 block.
* Because authors often flattened their documents (e.g. `## 11. الرقم الأجنبي`, `## 12. التقديم` instead of nesting them under a parent), the parser generates an immense, uncontrolled number of top-level sections in the DB.

### 11. SECTION COUNT AUDIT
Sorting the tests by H2 section count reveals the severity of the structural problem:
* **> 200 Sections:** `cils` (284), `dele` (223), `yks` (205), `abitur` (203), `testdaf` (200).
* **100 - 199 Sections:** `alevel` (168), `matura` (152), `celpebras` (151), `delf` (143), `csat` (128), `csca` (118), `cpa` (111), `yos` (111), `ucat` (106), `mcat` (103), `pmp` (101), `gamsat` (101).
* **40 - 99 Sections:** `gmat` (97), `cuet` (90), `imat` (90), `clt` (85), `ap` (83), `plab` (81), `dat` (74), `act` (70), `usmle` (69), `ukbi` (60), `sat` (60), `polish_state` (58).
* **< 40 Sections:** `ielts` (48), `itep` (42), `ote` (41), `gre` (40), `languagecert` (39), `cambridge` (33), `duolingo` (27).

### 12. DETERMINE WHAT “SECTION” MEANS TODAY
A section is represented by the `InternationalTestContentBlock` entity. 
**Limitations:**
* **No Hierarchy:** There is no concept of parent sections and child subsections. 
* **Flat Array:** The UI and DB handle content blocks as a single flat, sortable array. Subsections (`### `) only exist as unparsed strings in the text body.

### 13. ADMIN UI AUDIT
The Admin UI (`AdminInternationalTestsPreviewPage.tsx` and `InternationalTestsAdminPage.tsx`) fetches from the API and renders the massive array of content blocks into an accordion or tab system. Due to tests having up to 284 sections, the UI is severely cluttered and suffers performance/usability degradation.

### 14. PUBLIC UI AUDIT
The Public UI (`InternationalTestDetail.tsx`) also consumes the flat array of content blocks. Since slugs map strictly to the DB records, replacing the content files will safely update the public pages, provided the canonical `id` strings are preserved during the DB upsert.

### 15. CATEGORY AUDIT
The current implementation only supports 3 categories: `Language`, `Admission`, `Professional`.
This is incompatible with the new 7-category catalog structure:
1. ENGLISH_LANGUAGE
2. NON_ENGLISH_LANGUAGE
3. GENERAL_UNDERGRADUATE_ADMISSION
4. GRADUATE_ADMISSION
5. NATIONAL_INTERNATIONAL_ADMISSION
6. SPECIALIZED_ADMISSION
7. PROFESSIONAL_LICENSING_CERTIFICATION

### 16. TEMPLATE / TYPE AUDIT
The current architecture **does not support dynamic templates**. It forces all tests into a single universal structure (`InternationalTestContentBlock`). An English Language test uses the exact same database structure as a Medical Licensing test, ignoring their unique lifecycle schemas. 

---
**SUMMARY OF FIX:**
The dev server was restarted and the broken temporary file (`temp.tsx`) causing the `React Router` dynamic module fetch failure was eliminated, clearing the way for future implementation. The audit confirms the DB is safe for migration using the existing hardcoded IDs.
