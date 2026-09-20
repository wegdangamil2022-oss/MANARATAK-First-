# MANARATAK 2.0: Phase 24.4 Public Page Detail Requirements Baseline

**Document ID:** PHASE-24-04-PUBLIC-PAGE-DESIGN-BASELINE  
**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING  
**Phase:** 24  
**Domain:** Enterprise Public Platform  
**Artifact:** Public Page Design Requirements Baseline  
**Scope:** Public page composition, routing, SEO layout, detail-page structure, listing/comparison presentation, and visitor-facing UI requirements  
**Authority:** Roadmap v6.0, Phase 24 ownership boundary, Phase 24.4 page design baseline  
**Purpose:** Define what appears on public detail pages and where each piece of data comes from.


---

> **W7 source-rebaseline notice (2026-09-07):** This specification is source-rebaselined under `MNT-AUD-0045` against the remediated owner APIs, Admin/Public composition, source tests and cross-phase traceability. This status is not runtime or production certification; external DB/provider/deployment/browser evidence remains `RUNTIME_EVIDENCE_PENDING`. See `docs/remediation/P23_P24_REBASELINE_TRACEABILITY.md`.

### Navigation
[<- Phase 24: Public Pages & User Experience (Part C)](./phase-24-03-enterprise-public-platform-public-pages-user-experience.md) | [Roadmap Completion]

---

## 1. Governance Notice

> **IMPORTANT:**
> - This document does **not** add a new phase.
> - This document does **not** override Phase 07-23 domain ownership.
> - This document does **not** modify Phase 12 scholarship architecture.
> - This document only centralizes public page presentation requirements for Phase 24.
> - All pages consume read-model DTOs from their respective domain owners.

---

## 2. Page Ownership Rules

- **Phase 24** owns public layout, composition, SEO, routing (including public multilingual URL routing such as `/ar/courses`, `/en/courses`, `/ar/scholarships`, `/en/scholarships`, `/ar/universities`, `/en/universities`), visitor-facing presentation, and related-content placement.
- **Phase 24** does NOT own domain data, private workspace state, admin workflows, AI execution, payments, imports, files, or business validation.
- **Phase 16** owns editorial/long-form copy.
- **Phase 05** (EAP) owns physical media/assets via `AssetId` / `AssetReference`.

---

## 3. Scholarship Detail Page Requirements

The Scholarship Detail Page is composed by Phase 24 using read-models supplied primarily by Phase 12.

### 3.1 Hero Section
- **scholarshipName:** Primary title.
- **sponsor / provider:** The organization offering the scholarship.
- **studyCountry:** The country where the studies will take place.
- **applicationDeadline:** Key deadline for applications.
- **fundingCoverage:** High-level summary of funding (e.g., Full, Partial).
- **completeness status:** Internal/metadata badge indicating data quality (if applicable).

### 3.2 Funding Section
- **Full or partial funding:** Explicit badge or indicator.
- **What the scholarship covers:** Breakdown of covered items (tuition, stipends, flights, etc.).
- **Award tiers if available:** Display of distinct funding levels.
- **Currency / funding amount where available:** Explicit financial figures.

### 3.3 Eligibility Section
- **eligibilityCriteria:** Detailed textual criteria.
- **Target nationality / country rules if available:** Specific citizenship requirements.
- **degreeLevel:** Academic level (Bachelor, Master, PhD, etc.).
- **eligibleMajorsOrFields:** Allowed academic disciplines.
- **Test/language requirements if available:** Required IELTS, TOEFL, SAT, etc., scores.

### 3.4 Required Documents Section
- **requiredDocuments:** List of necessary application materials.
- **Document notes:** Specific guidance on formatting or translation.
- **Missing document warnings if applicable:** Indicators for conditionally required items.

### 3.5 Application Section
- **applicationLink:** Direct link for applying.
- **officialSourceUrl:** The canonical provider source URL.
- **Application method:** "External" or "Internal".
- **External/internal application note:** Guidance text for the user based on method.
- **Apply button behavior:** Transitions the user to the downstream application workflow phase (Internal) or redirects to the official URL (External).

### 3.6 Academic Fit Section
- **Related majors:** Navigational links to associated major pages.
- **Related universities:** Navigational links to eligible institutions.
- **Related programs if available:** Specific degree programs linked to the scholarship.

### 3.7 Trust and Verification Section
- **Last verified date:** Timestamp of the last manual or automated review.
- **Source trust level:** Indicator of origin reliability (Official API, Partner, Aggregator, Scraped).
- **Imported/completeness status:** Indicates if the record was auto-imported and its current completeness state.
- **Missing-data warning if needed:** Clear UI indication when key fields are not yet known.

### 3.8 Related Content
- **Similar scholarships:** Algorithmic or thematic matches.
- **Study country page:** Link to the relevant Phase 07/16 destination guide.
- **University page:** Link to the host institution(s).
- **Major page:** Link to the eligible disciplines.
- **Relevant CMS guides/articles:** Contextual editorial content supplied by Phase 16.

### 3.9 Empty and Incomplete States
- **Missing deadline:** UI placeholder explaining that the deadline is not yet announced.
- **Missing application link:** UI handling for upcoming cycles.
- **Missing documents:** Safe fallback text.
- **Incomplete funding details:** Display "Funding details pending".
- **NeedsReview / Incomplete / ReadyToPublish / Published states:** Ensures only `Published` scholarships are fully visible, while others might be hidden or displayed with explicit draft badges depending on admin context.

### 3.10 Data Source Mapping
- **Phase 12:** Owns scholarship structured data.
- **Phase 11:** Owns universities.
- **Phase 10:** Owns majors.
- **Phase 08:** Owns degree levels / academic taxonomy.
- **Phase 07:** Owns country/currency/reference data.
- **Phase 16:** Owns editorial guides.
- **Phase 24:** Owns public composition.

---

## 4. Public Page Detail Requirements

### 4.1 University Detail Page Requirements

#### 4.1.1 Page Purpose
The University Detail Page helps visitors evaluate a university using structured read-models provided by Phase 11 and related phases. Phase 24 composes the public page layout, ensuring a unified visitor experience without taking ownership of the underlying domain data.

#### 4.1.2 Hero Section
- **Official university name**
- **Localized name** (if available)
- **Logo** (via `AssetId` / `AssetReference`)
- **Country**
- **Primary city/location**
- **Institution type**
- **Official website link**
- **Accreditation status** (if available)
- **Source/completeness badge** (if needed for trust context)

#### 4.1.3 Overview Section
- **Short overview**
- **Established year**
- **Institution profile summary**
- **Official source link**
- **Last verified date**
- **Editorial intro** (if available from Phase 16)

#### 4.1.4 Campuses and Locations Section
- **Main campus**
- **Branch campuses**
- **City/country references**
- **Map-ready location metadata** (if available)
- **Campus facilities summary** (if available)

#### 4.1.5 Academic Programs Section
- **Academic programs offered**
- **Faculties/colleges**
- **Departments**
- **Degree levels offered**
- **Study languages**
- **Related majors** (from Phase 10)
- **Academic taxonomy references** (from Phase 08)

#### 4.1.6 Tuition and Fees Section
- **Tuition references** (from Phase 11)
- **Currency references** (from Phase 07)
- **Optional financial estimate display** (through Phase 19 if needed)
- **Disclaimer:** Phase 24 does not calculate or own tuition logic; it displays source data.

#### 4.1.7 Admission Requirements Section
- **Admission metadata** (from Phase 11)
- **Required tests** (from Phase 09)
- **Study language requirements**
- **Required documents**
- **Application deadlines**
- **Application URLs**
- **Official admissions source links**

#### 4.1.8 Scholarships Section
- **Scholarships linked to the university** (from Phase 12)
- **Funding coverage summary**
- **Scholarship deadlines**
- **Scholarship detail page links**
- **Disclaimer:** Phase 12 owns scholarship rules and eligibility.

#### 4.1.9 Accreditation and Rankings Section
- **Accreditation metadata**
- **Ranking data**
- **Government/authority references** (if available)
- **Trust/source labels**

#### 4.1.10 Student Life and Services Section
- **Housing**
- **Student services**
- **Facilities**
- **Campus life summary**
- **Editorial copy** (from Phase 16 when available)

#### 4.1.11 Media and Assets Section
- **Logo**
- **Gallery**
- **Brochures**
- **Documents**
- **Asset Requirement:** All assets must be referenced via Phase 05 EAP using `AssetId` / `AssetReference`. No physical paths or raw storage URLs.

#### 4.1.12 Actions and Navigation Section
- **Visit official website**
- **View academic programs**
- **View scholarships**
- **View country page**
- **Compare university**
- **Save university** (if authenticated, delegated to Phase 15 workspace behavior)

#### 4.1.13 Related Content Section
- **Similar universities**
- **Related majors**
- **Related scholarships**
- **Country destination page**
- **CMS articles/guides** (from Phase 16)

#### 4.1.14 Empty, Incomplete, and Trust States
- **Missing tuition data:** Display safe fallback text.
- **Missing admission data:** Display safe fallback text.
- **Incomplete imported record:** Display warnings when key fields are not yet known.
- **Not yet verified:** UI handling for unverified data.
- **Source trust labels:** Indicate the origin reliability.
- **Hidden/unpublished behavior:** Ensure only `Published` university records are fully public. Non-published records should be hidden or shown with draft badges depending on admin context.

#### 4.1.15 Data Source Mapping
- **Phase 11:** Owns university structured data, campuses, programs, tuition source data, admissions metadata, accreditation, rankings, official URLs, import completeness, and publish readiness.
- **Phase 06:** Owns generic import mechanics only.
- **Phase 05:** Owns assets through EAP.
- **Phase 07:** Owns countries, cities, languages, currencies, and reference data.
- **Phase 08:** Owns academic taxonomy and degree levels.
- **Phase 09:** Owns tests and score requirements.
- **Phase 10:** Owns canonical majors.
- **Phase 12:** Owns scholarships.
- **Phase 15:** Owns authenticated save/collection behavior.
- **Phase 16:** Owns editorial guides and long-form copy.
- **Phase 19:** May provide financial estimates/currency conversions.
- **Phase 24:** Owns public composition only.

### 4.2 Country Destination Page Requirements

#### 4.2.1 Page Purpose
The Country Destination Page helps visitors understand studying in a specific country. Phase 24 composes the page only, using read-models and editorial content from official owner phases.

#### 4.2.2 Hero Section
- **Country name**
- **Localized country name** (if available)
- **Flag or country visual asset** (via `AssetId` / `AssetReference`)
- **Region**
- **Capital city**
- **Primary language(s)**
- **Currency**
- **Destination summary**
- **Source/completeness badge** (if needed)

#### 4.2.3 Study Overview Section
- **Why study in this country**
- **Education system summary**
- **Academic calendar summary** (if available)
- **Common study languages**
- **Popular degree levels**
- **Editorial intro** (from Phase 16)

#### 4.2.4 Visa and Immigration Guidance Section
- **Visa overview**
- **Student visa requirements**
- **Common required documents**
- **Application process summary**
- **Official government/embassy source links** (if available)
- **Disclaimer:** Phase 24 does not own legal/visa rules and only displays approved CMS/reference content.

#### 4.2.5 Cost of Living and Financial Estimate Section
- **Estimated living cost ranges**
- **Accommodation cost ranges**
- **Food/transport/insurance estimates** (if available)
- **Currency reference** (from Phase 07)
- **Optional conversion or estimate display** (through Phase 19)
- **Disclaimer:** Estimates are informational and Phase 24 does not own financial calculations.

#### 4.2.6 Universities in This Country Section
- **Top universities**
- **Featured universities**
- **All universities list**
- **City/campus filters**
- **Accreditation/ranking labels**
- **Links to University Detail Pages**
- **Disclaimer:** Phase 11 owns university records.

#### 4.2.7 Scholarships in This Country Section
- **Country-linked scholarships**
- **Funding coverage summary**
- **Deadline highlights**
- **Eligibility summary**
- **Links to Scholarship Detail Pages**
- **Disclaimer:** Phase 12 owns scholarship definitions, eligibility, and deadlines.

#### 4.2.8 Popular Majors and Study Fields Section
- **Popular majors in the country**
- **Related academic fields**
- **Employment or demand notes** (if available)
- **Links to Major Detail Pages**
- **Disclaimer:** Phase 10 owns majors and Phase 08 owns taxonomy/degree classifications.

#### 4.2.9 Student Life and Work While Studying Section
- **Housing**
- **Healthcare or insurance notes**
- **Transport**
- **Student work permissions** (if available)
- **Safety and culture notes**
- **Editorial copy** (from Phase 16)
- **Disclaimer:** Phase 24 does not own legal rules or official employment regulations.

#### 4.2.10 Services and Student Support Section
- **Country-specific student services**
- **Visa/document support services**
- **Translation services**
- **Application support services**
- **Links to service detail pages**
- **Disclaimer:** Phase 20 owns service catalog and fulfillment, while Phase 19 owns payments.

#### 4.2.11 Related Content Section
- **Related universities**
- **Related scholarships**
- **Related majors**
- **CMS articles/guides**
- **Nearby/similar countries**
- **Public comparison links** (if available)

#### 4.2.12 Empty, Incomplete, and Trust States
- **Missing visa data:** Safe fallback text.
- **Missing cost-of-living data:** Safe fallback text.
- **Incomplete university lists:** UI handling.
- **No scholarships available:** Safe fallback text.
- **Outdated source warning:** UI handling for unverified data.
- **Trust/source labels:** Indicate the origin reliability.
- **Fallback editorial placeholders:** UI handling for missing editorial content.
- **Hidden/unpublished behavior:** Only approved and published content should be fully public.

#### 4.2.13 Data Source Mapping
- **Phase 07:** Owns countries, cities, languages, currencies, timezones, regions, and reference codes.
- **Phase 16:** Owns editorial destination guides, visa guidance articles, study-abroad narratives, and long-form country content.
- **Phase 11:** Owns universities, campuses, programs, tuition source data, accreditation, rankings, and official university metadata.
- **Phase 12:** Owns scholarships and eligibility/deadline rules.
- **Phase 10:** Owns canonical majors.
- **Phase 08:** Owns academic taxonomy and degree levels.
- **Phase 05:** Owns country visuals, flags, maps, and media assets through EAP when stored as platform assets.
- **Phase 19:** May provide currency conversion or financial estimate displays.
- **Phase 20:** Owns country-related services and fulfillment.
- **Phase 24:** Owns public composition only.

### 4.3 Major Detail Page Requirements

#### 4.3.1 Page Purpose
The Major Detail Page helps visitors understand a study major, its academic structure, related universities, scholarships, courses, and career paths. Phase 24 composes the public page only using read-models and editorial content from official owner phases.

#### 4.3.2 Hero Section
- **Canonical major name**
- **Localized major name** (if available)
- **English/common aliases or synonyms** (if available)
- **Academic field/discipline**
- **Common degree levels**
- **Estimated study duration** (if available)
- **Short summary**
- **Source/completeness badge** (if needed)

#### 4.3.3 Overview Section
- **Simple explanation of the major**
- **Who this major is suitable for**
- **What the student will study**
- **Common misconceptions or notes** (if available)
- **Editorial intro** (from Phase 16 when available)

#### 4.3.4 Academic Classification Section
- **Academic field**
- **Discipline**
- **Taxonomy classification**
- **Degree-level mapping**
- **Related academic standards** (if available)
- **Disclaimer:** Phase 08 owns taxonomy and classifications while Phase 10 owns the canonical major.

#### 4.3.5 Core Subjects and Skills Section
- **Core subjects**
- **Common study modules**
- **Technical skills**
- **Soft skills**
- **Language or test prerequisites** (if available)
- **Source mapping:** Phase 10 / Phase 08, and Phase 16 for explanatory text.

#### 4.3.6 Major-to-Program Distinction and Universities Section
- **Major vs. Program:** A major is the canonical academic concept owned by Phase 10. A university program offering that major is owned by Phase 11. Phase 24 may display both together, but must not collapse their ownership.
- **Universities offering the major:** List of institutions.
- **Links to University Detail Pages.**

#### 4.3.7 Degree-Level Grouping and Filtering
- **Bachelor**
- **Master**
- **PhD**
- **Diploma / Certificate** (if applicable)
- **Other approved degree-level labels** (from Phase 08)
- **Disclaimer:** Degree-level ownership belongs to Phase 08, while Phase 24 only renders filters and grouped views.

#### 4.3.8 Faculty, College, and Discipline Grouping
- **Faculty/college grouping:** When available from Phase 11 university program read-models.
- **Academic field/discipline grouping:** From Phase 08.
- **Major identity and canonical major mapping:** From Phase 10.
- **Disclaimer:** Phase 24 does not create or own faculty/college data.

#### 4.3.9 Program Availability Filters
- **Country**, **University**, **City**
- **Study language**
- **Tuition range**
- **Delivery mode** (if available)
- **Scholarship availability**
- **Degree level**
- **Faculty/college**
- **Discipline/academic field**

#### 4.3.10 Scholarships for This Major Section
- **Scholarships linked to the major:** Sourced from Phase 12.
- **Funding coverage summary and deadlines.**
- **Eligible degree levels, countries, and universities.**
- **Links to Scholarship Detail Pages.**
- **Disclaimer:** Phase 12 owns scholarship definitions, eligibility, and deadlines. Phase 24 remains presentation-only.

#### 4.3.11 Related Courses and Learning Paths Section
- **Native MANARATAK courses.**
- **Global free external courses.**
- **Learning paths and prep courses.**
- **Course language and free study/free certificate indicators.**
- **Links to Course Detail Pages.**
- **Disclaimer:** Phase 13 owns courses, learning paths, and course origin classification. Phase 24 remains presentation-only.

#### 4.3.12 Career Paths and Outcomes Section
- **Common job titles, career paths, and required career skills.**
- **Internships and graduate programs.**
- **Alumni or placement insight** (if available).
- **Links to Career / Job Detail Pages.**
- **Disclaimer:** Phase 21 owns career and alumni data. Phase 24 remains presentation-only.

#### 4.3.13 AI and Recommendations Section
- **Optional advisory matching score.**
- **Related majors suggested by AI.**
- **Recommended courses or scholarships** (if available).
- **Disclaimer:** Phase 17 provides advisory recommendations only and Phase 24 displays approved read-model outputs.

#### 4.3.14 Related Content Section
- **Related majors, universities, scholarships, and courses.**
- **CMS guides/articles** (from Phase 16).
- **Country destination pages.**

#### 4.3.15 Actions and Navigation Section
- **View universities, scholarships, and courses.**
- **Compare majors.**
- **Save major** (if authenticated, delegated to Phase 15 workspace behavior).

#### 4.3.16 Empty, Incomplete, and Filter States
- **No universities found for selected degree level:** Safe fallback UI handling.
- **No scholarships found:** Safe fallback text.
- **No courses found:** UI handling for empty states.
- **Missing faculty/college grouping:** Graceful UI degradation.
- **Incomplete taxonomy mapping:** Safe fallback text.
- **Outdated or unverified data:** Source trust labels and warnings.
- **Fallback editorial placeholders:** UI handling for missing editorial content.
- **Hidden/unpublished behavior:** Only approved/published records should be fully public.

#### 4.3.17 Data Source Mapping
- **Phase 08:** Owns degree levels, academic fields, disciplines, and classification hierarchy.
- **Phase 10:** Owns canonical majors, major identity, synonyms, equivalency mappings, and major-specific structured metadata.
- **Phase 11:** Owns university programs, faculties/colleges, departments, program availability, and tuition source data.
- **Phase 12:** Owns scholarships, eligibility, deadlines, funding coverage, and scholarship-major relationships.
- **Phase 13:** Owns courses, learning paths, external/free courses, native courses, and course origin classification.
- **Phase 15:** Owns authenticated save/collection behavior.
- **Phase 16:** Owns editorial guides and long-form explanatory content.
- **Phase 17:** May provide AI advisory recommendations.
- **Phase 21:** Owns career paths, job roles, skill demand, alumni/career outcomes, internships, and recruitment data.
- **Phase 24:** Owns only filter presentation, grouped layout, and public page composition.

### 4.4 Course Detail Page Requirements

#### 4.4.1 Page Purpose
The Course Detail Page helps visitors evaluate a course and decide whether to learn inside MANARATAK, visit a global free external course provider, or access a related paid service. Phase 24 composes the public page only.

#### 4.4.2 Course Type and Origin Section
- **Course origin type**
- **MANARATAK Course** (authored, hosted, and delivered natively; can be free or paid)
- **Global Free External Course** (imported/indexed; must be free)
- **Paid Course** (paid learning offerings owned by Phase 13)
- **Related Paid Service** (non-course auxiliary offerings owned by Phase 20)
- **Provider/platform name**
- **Source trust level**
- **Direct course URL** (for external courses)
- **Free study / free certificate indicators**

#### 4.4.3 Hero Section
- **Course title**
- **Provider/platform**
- **Course language**
- **Course level**
- **Course duration**
- **Course category**
- **Related major(s)**
- **Free study / free certificate badge**
- **Source/completeness badge**

#### 4.4.4 Overview and Learning Outcomes Section
- **Short course description**
- **What the student will learn**
- **Skills gained**
- **Prerequisites**
- **Target audience**
- **Editorial intro** (from Phase 16 when available)

#### 4.4.5 Curriculum / Content Section
- **Modules**
- **Lessons**
- **Syllabus**
- **Topics covered**
- **Downloadable material references** (if native)
- **External content summary** (if external)
- **Disclaimer:** MANARATAK does not host external course content.

#### 4.4.6 Enrollment and Access Section
- **Start/continue learning** (for native free courses)
- **Purchase/Enroll** (for paid courses, routed to Phase 19 checkout)
- **Visit external course** (for global free external courses)
- **Service booking/action** (for related paid services via Phase 20)
- **Direct external course link requirement**
- **Authentication behavior** (if needed through Phase 15)

#### 4.4.7 Certificates and Completion Section
- **Native completion policy**
- **Free certificate indicator** (for external courses when applicable)
- **No MANARATAK certificate for external courses by default**
- **Disclaimer:** Phase 14 owns MANARATAK certificate generation and verification. Phase 13 only emits completion events.

#### 4.4.8 Import and Data Quality Section
- **Mandatory external course import fields:**
  - `courseTitle`
  - `freeStudyOrFreeCertificateIndicator`
  - `directCourseUrl`
- **Optional fields:**
  - `providerName`
  - `courseLanguage`
  - `courseDuration`
  - `courseContents`
  - `skillsGained`
  - `relatedMajors`
  - `certificateAvailability`
  - `lastVerifiedAt`
  - `sourceTrustLevel`
- **Disclaimer:** Global free external course imports must exclude paid external courses. Paid external courses are out of scope for the global free import path and require a separate Phase 13 paid-course catalog decision if MANARATAK chooses to support them. Phase 13 owns course import schemas, validation, deduplication, and course origin classification. Phase 06 owns generic import mechanics only.

#### 4.4.9 Related Majors, Universities, and Scholarships Section
- **Related majors** (from Phase 10)
- **Academic taxonomy** (from Phase 08)
- **Universities/programs** (from Phase 11 if relevant)
- **Scholarships** (from Phase 12 if relevant)
- **Links to Major, University, and Scholarship detail pages**

#### 4.4.10 Related Courses and Learning Paths Section
- **Related native MANARATAK courses**
- **Related global free external courses**
- **Learning paths**
- **Prep sequences**
- **Recommended next courses**

#### 4.4.11 Paid Services Boundary Section
- **Paid courses** remain Phase 13 learning offerings.
- **Paid services** (e.g., document preparation, SOP/CV writing, translation, visa help, consultation) are Phase 20 service offerings.
- **Checkout/payment** belongs to Phase 19 for both paid courses and paid services.
- Phase 24 only displays service links/cards when approved and must not mix them into the catalog as courses.

#### 4.4.12 Empty, Incomplete, and Trust States
- **Missing direct course URL:** Safe fallback UI handling.
- **Unknown certificate status:** Safe fallback text.
- **Unsupported provider:** UI handling.
- **Paid external course detected:** Flagged as out of scope for the global free import path.
- **Outdated course source:** UI handling for unverified data.
- **Incomplete imported record:** Display warnings when key fields are not yet known.
- **Hidden/unpublished behavior:** Only approved/published course records should be fully public.

#### 4.4.13 Data Source Mapping
- **Phase 13:** Owns all course records, course metadata, course origin classification, native courses, external course references, paid courses, free courses, learning paths, import schemas, and completion events.
- **Phase 06:** Owns generic import mechanics only.
- **Phase 05:** Owns native course media/assets via EAP.
- **Phase 10:** Owns related majors.
- **Phase 08:** Owns academic taxonomy and degree/classification metadata.
- **Phase 11:** Owns universities/programs if linked.
- **Phase 12:** Owns scholarships if linked.
- **Phase 14:** Owns MANARATAK certificates and verification.
- **Phase 15:** Owns authenticated learning workspace/progress display behavior.
- **Phase 16:** Owns editorial copy/guides.
- **Phase 19:** Owns payment processing, checkout, invoices, refunds, and financial settlement for paid courses and paid services.
- **Phase 20:** Owns service catalog and fulfillment for non-course services only.
- **Phase 24:** Owns public composition only.

### 4.5 Educational Service Detail Page Requirements

#### 4.5.1 Page Purpose
The Service Detail Page helps visitors understand a non-course service, its scope, requirements, pricing visibility, delivery method, and order/booking path. Phase 24 composes the public page only.

#### 4.5.2 Service Category and Audience Section
- **Service category:** Must support Phase 20 categories including Student Services, Document Services, Visa Services, Travel Services, Academic Services, Auxiliary & Professional Services, and Enterprise Operational Services.
- **Service audience:** Student / Parent / External Client / University / General Visitor when applicable.
- **Service type:** Whether it is student-facing, general, professional, or enterprise-operational.
- **Clear badge that this is a service, not a course.**

#### 4.5.3 Hero Section
- **Service name**
- **Short description**
- **Service category**
- **Availability status**
- **Estimated delivery time**
- **Starting price or pricing visibility** (if available)
- **Primary call-to-action**
- **Source/completeness badge**

#### 4.5.4 Service Scope Section
- **What the service includes**
- **What it does not include**
- **Expected deliverables**
- **Required inputs**
- **Service prerequisites**
- **Supported countries/languages** (if applicable)

#### 4.5.5 Requirements and Required Documents Section
- **Documents or information the user must provide**
- **Uploaded draft files**
- **Passports/transcripts/CV/SOP files** (if relevant)
- **All persisted files must be referenced through Phase 05 EAP using `AssetId` / `AssetReference`**
- **Disclaimer:** No raw URLs or physical storage paths.

#### 4.5.6 Pricing, Packages, and Payment Section
- **Base price**
- **Package tiers**
- **Discounts/promotions** (if visible)
- **Pricing notes**
- **Payment CTA**
- **Disclaimer:** Phase 20 owns pricing definitions and Phase 19 owns checkout, invoices, refunds, and financial settlement.

#### 4.5.7 Booking, Scheduling, and Fulfillment Section
- **Appointment booking** (if required)
- **Provider assignment**
- **SLA/estimated turnaround**
- **Delivery workflow summary**
- **Order status visibility**
- **Disclaimer:** Phase 20 owns booking, fulfillment, workflow, SLA, and delivery state.

#### 4.5.8 Related Domain Context Section
- **Related university** (if service applies to a university path)
- **Related scholarship** (if service applies to scholarship preparation)
- **Related country** (for visa/travel services)
- **Related major** (for academic consultation)
- **Related career path** (for CV/career services)
- **Disclaimer:** Phase 20 references these domains but does not own their records.

#### 4.5.9 Related Courses Boundary Section
- **Related courses** (may be displayed as cross-links from Phase 13)
- **Disclaimer:** Paid courses remain Phase 13 learning offerings. Services must not be mixed into the course catalog. Phase 24 may show related cards only.

#### 4.5.10 Trust, Provider, and Review Section
- **Service provider display** (if public)
- **Provider qualification** (if available)
- **Review/rating summary** (if approved)
- **Source/trust labels**
- **Disclaimer:** Admin-approved visibility only.

#### 4.5.11 Empty, Incomplete, and Trust States
- **Missing price:** Safe fallback UI handling.
- **Unavailable service:** Safe fallback text.
- **Missing required documents:** Display warnings or prompts for missing inputs.
- **Booking unavailable:** UI handling for closed slots.
- **Provider unavailable:** UI handling.
- **Incomplete imported service record:** Display warnings when key fields are not yet known.
- **Unpublished/hidden service behavior:** Only approved/published services should be fully public.

#### 4.5.12 Data Source Mapping
- **Phase 20:** Owns service catalog, service categories, packages, pricing definitions, booking, provider assignment, fulfillment, workflow, SLA, delivery state, service import schemas, and service publication readiness.
- **Phase 19:** Owns checkout, invoices, refunds, payment execution, and financial settlement.
- **Phase 05:** Owns service-related files and deliverables through EAP.
- **Phase 11:** Owns university records if linked.
- **Phase 12:** Owns scholarship records if linked.
- **Phase 07:** Owns country/language/currency reference data.
- **Phase 10:** Owns major references if linked.
- **Phase 13:** Owns related courses and paid/free course records.
- **Phase 15:** Owns authenticated student workspace/order display behavior.
- **Phase 16:** Owns editorial/marketing copy if used.
- **Phase 21:** Owns career/cv/job path context if linked.
- **Phase 23:** Owns administration UI and service management screens.
- **Phase 24:** Owns public composition only.

### 4.6 Educational Tool Detail Page Requirements

#### 4.6.1 Phase 18 Registry Dependency Rule
Phase 24 does not own the tool catalog. Phase 24 composes public tool pages using read-only metadata from the Official Tool Registry Backlog owned by Phase 18 - Enterprise Student Tools Platform. Tool names, execution type, category, launch visibility, implementation priority, input/output requirements, lifecycle status, and dependency declarations come from Phase 18. Phase 24 may define presentation layout, routing, SEO structure, public cards, filters, badges, and empty states only. Phase 24 must never introduce new tools that are not present in the Phase 18 registry.

#### 4.6.2 Public Tool Listing and Filtering
The public tools landing/listing experience must support:
- **Tool category filters:**
  - AI Writing Tools
  - AI Advisory Tools
  - Academic Calculators
  - Financial Calculators
  - Comparison Tools
  - Recommendation Tools
  - Planning Tools
  - Validation Tools
  - Productivity Tools
  - Educational Utilities
- **Execution type filters:**
  - Deterministic
  - AI-Delegated
  - Hybrid
- **Launch visibility badges:**
  - Active
  - Coming Soon
  - Under Development
  - Disabled
  - Retired
- **Public availability rules:**
  - Only tools marked public-available in Phase 18 may appear on the public platform.
  - Hidden/Admin Only tools must never appear on public pages.
  - Coming Soon and Under Development tools may appear as non-executable preview cards if Phase 23 admin visibility allows it.
  - Disabled and Retired tools should not be executable and may be hidden or displayed only as safe historical/status pages if explicitly allowed.

#### 4.6.3 Tool Card Requirements
Each public tool card should include:
- Tool name
- Short description
- Category
- Execution type badge
- AI badge if AI-Delegated or Hybrid
- Launch visibility badge
- Estimated completion time if available
- Supported languages if available
- Authentication requirement badge
- Primary action: Start Tool, Sign in to Use, Coming Soon, Under Development, Unavailable
- Related domain tags such as Scholarships, Universities, Majors, Countries, Courses, Services, Finance, or Documents.

#### 4.6.4 Tool Detail Page Structure
Each tool detail page should include:
- Hero section
- What this tool does
- Who should use it
- Required inputs
- Optional inputs
- Output/result preview
- Execution type explanation
- AI delegation notice when applicable
- Data source and dependency mapping
- Privacy and transient-data note
- Saved result behavior for authenticated users
- Related tools
- Related public pages
- Error, incomplete-data, and unavailable states
- Trust and disclaimer section

#### 4.6.5 Boundary Rules
- **Phase 18** owns tool execution orchestration and registry.
- **Phase 17 - Enterprise AI Platform** owns AI execution, prompts, models, safety filters, provider routing, token/cost governance, and generated advisory intelligence.
- **Phase 15 - Enterprise Student Platform** owns authenticated student workspace display, saved results, private execution history, and dashboard embedding.
- **Phase 23 - Enterprise Administration Portal** owns admin visibility, enable/disable controls, priority, moderation status, lifecycle review, and feature flags.
- **Phase 05 - Core Implementation / Enterprise Asset Platform** owns persisted generated files, previews, PDFs, and downloadable outputs via AssetId / AssetReference.
- **Phase 19 - Enterprise Finance & Payments Platform** owns payment execution if a tool is paid or monetized.
- **Phase 24** owns only public composition, routing, SEO, cards, visitor-facing layout, and presentation.
- Phase 24 must not call external AI providers.
- Phase 24 must not persist generated documents.
- Phase 24 must not own admin/import tools.
- Phase 24 must not expose Hidden/Admin Only tools.

#### 4.6.6 Admin/Internal Tool Exclusion
Admin/Internal tools from Phase 18, such as import completeness checkers, duplicate review helpers, missing-data assistants, and source trust reviewers, are not public tools. They may be surfaced only through Phase 23 admin workflows and must never be displayed as public visitor tools.

#### 4.6.7 Data Source Ownership Mapping
| Data Domain / Capability | Owning Phase |
| :--- | :--- |
| Tool registry metadata | Phase 18 |
| AI execution and advisory output | Phase 17 |
| Public page composition | Phase 24 |
| Authenticated saved results and private history | Phase 15 |
| Admin visibility/lifecycle controls | Phase 23 |
| Generated files/assets | Phase 05 EAP |
| Payments for paid tools | Phase 19 |
| Universities consumed by tools | Phase 11 |
| Scholarships consumed by tools | Phase 12 |
| Majors consumed by tools | Phase 10 |
| Courses consumed by tools | Phase 13 |
| Countries/currencies/languages | Phase 07 |
| Services cross-links | Phase 20 |
| Career data cross-links | Phase 21 |

#### 4.6.8 Example Public Tools
These are examples sourced from the Phase 18 registry, not a separate Phase 24 catalog:
- GPA Calculator
- Tuition Calculator
- Living Cost Calculator
- University Comparison
- Scholarship Comparison
- Country Comparison
- Required Documents Checklist
- Motivation Letter Generator
- Personal Statement Generator
- CV Builder
- Visa Requirement Checker
- Study Abroad Budget Estimator
- Course Path Builder


### 4.7 Career / Job Detail Page Requirements

#### 4.7.1 Page Purpose
This page family presents public visitor-facing details for:
- Job listings
- Internship opportunities
- Graduate programs
- Leadership/fresh graduate programs
- Career events
- Mentorship opportunities
- Alumni opportunities or public alumni network entries where applicable

**Boundary Confirmations:**
- Phase 24 owns public page composition, routing, SEO, cards, visitor layout, and presentation only.
- Phase 21 - Enterprise Career & Alumni Platform owns career profiles, job listings, internships, graduate programs, recruitment workflows, recruiter handles, alumni network metadata, and recruitment employer metadata.
- This page must not introduce an Employers Platform, Organizations Platform, or Organizations & Employers Platform.

#### 4.7.2 Supported Opportunity Types
The page should support at minimum:
- Full-time job
- Part-time job
- Contract role
- Remote job
- Internship
- Summer training
- Apprenticeship
- Co-op program
- Graduate trainee program
- Future leaders program
- Leadership program
- Career event
- Mentorship opportunity

#### 4.7.3 Hero Section Requirements
The hero should include:
- Opportunity title
- Opportunity type badge
- Recruitment employer display name
- Employer logo via Phase 05 EAP AssetId / AssetReference if available
- Country, city, or Remote badge
- Application deadline
- Employment type
- Experience level
- Compensation range if available
- Featured/verified badge if approved by Phase 21/23 governance
- Primary action: Apply Now, View External Application, Sign in to Save, Save Opportunity, Closed, Expired

#### 4.7.4 Opportunity Overview Section
Include:
- Role summary
- Responsibilities
- Requirements
- Required skills
- Preferred skills
- Education requirements
- Language requirements
- Experience requirements
- Work model: On-site / Remote / Hybrid
- Start date if available
- Duration for internships or programs
- Application method: internal workflow reference or external application URL
- Source / last verified timestamp

#### 4.7.5 Recruitment Employer Metadata Section
Include:
- Employer display name
- Employer industry / sector
- Employer country and city
- Public description if available
- Website or application link if available
- Recruiter/public contact handle if allowed
- Trust / verification status

**Boundary:** The recruitment employer card is Phase 21 recruitment employer metadata only. It must not create or imply a general employer master, Organizations Platform, Employers Platform, B2B platform, or cross-domain organization registry.

#### 4.7.6 Application and Saved-State Behavior
- Public visitors may view public opportunities.
- Authenticated users may save opportunities to Phase 15 - Enterprise Student Platform.
- Phase 15 owns saved items, private history, personal dashboards, and workspace display.
- Phase 21 owns recruitment application workflows if the application is internal.
- External application URLs remain external and must be clearly labeled.
- Phase 24 does not process applications or own recruitment workflow logic.

#### 4.7.7 AI and Recommendation Boundary
- Phase 17 - Enterprise AI Platform may provide advisory career matching, skill-gap scoring, CV improvement suggestions, and recommendation outputs.
- Phase 21 owns career/recruitment source data and read models.
- Phase 24 displays AI-assisted recommendations or matching explanations only when supplied through approved read models.
- Phase 24 must not call AI providers or generate career recommendations itself.

#### 4.7.8 Paid/Monetized Boundary
If a listing is featured, sponsored, or monetized:
- Phase 19 - Enterprise Finance & Payments Platform owns checkout, invoices, payment execution, refunds, and settlement.
- Phase 23 - Enterprise Administration Portal owns admin review and approval screens.
- Phase 24 only displays approved badges or placement.

Paid career services such as CV writing, interview coaching, or 1-on-1 counseling are not job listings:
- They are Phase 20 - Enterprise Services Platform offerings.
- They may be displayed only as related service cross-links.

#### 4.7.9 Related Sections
The page should include:
- Similar jobs
- Similar internships
- Graduate programs from same country or sector
- Related employers/recruitment metadata
- Related career articles or guides from Phase 16 - Enterprise CMS
- Related courses from Phase 13 - Learning Platform
- Related student tools from Phase 18 - Enterprise Student Tools Platform, such as CV Builder, Interview Coach, Career Advisor, Major Advisor
- Related paid services from Phase 20 only as cross-links, not as career listings

#### 4.7.10 Empty, Expired, and Trust States
Document how Phase 24 displays:
- Expired opportunity
- Closed opportunity
- Incomplete opportunity data
- Missing compensation information
- External application link unavailable
- Employer verification pending
- Suspicious or unverified listing
- Region/language unavailable
- No similar opportunities

#### 4.7.11 Data Source Ownership Mapping
| Data Domain / Capability | Owning Phase |
| :--- | :--- |
| Job listings, internships, graduate programs | Phase 21 |
| Recruitment employer metadata | Phase 21 |
| Recruiter handles / public recruitment contacts | Phase 21 |
| Career applications / recruitment workflow references | Phase 21 |
| Saved opportunities / private user state | Phase 15 |
| AI matching / skill-gap / advisory recommendations | Phase 17 |
| Employer logos / CVs / attachments / media assets | Phase 05 EAP |
| Public page composition / routing / SEO | Phase 24 |
| Admin approval / featured status / moderation | Phase 23 |
| Featured listing payments / monetization | Phase 19 |
| Paid career services cross-links | Phase 20 |
| Career articles / editorial guides | Phase 16 |
| Related courses | Phase 13 |
| Countries, cities, languages, currencies | Phase 07 |

#### 4.7.12 Strict Boundary Confirmations
- Phase 24 must not own career data.
- Phase 24 must not own applications.
- Phase 24 must not own employer registries.
- Phase 24 must not introduce Organizations Platform, Employers Platform, or Organizations & Employers Platform.
- Phase 24 must not execute AI.
- Phase 24 must not process payments.
- Phase 24 must not fulfill paid career services.
- Phase 24 must not store generated files or CV documents.

### 4.8 Certificate Verification Page Requirements

#### 4.8.1 Page Purpose
This page allows public visitors, universities, employers, scholarship providers, and verification reviewers to verify the authenticity and current status of a MANARATAK-issued certificate or credential.

**Boundary Confirmations:**
- Phase 24 owns public page composition, routing, SEO, visitor layout, verification form presentation, and result display only.
- Phase 14 - Enterprise Certificates Platform owns certificate records, certificate numbers, verification tokens, QR code validation, certificate status, revocation, reissuance, signing, templates, audit trail, and public verification read models.
- Phase 24 must not generate certificates, sign certificates, revoke certificates, mutate certificate status, or store certificate files.

#### 4.8.2 Verification Input Methods
The page should support:
- Certificate number input.
- Verification code / token input.
- QR code landing URL.
- Optional holder surname or partial identity confirmation if Phase 14 requires extra validation.
- Safe retry and rate-limit messaging.
- Invalid, missing, expired, or malformed token states.

#### 4.8.3 Verification Result States
Document how the page displays:
- Valid certificate.
- Revoked certificate.
- Expired certificate.
- Reissued / superseded certificate.
- Suspended / under review certificate.
- Not found certificate.
- Invalid verification token.
- Tampered or mismatched QR/token.
- Verification temporarily unavailable.
- Privacy-restricted result.

#### 4.8.4 Result Display Requirements
When verification succeeds, show only public-safe fields approved by Phase 14, such as:
- Certificate title.
- Certificate number.
- Verification status.
- Issuing entity / issuer display name.
- Issue date.
- Expiry date if applicable.
- Program/course/learning path title if public-safe.
- Holder display name in privacy-safe format.
- Credential type.
- Verification timestamp.
- Public certificate preview or download link only if allowed by Phase 14.
- Reissue/supersession indicator if applicable.
- Revocation status and safe public revocation reason category if applicable.

Do not expose sensitive student profile data, full private identity records, internal audit logs, admin notes, raw signing keys, QR secrets, or private certificate files.

#### 4.8.5 QR Code and Deep-Link Behavior
- QR code URLs route to Phase 24 public verification pages.
- Phase 24 presents the page and forwards only the verification token/code to Phase 14 approved verification read APIs.
- Phase 14 validates QR/token authenticity.
- Tampered, malformed, expired, or mismatched QR tokens must render safe error states without leaking internal details.

#### 4.8.6 Certificate Preview and Asset Boundary
- Certificate PDFs, images, previews, seals, issuer logos, and downloadable files are owned and persisted through Phase 05 - Core Implementation / Enterprise Asset Platform (EAP) using AssetId / AssetReference.
- Phase 14 controls which asset references are public-safe.
- Phase 24 may render public previews or download actions only from approved read models.
- Phase 24 must not store raw files, physical paths, storage URLs, signing keys, or certificate templates.

#### 4.8.7 Cross-Phase Learning Boundary
- Phase 13 - Learning Platform may emit completion events that trigger certificate eligibility.
- Phase 14 owns certificate issuance, generation, verification, revocation, reissue, templates, serial numbers, QR codes, and public verification status.
- Phase 15 - Enterprise Student Platform displays certificates inside the authenticated student workspace but does not own verification logic.
- Phase 23 - Enterprise Administration Portal owns admin screens for revocation, review, correction, template management, and manual certificate operations.
- Phase 24 owns only public verification page composition.

#### 4.8.8 Trust, Security, and Privacy Requirements
The page must:
- Avoid disclosing whether a private person exists beyond Phase 14-approved public verification fields.
- Mask holder identity where required.
- Avoid exposing internal IDs, signing metadata, token secrets, or administrative comments.
- Display clear trust messages for valid certificates.
- Display careful non-accusatory language for invalid or not-found certificates.
- Support rate limiting and abuse protection through approved backend controls.
- Include a disclaimer that verification status reflects the latest approved Phase 14 certificate record.

#### 4.8.9 Related Actions
The page may include:
- Download public-safe certificate copy if allowed.
- Share verification link.
- Report verification issue.
- Contact support.
- View related course/program page if public-safe.
- Sign in to view full certificate inside Phase 15 workspace if the holder is the authenticated student.

#### 4.8.10 Empty, Error, and Unavailable States
Document states for:
- Missing certificate number.
- Invalid certificate format.
- Verification code expired.
- QR code unreadable or malformed.
- Certificate not found.
- Phase 14 verification service unavailable.
- Asset preview unavailable.
- Public download disabled.
- Privacy-restricted certificate.

#### 4.8.11 Data Source Ownership Mapping
| Data Domain / Capability | Owning Phase |
| :--- | :--- |
| Certificate record, number, status, token validation | Phase 14 |
| QR code generation and verification | Phase 14 |
| Certificate template, serial number, signing, revocation, reissue | Phase 14 |
| Public verification page composition / routing / SEO | Phase 24 |
| Certificate PDFs, previews, seals, logos, downloadable assets | Phase 05 EAP |
| Learning completion events / course source references | Phase 13 |
| Authenticated student certificate display | Phase 15 |
| Admin revocation/review/template screens | Phase 23 |
| Issuer university reference if applicable | Phase 11 |
| Public editorial explanation or help article | Phase 16 |

#### 4.8.12 Strict Boundary Confirmations
- Phase 24 must not own certificate records.
- Phase 24 must not generate, sign, revoke, or reissue certificates.
- Phase 24 must not store certificate files or templates.
- Phase 24 must not expose private student data.
- Phase 24 must not expose signing keys, token secrets, internal audit trails, or admin comments.
- Phase 24 must not introduce a new credential platform or any new roadmap phase.

### 4.9 CMS Article / Guide Page Requirements

**Page Purpose**
This page presents public editorial content, educational guides, study-abroad articles, news, announcements, FAQs, and long-form explanatory content across the MANARATAK public website.
- **Phase 24** owns public page composition, routing, SEO layout, visitor-facing rendering, related-content placement, and presentation only.
- **Phase 16 - Enterprise CMS** owns editorial articles, guides, content blocks, content lifecycle, editorial review, CMS taxonomies, SEO metadata payloads, content localization, and published content state.
- **Phase 24** must not own editorial content creation, editorial approval workflows, CMS publishing state, content lifecycle, or article storage.

**Supported Content Types**
The page should support:
- Article
- Study guide
- Country guide
- Scholarship guide
- University guide
- Major guide
- Course guide
- Service guide
- Career guide
- FAQ page
- Announcement
- News article
- Static informational page
- Editorial landing content block
- Step-by-step checklist guide

**Article Hero Section Requirements**
The hero should include:
- Article / guide title
- Content type badge
- Category
- Primary topic
- Short summary / excerpt
- Author or editorial source if public-safe
- Published date
- Last updated date
- Reading time
- Language / locale
- Featured image via Phase 05 EAP AssetId / AssetReference if available
- Trust / reviewed badge if approved
- Related domain tags such as Scholarships, Universities, Countries, Majors, Courses, Services, Careers, Tools, or Certificates.

**Article Body Requirements**
The page should support:
- Rich text content blocks
- Headings
- Paragraphs
- Lists
- Tables
- Callout boxes
- Warning boxes
- Step-by-step blocks
- FAQ blocks
- Embedded media references via EAP
- Internal links to public pages
- External links with safety labeling
- Related entity cards
- CTA blocks
- Legal/disclaimer notes where needed

*Boundary:* All editorial payloads come from Phase 16 CMS-approved read models. Phase 24 only composes and renders them.

**Content Localization Requirements**
The page should support:
- Language switcher if localized versions exist.
- Fallback language behavior.
- RTL/LTR rendering support.
- Localized slugs where approved by Phase 16.
- Localized SEO title/description from Phase 16.
- Clear fallback state when a translation is unavailable.

*Clarify:* Phase 16 owns content localization workflow and approved localized payloads. Phase 24 renders the selected localized version only. Phase 17 may assist with translation drafts, but Phase 16 owns editorial approval and final publication.

**SEO and Public Metadata Requirements**
The page should include:
- SEO title
- Meta description
- Canonical URL
- OpenGraph title/description/image
- Structured data if approved
- Breadcrumbs
- Content category and tags
- Last updated metadata
- Noindex/noarchive handling if content is restricted, draft, archived, or private

*Boundary:* Phase 16 owns CMS-provided SEO metadata payloads. Phase 24 applies them to the public page.

**Related Content and Cross-Link Sections**
The page may display:
- Related scholarships from Phase 12
- Related universities from Phase 11
- Related countries/reference pages from Phase 07
- Related majors from Phase 10
- Related courses from Phase 13
- Related certificates or verification help from Phase 14
- Related services from Phase 20
- Related career opportunities from Phase 21
- Related student tools from Phase 18
- Related articles/guides from Phase 16

*Clarify:* Domain data remains owned by the source phase. Phase 24 displays only approved public read models and does not mutate source data.

**Editorial Trust and Review Requirements**
The page should display when available:
- Reviewed by
- Editorial status
- Last reviewed date
- Source references
- Update notice
- Outdated content warning
- Regional applicability warning
- Legal or advisory disclaimer

*Clarify:* Phase 16 owns editorial review, moderation, and publishing decisions. Phase 23 may provide admin review screens. Phase 24 displays review metadata only.

**Restricted, Archived, and Empty States**
Document handling for:
- Draft content
- Archived content
- Unpublished content
- Restricted/private content
- Missing translation
- Missing featured image
- Missing author
- Outdated article
- Broken related entity links
- Removed external source link
- Content unavailable in visitor language

**Data-Source Ownership Mapping**

| Capability | Owning Phase |
| :--- | :--- |
| Editorial article/guide content | Phase 16 |
| CMS content blocks | Phase 16 |
| CMS taxonomy/category/tag metadata | Phase 16 |
| Editorial review and publishing state | Phase 16 |
| SEO metadata payloads | Phase 16 |
| Public composition/routing/rendering | Phase 24 |
| Images/media/documents | Phase 05 EAP |
| AI draft translation/summarization/advisory support | Phase 17 |
| Admin editorial review screens | Phase 23 |
| Scholarships cross-links | Phase 12 |
| Universities cross-links | Phase 11 |
| Countries/languages/reference data | Phase 07 |
| Majors cross-links | Phase 10 |
| Courses cross-links | Phase 13 |
| Certificates/verification help cross-links | Phase 14 |
| Services cross-links | Phase 20 |
| Career opportunity cross-links | Phase 21 |
| Tools cross-links | Phase 18 |

**Boundary Confirmations**
- Phase 24 must not own CMS content.
- Phase 24 must not create, approve, or publish editorial articles.
- Phase 24 must not own CMS taxonomies.
- Phase 24 must not own long-form editorial marketing copy.
- Phase 24 must not store raw media files.
- Phase 24 must not call AI providers for article generation.
- Phase 24 must not introduce a new CMS platform.
- Phase 24 must not mutate domain records linked inside the article.

### 4.10 Homepage Sections Requirements

**Homepage Purpose**
The homepage is the primary public entry point for MANARATAK. It introduces the brand, guides visitors toward educational opportunities, and routes users to scholarships, universities, countries, majors, courses, services, student tools, articles, career opportunities, and certificate verification.
- **Phase 24** owns homepage composition, routing, SEO, responsive layout, public presentation, section ordering, cards, CTA placement, and visitor-facing navigation only.
- **Phase 24** does not own domain data, editorial content, search infrastructure, AI execution, payments, files, student workspace state, or admin workflows.
- All homepage content is composed from approved public read models owned by the relevant phases.

**Brand and Hero Section Requirements**
The homepage hero should include:
- Brand name: MANARATAK / منارتك.
- Optional tagline: "بوابتك للفرص التعليمية حول العالم" or approved localized equivalent.
- Short value proposition.
- Primary CTA:
  - Explore Scholarships
  - Find Universities
  - Browse Courses
  - Start Planning
- Secondary CTA:
  - Create Account
  - Use Student Tools
  - Verify Certificate
- Trust badges or quick stats if approved.
- Hero visual/media via Phase 05 EAP AssetId / AssetReference if applicable.

**Global Discovery/Search Entry Section**
The homepage may include a unified discovery/search entry for public content.

*Requirements:*
- Search input.
- Popular shortcuts.
- Category tabs:
  - Scholarships
  - Universities
  - Countries
  - Majors
  - Courses
  - Services
  - Tools
  - Articles
  - Careers
- Recent/trending suggestions if supplied by approved read models.
- No implication that Phase 24 owns a standalone Search Platform.

*Boundary:* Phase 24 owns the public search entry UI only. Query execution and read-model/search capability must come from approved foundation/search/read-model services and domain-owned public projections.

**Core Homepage Sections**
The homepage should support these sections as configurable public composition blocks:

A. **Featured Scholarships**
- Data owner: Phase 12 - Scholarships.
- Shows published scholarships only.
- May include name, country, funding type, deadline, degree level, and CTA.

B. **Featured Universities**
- Data owner: Phase 11 - Universities & Institutions.
- Shows published university cards only.
- May include name, country, logo, ranking/rating if available, and CTA.

C. **Study Destinations / Countries**
- Data owner: Phase 07 - Enterprise Reference Data plus Phase 16 editorial guides where needed.
- Shows country cards, popular destinations, and guide links.

D. **Popular Majors**
- Data owner: Phase 10 - Major Platform and Phase 08 - Academic Taxonomy for taxonomy.
- Shows degree/field-oriented major cards and CTA.

E. **Courses and Learning**
- Data owner: Phase 13 - Learning Platform.
- Shows native MANARATAK courses, global free external courses, paid courses, and learning paths as separate or clearly labeled cards.
- Paid courses remain Phase 13 learning offerings and payment execution belongs to Phase 19.
- Non-course services must not be mixed into course cards.

F. **Student Services**
- Data owner: Phase 20 - Enterprise Services Platform.
- Shows non-course services such as document services, visa services, travel services, academic services, and student support services.
- Phase 20 owns service catalog and fulfillment; Phase 24 displays only.

G. **Student Tools**
- Data owner: Phase 18 - Enterprise Student Tools Platform.
- Shows public-available tools from the Official Tool Registry only.
- Hidden/Admin Only tools must not appear.
- Coming Soon tools may appear only as non-executable preview cards if allowed by Phase 23.

H. **Articles and Guides**
- Data owner: Phase 16 - Enterprise CMS.
- Shows published guides, articles, FAQs, and educational content only.

I. **Career and Alumni Opportunities**
- Data owner: Phase 21 - Enterprise Career & Alumni Platform.
- Shows public job, internship, graduate program, career guide, or mentorship cards if approved.
- Must not introduce Employers Platform or Organizations Platform.

J. **Certificates / Verification**
- Data owner: Phase 14 - Enterprise Certificates Platform.
- Provides public route to certificate verification page.
- Does not verify directly on homepage unless using approved Phase 14 read APIs.

K. **Calls to Action**
- Public account creation CTA.
- Student workspace sign-in CTA.
- Newsletter or updates CTA if owned by approved CMS/notification policies.
- Contact/support CTA.

**Personalization Boundary**
The homepage may optionally display personalized recommendations only when:
- The user is authenticated.
- The data is supplied by Phase 15 student workspace read models or approved recommendation projections.
- AI-generated recommendation scoring is owned by Phase 17.
- Phase 24 only renders the approved personalized block.

For anonymous visitors, use only public/default/trending sections.

**Homepage Section Configuration Rules**
The homepage should support admin-configurable ordering and visibility, but:
- Phase 23 - Enterprise Administration Portal owns admin UI for configuring section visibility/order if applicable.
- Phase 24 renders approved configuration only.
- Domain data ownership remains unchanged.
- Hidden, draft, unpublished, rejected, or admin-only records must not appear publicly.

**Trust, Stats, and Social Proof Requirements**
The homepage may display:
- Number of scholarships.
- Number of universities.
- Number of countries.
- Number of courses.
- Number of tools.
- Number of verified certificates.
- Student success stories or testimonials.
- Partner/university references if public-safe.

*Boundary:* Stats must come from approved public read models. Testimonials/editorial stories are owned by Phase 16 CMS if editorial. Certificates statistics come from Phase 14. No Organizations Platform may be introduced.

**Empty and Degraded States**
Document behavior for:
- No featured scholarships available.
- No featured universities available.
- No course data available.
- No services available.
- Tool registry unavailable.
- CMS guide block unavailable.
- Search/read-model capability unavailable.
- Personalized content unavailable.
- EAP media missing.
- Country/language localization unavailable.

**Data-Source Ownership Mapping**

| Capability | Owning Phase |
| :--- | :--- |
| Homepage composition/routing/SEO/layout | Phase 24 |
| Hero media/assets | Phase 05 EAP |
| Scholarships | Phase 12 |
| Universities | Phase 11 |
| Countries/languages/currencies/reference data | Phase 07 |
| Academic taxonomy | Phase 08 |
| Majors | Phase 10 |
| Courses/learning paths | Phase 13 |
| Certificates/verification route | Phase 14 |
| Student workspace/personalization state | Phase 15 |
| Editorial articles/guides/FAQs/testimonials | Phase 16 |
| AI recommendations/scoring | Phase 17 |
| Student tools registry | Phase 18 |
| Payments for paid courses/services | Phase 19 |
| Services catalog | Phase 20 |
| Career opportunities | Phase 21 |
| Product experience principles | Phase 22 |
| Homepage admin configuration | Phase 23 |
| Public discovery/search entry rendering | Phase 24 |
| Search/read-model execution | approved foundation/search/read-model capability only |

**Boundary Confirmations**
- Phase 24 must not own any domain catalog.
- Phase 24 must not own search infrastructure.
- Phase 24 must not execute AI.
- Phase 24 must not process payments.
- Phase 24 must not store files or media.
- Phase 24 must not own CMS content.
- Phase 24 must not own student workspace state.
- Phase 24 must not expose admin-only tools or records.
- Phase 24 must not introduce Organizations Platform, Employers Platform, Organizations & Employers Platform, Search Platform, or Phase 25.

### 4.11 Search Results and Comparison Pages Requirements

**Page Purpose**
This page family provides public discovery, filtering, search result presentation, and side-by-side comparison experiences for MANARATAK public content and domain records.

It should support:
- Public search results pages.
- Category-specific listing/search pages.
- Side-by-side comparison pages.
- Saved comparison prompts for authenticated users.
- Empty/result-not-found states.
- Public discovery routes for scholarships, universities, countries, majors, courses, services, tools, articles, careers, and certificates/help pages.

*Clarify:*
- **Phase 24** owns search result composition, listing layout, comparison layout, filters UI, SEO/routing, public cards, sorting controls, pagination/infinite loading UI, and visitor-facing presentation only.
- **Phase 24** must not own or introduce a standalone Search Platform.
- Query execution, indexing, ranking, read-model generation, and search infrastructure must come from approved foundation/search/read-model capabilities and domain-owned public projections.

**Supported Search Categories**
The public search/listing system should support:
- Scholarships
- Universities
- Countries / study destinations
- Majors
- Courses
- Services
- Student tools
- Articles and guides
- Career opportunities
- Certificate verification help pages
- Global / all-content search

**Search Results Page Structure**
Each search results page should include:
- Search input.
- Category tabs.
- Filter panel.
- Sort controls.
- Result count.
- Applied filter chips.
- Results list/grid.
- Result card type indicators.
- Pagination or infinite scroll behavior.
- Empty state.
- Error/degraded state.
- Related searches.
- Suggested categories.
- SEO-safe heading and metadata.
- Last updated / data freshness indicator where available.

**Filter Requirements by Category**

*Scholarships:*
- Country
- Degree level
- Funding type
- Deadline
- Study field / major
- Eligibility tags
- Language
- Status / published only

*Universities:*
- Country
- City
- Institution type
- Ranking/rating if available
- Tuition range
- Degree levels
- Available majors/programs
- Language of study

*Countries:*
- Region
- Language
- Currency
- Cost of living range
- Study popularity
- Visa/study guide availability

*Majors:*
- Degree level
- Academic field
- Faculty/college
- Discipline
- Career path
- Related universities
- Related scholarships
- Related courses

*Courses:*
- Course type/origin
- Free / paid
- Free certificate availability
- Course language
- Course level
- Duration
- Provider
- Native MANARATAK / global external course
- Published only

*Services:*
- Service category
- Delivery mode
- Country/language support
- Paid/free visibility
- Appointment required
- Required documents
- Published only

*Student Tools:*
- Tool category
- Execution type
- AI dependency
- Launch visibility
- Public availability
- Authentication requirement
- Active / Coming Soon / Under Development only when allowed by Phase 18/23
- Exclude Hidden/Admin Only tools

*Articles/Guides:*
- Content type
- Category
- Topic
- Language
- Last updated
- Reviewed status
- Published only

*Career Opportunities:*
- Opportunity type
- Country/city/remote
- Employment type
- Experience level
- Industry/sector
- Deadline
- Verified employer metadata
- Published only

**Comparison Page Requirements**
The comparison page should support side-by-side comparison for:
- Universities
- Scholarships
- Countries
- Majors
- Courses
- Services
- Student tools
- Career opportunities if applicable

Comparison layout should include:
- Selected items panel.
- Add/remove item controls.
- Side-by-side attribute table.
- Highlight differences toggle.
- Shared attributes group.
- Pros/cons or notes section if supplied by approved read models.
- Save comparison CTA for authenticated users.
- Share comparison link if safe.
- Print/export option if approved.
- Related recommendations if supplied by approved read models.
- Empty/too-few-items state.
- Max items rule.

**Comparison Data Boundaries**
- Phase 24 may compose comparison rows and UI only.
- Attribute definitions must come from the owning domain or approved public read-model contracts.
- Phase 24 must not compute business-critical eligibility, financial outcomes, ranking authority, admissions decisions, scholarship decisions, or certificate validity.
- Phase 17 may provide advisory summaries or similarity explanations through approved read models only.
- Phase 15 may save comparisons to authenticated user workspace if the user signs in.

**Result Card Requirements**
Every result card should include:
- Entity type badge.
- Title/name.
- Short summary.
- Key metadata fields.
- Trust/published/verified badge if available.
- Primary CTA.
- Secondary CTA if applicable.
- Related category tags.
- Last updated or deadline indicator where relevant.
- Source phase-safe status display.

Do not expose drafts, rejected records, hidden records, admin-only tools, private student data, internal IDs, raw storage paths, or unpublished CMS content.

**Search/Degraded/Empty States**
Document behavior for:
- No results found.
- Search service/read-model unavailable.
- Filters too restrictive.
- Category unavailable.
- Domain read model unavailable.
- Results partially available.
- User not authenticated for saving comparison.
- Attempting to compare incompatible entity types.
- Attempting to compare too many items.
- Hidden/admin-only record filtered out.
- EAP media missing.
- Localization unavailable.

**Data-Source Ownership Mapping**

| Capability | Owning Phase |
| :--- | :--- |
| Public search/listing UI and result composition | Phase 24 |
| Search/read-model execution | approved foundation/search/read-model capability only |
| Scholarships data | Phase 12 |
| Universities data | Phase 11 |
| Countries/languages/currencies/reference data | Phase 07 |
| Academic taxonomy | Phase 08 |
| Majors data | Phase 10 |
| Courses/learning paths | Phase 13 |
| Certificates/help/verification references | Phase 14 |
| Saved comparisons/private user state | Phase 15 |
| Articles/guides/content metadata | Phase 16 |
| AI advisory summaries/recommendations | Phase 17 |
| Student tools registry | Phase 18 |
| Payments/pricing fields if shown | Phase 19 |
| Services catalog | Phase 20 |
| Career opportunities | Phase 21 |
| Product experience rules | Phase 22 |
| Admin visibility/publishing controls | Phase 23 |
| Media/assets/logos/previews | Phase 05 EAP |

**Boundary Confirmations**
- Phase 24 must not own search infrastructure.
- Phase 24 must not introduce a standalone Search Platform.
- Phase 24 must not own domain indexes.
- Phase 24 must not own ranking authority unless supplied by approved public read models.
- Phase 24 must not compute scholarship eligibility, university admission eligibility, course completion, payment status, certificate validity, or career application status.
- Phase 24 must not expose unpublished, admin-only, private, or hidden records.
- Phase 24 must not execute AI or call AI providers.
- Phase 24 must not store files or media.
- Phase 24 must not introduce Organizations Platform, Employers Platform, Organizations & Employers Platform, or Phase 25.

### 4.12 International Test Detail Page Requirements

#### 4.12.1 Page Purpose
The International Test Detail Page helps visitors understand an exam such as IELTS, TOEFL iBT, SAT, GRE, GMAT, Duolingo English Test, HSK, TestDaF, PTE Academic, or similar official international tests. Phase 24 composes the public page only; Phase 09 owns the test data, scoring rules, official links, fee metadata, sample-material references, and publish readiness.

#### 4.12.2 Supported Test Types
- Language proficiency tests.
- Undergraduate admission tests.
- Graduate admission tests.
- Professional or licensing tests.
- Academic placement tests.
- Country-specific or provider-specific official exams.

#### 4.12.3 Hero Section
- **Test name**
- **Localized name / abbreviation**
- **Test category**
- **Official provider / issuing body**
- **Delivery mode** (online, in-person, hybrid)
- **Primary score scale / band range**
- **Official registration link**
- **Availability status**
- **Last verified date**
- **Source trust label**

#### 4.12.4 Overview Section
- **What the test is used for**
- **Accepted use cases** (university admission, scholarship requirements, language proof, professional licensing)
- **Who should take it**
- **Countries or regions where it is commonly used**
- **Related languages**
- **Validity period of result**

#### 4.12.5 Test Format and Sections
- **Test sections** (e.g., Reading, Listening, Writing, Speaking, Quantitative, Verbal)
- **Duration**
- **Delivery method**
- **Question types**
- **Retake policy**
- **Identification/document requirements**
- **Accessibility/accommodation notes**

#### 4.12.6 Score and Band System
- **Overall score scale**
- **Section score scales**
- **Bands or levels**
- **Pass/fail rules if applicable**
- **CEFR or cross-test equivalency mapping if available**
- **Score validity**
- **Result delivery time**

#### 4.12.7 Fees and Price Metadata
- **Registration fee**
- **Currency**
- **Price range if regional pricing varies**
- **Late registration fee**
- **Rescheduling fee**
- **Cancellation fee**
- **Fee validity window**
- **Pricing disclaimer:** Phase 09 owns fee metadata only. Phase 19 owns payments, invoices, refunds, ledgers, and checkout execution.

#### 4.12.8 Official Registration and Source Links
- **Official registration URL**
- **Official test information URL**
- **Provider preparation page**
- **Score reporting URL if available**
- **Official source date / last verified timestamp**

#### 4.12.9 Sample Materials and Preparation Resources
- **Official sample question links**
- **Practice test URLs**
- **Preparation PDFs or brochures**
- **Listening/audio sample references**
- **Guide assets**
- **Asset rule:** Persisted files must use Phase 05 EAP `AssetId` / `AssetReference`. Phase 24 must not reference raw file paths or unmanaged storage URLs.

#### 4.12.10 Test Centers and Availability
- **Available countries**
- **Available cities/test centers**
- **Online availability regions**
- **Testing windows or session availability**
- **Reference data disclaimer:** Phase 07 owns countries, cities, languages, and reference codes.

#### 4.12.11 Related Courses and Services
- **Preparation courses** from Phase 13 Learning Platform.
- **Related paid courses** from Phase 13 if applicable.
- **Test registration support services** from Phase 20.
- **Document preparation or translation services** from Phase 20.
- **CMS preparation guides** from Phase 16.
- **Student tools** from Phase 18 when relevant.

#### 4.12.12 Empty, Incomplete, and Trust States
- **Missing fee:** Display "Fee not currently available" with a source warning.
- **Missing official registration link:** Hide the registration action and show a safe fallback.
- **Outdated fee window:** Display "Pricing may have changed".
- **Unofficial source:** Display a trust warning and prevent strong claims.
- **Missing sample files:** Show official external links if available.
- **Unpublished test:** Do not show on public pages.

#### 4.12.13 Data Source Ownership Mapping
| Page Element | Data Owner |
| :--- | :--- |
| Test name, provider, category, versions, sections, scoring, bands, validity | Phase 09 |
| Fee metadata and fee validity windows | Phase 09 |
| Payment execution, invoices, refunds, checkout | Phase 19 |
| Countries, cities, languages, currencies, reference codes | Phase 07 |
| Preparation courses and paid courses | Phase 13 |
| Non-course paid services and registration support services | Phase 20 |
| Sample files, PDFs, audio, images, downloadable guides | Phase 05 EAP |
| Editorial preparation guides and long-form copy | Phase 16 |
| Public page layout, routing, SEO, and composition | Phase 24 |

#### 4.12.14 Strict Boundary Confirmations
- Phase 24 does not own test definitions, scores, equivalency mappings, prices, files, payments, or preparation courses.
- Phase 09 does not execute payments and does not own course delivery or service fulfillment.
- Phase 20 services must not be confused with Phase 13 courses.
- Phase 05 EAP owns persisted downloadable test materials.
- No Organizations Platform, Employers Platform, standalone Search Platform, or unapproved post-roadmap phase is introduced.

## 5. Design Baseline Approval

This document is the approved UI/UX requirements baseline for MANARATAK public pages.
It is the implementation reference for public page structure, page sections, public cards, routing expectations, SEO composition, empty states, trust states, and cross-page related-content layout.
It does not transfer domain ownership to Phase 24.
All data, content, workflows, payments, assets, certificates, tools, learning records, services, career records, and admin controls remain owned by their official Roadmap v6.0 phases.
Phase 24 owns only public page composition, visitor-facing presentation, routing, SEO application, public layout, listing/comparison rendering, and UI orchestration of approved public read models.
Future changes to this document require documentation governance review before implementation changes are made.

### Scope of Authority
- This document governs UI/UX composition and public-page layout only.
- It does not govern backend persistence schemas.
- It does not govern domain business rules.
- It does not govern API ownership.
- It does not govern admin workflows.
- It does not govern AI execution.
- It does not govern import mechanics.
- It does not govern payment execution.
- It does not govern certificate issuance.
- It does not govern file/media storage.
- It does not introduce any new phase.

### Change Control Rule
- Any future addition of a new public page type, major section, or ownership change must reference Roadmap v6.0, the relevant domain phase, and active ADRs.
- No new public page may create a new domain owner.
- No public page requirement may introduce Phase 25, Organizations Platform, Employers Platform, standalone Search Platform, or any unapproved bounded context.
- Public page changes must preserve Phase 24 composition-only ownership.

### Final Page Coverage Checklist
- [x] Scholarship Detail Page
- [x] University Detail Page
- [x] Country Destination Page
- [x] Major Detail Page
- [x] Course Detail Page
- [x] Educational Service Detail Page
- [x] Educational Tool Detail Page
- [x] Career / Job Detail Page
- [x] Certificate Verification Page
- [x] CMS Article / Guide Page
- [x] Homepage Sections
- [x] Search Results and Comparison Pages
- [x] International Test Detail Page

### Final Readiness Decision
- **Decision:** Approved / Baselined / Ready for UI implementation
- **Remaining Design Blockers:** 0
- **Remaining Architecture Blockers:** 0
- **Application Code Modified:** No
- **Domain Ownership Changes:** None
- **Roadmap v6.0 Compliance:** Confirmed

---

### Navigation
[<- Phase 24: Public Pages & User Experience (Part C)](./phase-24-03-enterprise-public-platform-public-pages-user-experience.md) | [Roadmap Completion]
