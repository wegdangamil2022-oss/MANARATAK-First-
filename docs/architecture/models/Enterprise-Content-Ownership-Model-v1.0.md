# Enterprise Content Ownership Model

## 1. Document Information

- **Title:** Enterprise Content Ownership Model
- **Version:** 1.0.0
- **Status:** Finalized
- **Date:** 2026-07-21
- **Owner:** Chief Enterprise Software Architect
- **Approval Authority:** Architecture Review Board (ARB)
- **Artifact Type:** Enterprise Architecture Standard

## 2. Executive Summary

This document serves as the definitive architectural standard for Enterprise Content Ownership across the MANARATAK 2.0 platform. It explicitly delineates boundaries between Editorial Content, Business Data, and Media Assets, ensuring absolute compliance with Domain-Driven Design (DDD), Clean Architecture, and the Enterprise Modular Monolith strategy.

The primary architectural principle established herein is: **Business Domains own Business Data. Enterprise CMS owns Editorial Content.**

## 3. Core Architectural Principles

### 3.1. Elimination of Misleading Terminology

- **Enterprise Platforms vs. CMS:** Business Domains (e.g., Learning Platform, Scholarships Platform, University Platform) are autonomous Enterprise Platforms. They must **never** be referred to as a "CMS" (e.g., "Course CMS", "University CMS"). The term CMS is strictly reserved for the Enterprise CMS bounded context.
- **Administrative Interfaces vs. Domains:** The term "Backoffice" must **only** be used to describe an administrative user interface (the Presentation Layer). It must **never** be used as a synonym for a Business Domain, Enterprise Platform, or Bounded Context.

### 3.2. Strict Separation of Concerns

- **Enterprise CMS:** The Enterprise CMS is an autonomous Bounded Context dedicated exclusively to Editorial Content Governance and the Enterprise Content Lifecycle. It **never** owns, manages, or mutates Business Entities. When Editorial Content needs to reference Business Entities, the Enterprise CMS consumes optimized Read Models (CQRS) projected by the respective Business Domains.
- **Business Domains:** Enterprise Platforms (e.g., Learning Platform) are the exclusive owners of their respective Business Entities. They are fully responsible for the lifecycle, validation, and state transitions of their domain data. They do **not** manage editorial workflows, static pages, or site navigation.

## 4. Enterprise Content Ownership Matrix

The following matrix dictates the precise ownership boundaries for all content and data types across the enterprise ecosystem.

| Enterprise Platform       | Primary Ownership (Owns)                                                                                                                                                                                                                                                                                                                                        | Excluded Ownership (Does NOT Own)                                                                   | Consumes (Read Models)                                              | Publishes (Events)                                                                |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------ | :-------------------------------------------------------------------------------- |
| **Enterprise CMS**        | Articles, News, Pages, Landing Pages, Static Pages, Categories, Tags, Authors, Editorial Metadata, SEO, Navigation, Menus, Content Blocks, Reusable Components, Banners, Announcements, Redirects, URL Management, Publishing Workflow, Review Workflow, Versioning, Localization, Media References, Editorial Content Governance, Enterprise Content Lifecycle | Business Entities (Courses, Scholarships, Universities, etc.), Binary Media Assets, User Identities | Course Projections, Scholarship Projections, University Projections | `ArticlePublished`, `PageUpdated`, `NavigationChanged`, `AnnouncementBroadcasted` |
| **Media Platform**        | Images, Videos, Documents, PDF, Audio, Media Metadata, Transformations, Image Optimization, Compression, Thumbnail Generation, Media Versioning, Storage, Delivery, CDN Integration, Access Policies, Media Processing Pipeline, Lifecycle Management                                                                                                           | Editorial Text Content, Business Entities, HTML Rendering                                           | Access Policies, User Roles                                         | `MediaUploaded`, `MediaOptimized`, `ThumbnailGenerated`, `MediaDeleted`           |
| **Learning Platform**     | Courses, Modules, Lessons, Videos (References/Metadata), Quizzes, Assignments, Learning Paths, Progress, Assessments, Instructor Assignments, Cohorts                                                                                                                                                                                                           | Promotional Landing Pages, Course Marketing Articles, Binary Video Files                            | Media Projections, Taxonomy Projections, User Identities            | `CoursePublished`, `ModuleUpdated`, `LessonCompleted`, `AssessmentGraded`         |
| **Scholarships Platform** | Scholarship Programs, Funding Tiers, Eligibility Criteria, Application Workflows, Disbursement Schedules, Applicant Progress, Approvals                                                                                                                                                                                                                         | Scholarship Marketing Pages, Financial Aid Articles, Generic Static Content                         | Media Projections, University Projections, Country Projections      | `ScholarshipCreated`, `ApplicationSubmitted`, `FundsDisbursed`                    |
| **University Platform**   | University Profiles, Campuses, Departments, Faculties, Affiliations, Accreditation Data, Academic Calendars                                                                                                                                                                                                                                                     | University Landing Pages, Campus News Articles, Press Releases                                      | Media Projections, Country Projections                              | `UniversityOnboarded`, `CampusAdded`, `AccreditationUpdated`                      |
| **Country Platform**      | Country Profiles, Regions, Cities, Currencies, Timezones, Visa Regulations, Geo-boundaries, Demographics                                                                                                                                                                                                                                                        | Travel/Tourism Articles, Visa Guides (Editorial)                                                    | N/A                                                                 | `CountryUpdated`, `RegionAdded`, `CurrencyModified`                               |
| **[REJECTED/SUPERSEDED]** | *Generic B2B organization content (Corporate Hierarchies, B2B Contracts, Employee Rosters) is explicitly rejected by ADR-027. No central organization platform exists.* | N/A | N/A | N/A |

## 5. Expanded Ownership Definitions

### 5.1. Enterprise CMS Ownership

The Enterprise CMS is strictly limited to the presentation and editorial orchestration of the platform. Its scope includes:

- **Editorial Content:** Articles, News, Pages, Landing Pages, Static Pages, Content Blocks, Reusable Components, Banners, Announcements.
- **Organization & Taxonomy:** Categories, Tags, Authors.
- **Structure & Routing:** Navigation, Menus, Redirects, URL Management.
- **Optimization & Localization:** SEO, Localization.
- **Workflows:** Publishing Workflow, Review Workflow, Versioning, Editorial Content Governance, Enterprise Content Lifecycle.
- **Integrations:** Media References (linking to Media Platform assets).

### 5.2. Media Platform Ownership

The Media Platform is the centralized authority for all binary assets and their derivatives across the enterprise. Its scope extends far beyond basic storage:

- **Asset Types:** Images, Videos, Documents, PDF, Audio.
- **Processing & Optimization:** Transformations, Image Optimization, Compression, Thumbnail Generation, Media Processing Pipeline.
- **Management & Delivery:** Media Metadata, Media Versioning, Storage, Delivery, CDN Integration, Access Policies, Lifecycle Management.

### 5.3. Learning Platform Ownership

The Learning Platform maintains absolute sovereignty over the educational domain. Its scope is strictly business and academic:

- **Curriculum:** Courses, Modules, Lessons, Learning Paths.
- **Evaluation:** Quizzes, Assignments, Assessments.
- **Tracking:** Progress, Cohorts, Instructor Assignments.
- _Note: The Learning Platform manages the structured metadata of a Course, while the Enterprise CMS manages any bespoke promotional landing pages associated with it._

## 6. Architectural Impact & Future Phases

The formal adoption of this Enterprise Content Ownership Model provides critical architectural benefits as MANARATAK 2.0 scales:

- **Bounded Context Isolation:** Strictly isolating editorial workflows from business logic prevents the dreaded "god CMS" anti-pattern, ensuring the Enterprise CMS does not become a bottleneck for business domain evolution.
- **Clean Architecture & CQRS:** By enforcing the consumption of Read Models for cross-domain data (e.g., the CMS displaying a list of featured courses), the platform maintains high availability and decoupled performance.
- **Enterprise Governance:** Clear ownership boundaries accelerate team autonomy. The Media team, CMS team, and Learning team can evolve their respective platforms, schemas, and APIs independently.
- **Scalability & Maintainability:** Removing business logic from the CMS and offloading binary processing to the Media Platform ensures each service scales according to its specific resource profile (e.g., compute-heavy media processing vs. read-heavy content delivery).

## 7. Implementation Directives

This document mandates the following directives for all current and future development:

1. **No Architecture Redesign Required:** The current implementation conforms to this model. No code generation, repository changes, or API modifications are required.
2. **Documentation Alignment:** All architecture documents, implementation guides, and foundation documents must use the terminology defined in Section 3.1.
3. **Phase 16 Readiness:** MANARATAK 2.0 is officially ready to commence Phase 16 (Enterprise CMS Platform) under these strict ownership guidelines.

**Final Verdict:** APPROVED. The Enterprise Content Ownership Model is hereby adopted as the official architectural standard.
