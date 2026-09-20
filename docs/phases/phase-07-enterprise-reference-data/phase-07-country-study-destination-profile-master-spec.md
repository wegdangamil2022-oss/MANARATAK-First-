# Country Study Destination Profile Master Specification

## 1. Purpose
The Country Study Destination Profile is a rich, student-facing aggregation of educational, financial, and logistical data tailored to a specific country. It serves as a comprehensive hub for prospective students to explore a country as a study destination.

## 2. Ownership Boundaries
- **Phase 07 (Reference Data):** Owns the canonical country, currency, language, and city identities.
- **Phase 10 (Major Platform):** Owns the recommended majors for the destination.
- **Phase 11 (Universities & Institutions):** Owns the universities, campuses, and academic programs located in the country.
- **Phase 12 (Scholarships):** Owns the scholarships available in the country.
- **Phase 16 (Enterprise CMS):** Owns editorial content for visa guidance, cost of living, student life, official links, and localized study guidance.
- **Phase 23 (Enterprise Administration Portal):** Owns the admin management workflow, content selectors, completeness status, and public preview configuration.
- **Phase 24 (Enterprise Public Platform):** Owns the public rendering and student-facing UI for the destination page.

## 3. Profile Sections
- Overview
- Reference Data (Identity, ISO codes, currencies, languages)
- Universities (Top institutions, campuses)
- Majors (Recommended/Best programs)
- Scholarships (Available funding)
- Visa & Requirements (Immigration guidance)
- Cost of Living (Financial estimates)
- Student Life (Cultural and social information)
- Official Links (Government and education portals)
- Public Preview / SEO (Search engine optimization and public rendering check)

## 4. Data Source Map
- **Overview:** Aggregation of Phase 07, Phase 16, and dynamic counts.
- **Reference Data:** `ReferenceCountry`, `ReferenceCurrency`, `ReferenceLanguage`, `ReferenceCity` (Phase 07).
- **Universities:** `University` entity records filtered by country (Phase 11).
- **Majors:** `Major` entity records categorized by country context (Phase 10).
- **Scholarships:** `Scholarship` entity records available in the country (Phase 12).
- **Visa & Requirements:** CMS Articles/Content blocks tagged for the country (Phase 16).
- **Cost of Living:** CMS Financial Estimates (Phase 16).
- **Student Life:** CMS Articles (Phase 16).
- **Official Links:** CMS Link Collections (Phase 16).

## 5. Completeness States
A Country Study Destination Profile progresses through the following completeness states:
- `REFERENCE_READY`: Core identity established in Phase 07.
- `UNIVERSITIES_PENDING`: Waiting for Phase 11 linkage.
- `MAJORS_PENDING`: Waiting for Phase 10 linkage.
- `SCHOLARSHIPS_PENDING`: Waiting for Phase 12 linkage.
- `CMS_PENDING`: Waiting for Phase 16 editorial content (Visa, Cost of Living, etc.).
- `READY_FOR_REVIEW`: All required cross-phase data is linked and pending admin approval.
- `PUBLISHED`: Approved and visible on the public platform.

## 6. Admin Shell Behavior
- The current Phase 07 admin shell provides structure with placeholders only.
- No fake data or mock entries are used.
- No cross-phase API calls are made until the respective owning phases are implemented.
- The UI explicitly indicates pending states for future integrations.

## 7. Public Page Behavior
- The public student-facing page will exclusively render `PUBLISHED` or approved data.
- Staged, imported, unreviewed, or incomplete records will not be displayed.
- Dependent data (e.g., a university in draft state) will be filtered out even if the country profile is published.

## 8. Future Implementation Sequence
- **Phase 10:** Majors integration (Recommended programs).
- **Phase 11:** Universities integration (Institutions listing).
- **Phase 12:** Scholarships integration (Funding options).
- **Phase 16:** CMS integration (Visa, Living, Editorial content).
- **Phase 23:** Full management workflow (Selectors, Overview editor, State transitions).
- **Phase 24:** Public page rendering (`/study-destinations/:countrySlug`).
