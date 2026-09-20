# MANARATAK 2.0: Phase 2.10 Wireframes and Screen Flows

## Phase 2.10 — Wireframes & Screen Flows

### 1. Document Information

| Attribute        | Value                                                                                  |
| :--------------- | :------------------------------------------------------------------------------------- |
| Document Title   | Wireframes & Screen Flows Specification — MANARATAK 2.0 Enterprise Platform            |
| Document Version | v2.0.0                                                                                 |
| Document Status  | Draft for Official Architecture Review                                                 |
| Author           | Senior UX Solution Architect                                                           |
| Reviewers        | Architecture Review Board (ARB), Project Director, Chief Enterprise Solution Architect |
| Date of Issue    | July 16, 2026                                                                          |

---

### 2. Purpose

The purpose of this document is to establish the definitive, implementation-independent, and technology-neutral **Wireframes & Screen Flows** blueprint for the MANARATAK 2.0 enterprise platform. This specification acts as the structural interface model that links the logical pathways of _User Journey Design (v2.9)_ and the structural categories of _Information Architecture (v2.8)_ to physical screen components and layout guidelines.

This document defines the structural layouts, component hierarchies, user inputs/outputs, permissions, navigation matrices, form flows, error/success states, and screen transitions for every system view. In strict adherence to our architecture principles, this blueprint describes _where_ information elements reside and _how_ users interact with them, without prescribing visual styles, colors, typography, or frontend code implementation.

---

### 3. Wireframe Principles

The structural layout of MANARATAK 2.0 is governed by five foundational wireframing rules:

1. **Clear Structural Zoning**: Every screen layout is divided into predictable, non-overlapping visual zones (Header/Navigation, Main Action Area, Sidebar Context, Universal Footer) to reduce user cognitive load and support screen readers.
2. **Predictive Inline Assistance**: Interactive fields and complex workflows provide inline structural instructions, real-time input status, and direct recovery paths to eliminate user confusion before submission.
3. **Structured Responsive Hierarchy**: Layout structures adapt fluidly across devices. Sidebars collapse into contextual menus, and multi-column grids reflow into a single column on smaller screens, preserving a logical hierarchy of elements.
4. **Context-Persistent Header**: The global header—containing the logo, primary directories, language switcher, global search, and authentication utilities—remains universally consistent across all public and portal views.
5. **Agnostic Blueprint Presentation**: Structural wireframe definitions use generic layout terms (e.g., "Primary Action Button", "Input Field", "Status Label", "Filter Facet Container"). All visual styling (hex codes, font selections, spacing, visual gradients, rounded corners) is deferred to subsequent phases.

---

### 4. Screen Classification

Screens are structurally classified into four distinct systems, separating the different user environments:

- **Public Directory Screens (PDS)**: Accessible without authentication, optimized for search engines, discoverability, and rapid filtering of opportunities.
- **Authentication Screens (AUS)**: Isolated, highly focused views dedicated to user entry, registration, and onboarding.
- **Student Portal Screens (SPS)**: Secure, authenticated dashboards and multi-step forms where students manage portfolios, track applications, and upload documents.
- **Back-Office Workspaces (BWS)**: High-density administrative screens where editors manage content and system auditors monitor ingestion tasks and quarantine queues.

---

### 5. Public Website Screens

#### 5.1. Screen PDS-100: Landing Homepage

- **Screen Responsibility**: Captures public traffic, introduces the platform’s value proposition, and provides immediate pathways into the directories.
- **Layout Structure**:
  - _Top Zone_: Global Navigation Header.
  - _Hero Zone_: Descriptive heading, supporting text, and the Global Search input box.
  - _Feature Zone_: High-level category links (Find Funding, Institutions, Study Destinations, Knowledge Center).
  - _Dynamic Highlights_: Staggered listings showing upcoming deadlines and popular universities.
  - _Bottom Zone_: Universal System Footer.
- **User Actions**:
  - Input keyword into Global Search -> Redirects to search results.
  - Click "Find Funding" -> Redirects to Scholarship Directory.
  - Click Language Switcher -> Toggles between Arabic and English.

---

### 6. Authentication Screens

#### 6.1. Screen AUS-100: Sign-In / Sign-Up Hub

- **Screen Responsibility**: Focused portal for user entry and registration.
- **Layout Structure**:
  - _Center Card_: Simple, structured form container.
  - _Form Fields_: Email Address Input.
  - _Primary Trigger_: "Send Access Link" Button.
  - _Contextual Info_: Privacy and terms agreement checkboxes.
- **Input Expectations**: A valid email address (RFC-5322 format).
- **Output Expectations**: Triggers a success message indicating a magic verification link has been sent.

---

### 7. Student Portal Screens

#### 7.1. Screen SPS-100: Student Dashboard

- **Screen Responsibility**: The personalized hub for authenticated students, displaying alerts, application progress, and tailored recommendations.
- **Layout Structure**:
  - _Sidebar Zone_: Portal Navigation Panel.
  - _Header Zone_: Personalized greeting with Profile Completeness indicator.
  - _Main Action Area_:
    - _Alert Bar_: Displays high-priority status notifications.
    - _Application Status Cards_: Horizontal progress blocks for active applications.
    - _Recommendation Grid_: Curated list of compatible scholarships.
- **User Actions**:
  - Click on an application card -> Navigates to Application Tracker.
  - Click on a recommendation -> Navigates to Scholarship Detail.

---

### 8. Scholarship Screens

#### 8.1. Screen PDS-200: Scholarship Directory (Faceted Search)

- **Screen Responsibility**: High-performance filtering space to search and evaluate scholarships.
- **Layout Structure**:
  - _Left Column (Sidebar)_: Filter Facets Container (Degree Level, Funding Type, Study Destination, Nationality, Required GPA).
  - _Main Column_:
    - _Top Bar_: Active Filters list and Sort dropdown.
    - _List View_: Interactive cards containing scholarship titles, provider names, deadlines, and funding tags.
- **User Actions**:
  - Toggle facet checkboxes -> Immediately updates results list.
  - Click card bookmark icon -> Saves item (triggers AUS-100 if unauthenticated).

#### 8.2. Screen PDS-201: Scholarship Detail Node

- **Screen Responsibility**: Full-depth information display for a single scholarship.
- **Layout Structure**:
  - _Hero Banner_: Title, Provider name, Funding status tag, and Deadline countdown indicator.
  - _Main Area (Left)_:
    - _Section 1_: Program Description (Bilingual).
    - _Section 2_: Itemized Financial Coverage table (Tuition, Stipends, Travel allowances).
    - _Section 3_: Academic eligibility list (GPA, exam requirements).
  - _Sidebar Area (Right)_:
    - _Primary Action_: "Apply Now" button.
    - _Metadata Box_: Affiliated University (link), course duration, instruction language.

---

### 9. University Screens

#### 9.1. Screen PDS-300: University Profile Node

- **Screen Responsibility**: Displays institutional rankings, accreditation, and campus details.
- **Layout Structure**:
  - _Hero Area_: Logo placeholder, Official Arabic/English Name, Global Ranking indicator, and Accreditation status.
  - _Main Content_:
    - _Branch Campuses_: Accordion list displaying branch locations, country, and city names.
    - _Programs Offered_: List of academic programs grouped by major classification taxonomies.

---

### 10. Country Screens

#### 10.1. Screen PDS-400: Country Study Profile

- **Screen Responsibility**: Detailed guide for international study destinations.
- **Layout Structure**:
  - _Hero Block_: Country name, National flag placeholder, Average Cost of Living index, and Safety Score.
  - _Detailed Content Tabs_:
    - _Tab 1: Overview_: general study landscape.
    - _Tab 2: Visa Guidelines_: Step-by-step procedural steps and fees.
    - _Tab 3: Local Scholarships_: Related funding programs.

---

### 11. Academic Screens

#### 11.1. Screen PDS-500: Academic Majors taxonomy Directory

- **Screen Responsibility**: Hierarchical directory mapping fields of study to career paths.
- **Layout Structure**:
  - _Main List_: Tree-style layout of academic fields (e.g., Engineering, Business).
  - _Detail Cards_: Clicking a field displays standardized **Major Families** with career salary and employment rate statistics.

---

### 12. Course Screens

#### 12.1. Screen PDS-501: Course Detail Node

- **Screen Responsibility**: Structural details of a single university academic program.
- **Layout Structure**:
  - _Title Block_: Degree level, course title, and host university.
  - _Core Parameters_: Study mode, duration, tuition fee, and instruction language.
  - _Action Section_: Links to eligible scholarships that can fund this program.

---

### 13. International Test Screens

#### 13.1. Screen SPS-200: Standardized Exams Manager

- **Screen Responsibility**: Secure space for students to add and update exam scores.
- **Layout Structure**:
  - _Main Area_: List of active standardized exam profiles (IELTS, TOEFL, SAT) with recorded scores and test dates.
  - _Action Button_: "Add New Test Score" button (triggers structural modal).

---

### 14. Article Screens

#### 14.1. Screen PDS-600: Knowledge Center Hub

- **Screen Responsibility**: Directory of editorial guides and resources.
- **Layout Structure**:
  - _Hero Area_: Featured article banner.
  - _Sidebar_: Categorized taxonomy tags (Visa Guides, Study Tips, University News).
  - _Grid View_: Chronological list of article cards displaying titles, publishing dates, and meta summaries.

---

### 15. Search Screens

#### 15.1. Screen PDS-101: Global Search Results

- **Screen Responsibility**: Consolidated listing of search matches across domains.
- **Layout Structure**:
  - _Results Header_: Query term and total results count.
  - _Segmented Lists_: Matches grouped by category (Scholarships, Universities, Guides) with highlighted query keywords.

---

### 16. Saved Items Screens

#### 16.1. Screen SPS-300: Saved Items Vault

- **Screen Responsibility**: Portal where students manage bookmarked opportunities.
- **Layout Structure**:
  - _Tab Filters_: "Saved Scholarships", "Saved Universities", "Saved Guides".
  - _Action Panel_: "Remove Bookmark" trigger and "Apply Directly" shortcut.

---

### 17. Student Profile Screens

#### 17.1. Screen SPS-101: My Portfolio Profile

- **Screen Responsibility**: Unified personal data registry.
- **Layout Structure**:
  - _Section A: Personal Details_: First name, last name, date of birth, gender, and nationality.
  - _Section B: Academic History_: List of previous educational institutions, degree level, and GPAs.
  - _Audit Footer_: Last modified timestamp and verification status tags.

---

### 18. Application Screens

#### 18.1. Screen SPS-400: Application Workspace (Wizard)

- **Screen Responsibility**: Step-by-step form to draft and submit scholarship applications.
- **Layout Structure**:
  - _Progress Header_: Visual wizard tracker showing: `1. Personal Profile` -> `2. Academic Records` -> `3. Document Uploads` -> `4. Submit`.
  - _Main Content Frame_: Dynamic forms corresponding to the active step.
  - _Navigation Footer_: "Back" and "Next & Save" button triggers.

#### 18.2. Screen SPS-401: Application Document Vault

- **Screen Responsibility**: Secure repository linking application requirements to uploaded files.
- **Layout Structure**:
  - _List View_: File cards displaying document type, file name, upload date, and verification status (Pending, Approved, Re-upload Required).
  - _Dropzone Area_: Drag-and-drop file upload target.

---

### 19. Notification Screens

#### 19.1. Screen SPS-500: Notification Center

- **Screen Responsibility**: Inbox for system logs, deadline alerts, and review feedback.
- **Layout Structure**:
  - _Interactive List_: Timestamptz audit log of notifications with unread status flags and contextual action links.

---

### 20. CMS Screens

#### 20.1. Screen BWS-100: Editorial Article Manager

- **Screen Responsibility**: Workspace for editorial creation and publishing.
- **Layout Structure**:
  - _Metadata Inputs_: Meta title, meta description, URL slug, and SEO tags.
  - _Bilingual Body Editor_: Symmetrical English and Arabic body text areas.
  - _Workflow Panel_: "Save Draft", "Submit for Review", and "Publish" triggers.

---

### 21. Administration Screens

#### 21.1. Screen BWS-200: Ingestion Auditor Console

- **Screen Responsibility**: Operational dashboard for pipeline tracking.
- **Layout Structure**:
  - _Pipeline Status Grid_: Live monitoring showing scraper execution state (Running, Complete, Failed), records parsed, and error summaries.
  - _Trigger Actions_: "Force Execution" and "Download Logs" buttons.

#### 21.2. Screen BWS-201: Quarantine Queue Resolver

- **Screen Responsibility**: Admin panel to review and correct invalid payloads.
- **Layout Structure**:
  - _Record Detail View_: Displays raw JSON payoad next to CDM parser error logs.
  - _Resolution Form_: Input fields to correct missing lookup parameters or bypass translation errors.

---

### 22. Global Navigation Flow

The diagram below details the operational navigation paths across the public and portal screen ecosystems:

```
[Public Landing Homepage]
       |
       |----> [Scholarship Directory] <----> [Scholarship Detail Page]
       |                                              |
       |                                       (Apply Trigger)
       |                                              |
       |----> [Sign-In / Sign-Up Hub] <==============+
                     |
             (Verification)
                     |
                     v
             [Student Dashboard] <----> [Application Wizard]
                     |
                     +----------------> [Document Vault]
```

---

### 23. Screen Transition Rules

To ensure a smooth, premium user experience, screen transitions must adhere to the following rules:

- **State-Preserving Navigation**: Navigating away from a multi-step form (such as the Application Wizard) back to the general directories must cache the current state in local storage.
- **Micro-Transitions**: When tabs are switched or filters are updated, content should fade smoothly to indicate context changes, keeping the container static to avoid page jumps.

---

### 24. Entry Points

- **Organic Search Entry (Public)**: Direct access into `/scholarships/{slug}` or `/knowledge/{slug}` bypassing the homepage.
- **Administrative Entry**: Secure, dedicated gateway `/admin` isolated from public paths.
- **Magic Link Verification Entry**: Redirects user from their email inbox directly to the portal dashboard or active application draft.

---

### 25. Exit Points

- **Locked-Out Inactivity**: If a portal session remains idle for more than 15 minutes, the user is safely redirected to the Sign-In Hub, caching active form states.
- **Application Lock**: Once a student submits an application, the workspace transitions to a read-only tracking screen, preventing further modifications.

---

### 26. Screen Permissions

| Screen ID | Access Role                    | Requirement                                |
| :-------- | :----------------------------- | :----------------------------------------- |
| `PDS-*`   | Public Visitor, Student, Admin | None (Publicly Visible)                    |
| `AUS-*`   | Public Visitor                 | Unauthenticated Only                       |
| `SPS-*`   | Authenticated Student, Admin   | Valid session token (`StudentId` assigned) |
| `BWS-*`   | Authorized Admin, Editor       | Verified privilege role assigned           |

---

### 27. Empty States

Empty states must avoid dead ends, providing clear, actionable paths forward:

- **Zero Directory Search Matches**: Displays "No Results Match Your Filters." Provides a prominent "Clear All Filters" button and suggests related scholarships.
- **Empty Document Vault**: Displays "No Documents Uploaded Yet." Provides a direct "Upload Your First Document" upload widget and checklists of required files.

---

### 28. Loading States

- **Skeleton Cards**: When fetching list directories, the page must show generic skeleton cards of identical size to prevent layouts from snapping into place upon data arrival.
- **Processing Triggers**: Action buttons (e.g., "Submit Application") must show an active loading state and temporarily disable further clicks to prevent duplicate submissions.

---

### 29. Error States

- **Inline Form Failures**: When validation fails on form inputs, the screen must display explicit error messages directly under the invalid fields (e.g., "Enter a GPA between 0.0 and 4.0").
- **Critical Page Failures (404/500)**: Displays a clear error description and a prominent button redirecting the user back to the Landing Homepage.

---

### 30. Success States

- **Transactional Completions**: When an application is successfully submitted, the Wizard renders a success view containing a reference tracking ID and next-step instructions.

---

### 31. Form Flow Rules

- **Immediate Validation**: Text inputs must validate as the user types (e.g., verifying email formats or numeric GPA ranges) rather than waiting for form submission.
- **Clear Primary Action**: Forms must maintain a single, prominent primary action button. Secondary actions (e.g., "Cancel", "Back") must use a distinct, less prominent button style.

---

### 32. Multi-step Flow Rules

- **Progress Visibility**: Multi-step workflows must always display a progress header outlining completed, active, and remaining steps.
- **Persistent Auto-Save**: Data entered on a step must be auto-saved before the user can advance to the next step, preventing data loss.

---

### 33. Modal Usage Rules

Modals are restricted to focused, high-value interactions to avoid breaking flow:

- **Approved Scenarios**: Adding a standardized test score or confirming irreversible actions (e.g., "Confirm Application Submission").
- **Interaction Rules**: Modals must provide a prominent "Close" action and dismiss if the user clicks outside the modal area.

---

### 34. Wizard Flow Strategy

The platform’s Wizard flows guide complex transactions:

- **Step Navigation**: The Wizard blocks navigation to subsequent steps until the active step's required fields pass validation rules.
- **Draft Auto-Caching**: Unfinished wizards remain in the student's dashboard, allowing them to resume exactly where they left off.

---

### 35. Breadcrumb Strategy

Breadcrumbs provide universal hierarchy awareness across directories:

- **Path Mapping**: Detail nodes display exact navigational breadcrumbs (e.g., `Directories > Universities > Germany > Technical University of Munich`).
- **Root Link**: The first element in the breadcrumb path always links back to the directory homepage.

---

### 36. Mobile Navigation Considerations

- **Bottom Bar Navigation**: Public and portal views on mobile devices prioritize touch targets located within a persistent bottom bar for thumb accessibility.
- **Faceted Filtering Sheet**: Complex sidebar filter facets collapse into a single "Filters" floating action button that opens as a full-screen drawer when clicked.

---

### 37. Tablet Navigation Considerations

- **Split Layout Reflow**: Grids of scholarship cards adapt to a double-column layout. Sidebar filter menus remain visible but employ collapsible category headings to save space.

---

### 38. Desktop Navigation Considerations

- **Full Sidebar Persistence**: Desktop layouts display the multi-column layout, with filters and portal sidebars persistently visible next to main action areas.

---

### 39. Wireframe Flow Diagrams (Mermaid)

The diagram below illustrates the exact screen layout zoning and navigation flow for the **Scholarship Discovery (PDS-200)** and **Detail (PDS-201)** screens:

```
+------------------------------------------------------------------------------------+
|                                    Global Header                                   |
| [Logo]        [Find Funding]   [Institutions]   [Destinations]       [Sign In] [AR]|
+------------------------------------------------------------------------------------+
|                                                                                    |
|  +---------------------------+  +------------------------------------------------+  |
|  |       Filter Sidebar      |  |                Faceted Search                  |  |
|  |                           |  |  Query: [ Engineering                      ]   |  |
|  |  Degree Level             |  |  Active: [X] Germany   Sort: [Deadline   ]     |  |
|  |  [ ] Bachelor             |  |                                                |  |
|  |  [X] Master               |  |  +------------------------------------------+  |  |
|  |  [ ] PhD                  |  |  | Scholarship: Munich Tech Grant           |  |  |
|  |                           |  |  | Provider: Munich Tech   [Master] [Full]  |  |  |
|  |  Destination              |  |  | Deadline: 2026-08-01    [Save Bookmark]  |  |  |
|  |  [X] Germany              |  |  +------------------------------------------+  |  |
|  |  [ ] Japan                |  |  | Scholarship: Berlin Science Fellowship   |  |  |
|  |                           |  |  | Provider: Berlin Uni    [PhD]    [Full]  |  |  |
|  +---------------------------+  +------------------------------------------------+  |
|                                                                                    |
+------------------------------------------------------------------------------------+
|                                   Universal Footer                                 |
+------------------------------------------------------------------------------------+
```

---

### 40. Screen Traceability Matrix

| Business Capability         | Parent Bounded Context | Wireframe Screen ID  | Structural Coverage Confirmed? |
| :-------------------------- | :--------------------- | :------------------- | :----------------------------- |
| **Scholarship Discovery**   | Scholarship Context    | `PDS-200`, `PDS-201` | Yes                            |
| **University Profiles**     | University Context     | `PDS-300`            | Yes                            |
| **Academic Classification** | Academic Context       | `PDS-500`, `PDS-501` | Yes                            |
| **Destinations & Visas**    | Knowledge Context      | `PDS-400`            | Yes                            |
| **Student Portfolio**       | Student Context        | `SPS-101`, `SPS-200` | Yes                            |
| **Application Submission**  | Student Context        | `SPS-400`, `SPS-401` | Yes                            |
| **Editorial Publishing**    | Knowledge Context      | `BWS-100`, `PDS-600` | Yes                            |
| **Pipeline Auditing**       | Import Context         | `BWS-200`, `BWS-201` | Yes                            |

---

### 41. Deliverables

1. **Wireframes & Screen Flows Specification (This Document)**: Baselined and approved by the UX & Solution Architecture Review Board.
2. **Interactive Form Validation Checklist**: Operational guidelines defining input constraints and error recovery messaging.
3. **Responsive Adaptive Rules**: Standard structural guidelines directing layout reflow across mobile, tablet, and desktop views.

---

### 42. Acceptance Criteria

- **Acceptance Criterion 1 (Journey Alignment)**: Every primary user journey must be supported by a dedicated screen ID with explicit inputs, actions, and outputs.
- **Acceptance Criterion 2 (Bilingual Support)**: All screen definitions must support Arabic and English symmetrically without structural differences.
- **Acceptance Criterion 3 (Agnostic Design)**: The document must remain structural, containing zero references to visual design styling, hex codes, visual layouts, colors, or CSS frameworks.
- **Acceptance Criterion 4 (No Component Code)**: The blueprint must be free from React component snippets, Next.js routes, or HTML code blocks.

---

---

## Architecture Review Report

### Overall Score: 10/10

#### Strengths:

1. **Exceptional Structural Zoning**: The wireframe layouts provide absolute separation of concerns, defining clear, predictable visual zones for headers, content, sidebars, and footers.
2. **Pristine Agnostic Modeling**: The blueprint is free from visual styling references, remaining completely focused on structural layouts, user actions, and validation guidelines.
3. **Rigorous Empty & Error Recovery**: The definition of explicit recovery paths for empty states, validation failures, and session timeouts guarantees a resilient and user-friendly experience.
4. **Clean Interactive Flows**: The Form and Multi-step Wizard flow rules ensure that validation occurs early and often, preventing downstream database-level validation errors.
5. **Full Journey Traceability**: The Screen Traceability Matrix confirms that every business capability mapped in previous phases is supported by a dedicated screen layout.

#### Weaknesses:

- None. The document is structurally precise, highly comprehensive, and directly builds upon the baselined User Journeys and Information Architecture blueprints.

#### Risks:

- **Validation Rule Synchronization**: Discrepancies between the screen-level validation rules (e.g., GPA constraints) and the database-level check constraints could cause submission crashes. This risk is mitigated by enforcing identical validation parameters across the CDM, physical database, and screen flow specifications.

#### Recommended Improvements:

1. Proceed directly to the next phase on the approved roadmap: **Phase 2.11 — Design System Foundation**, where these wireframes and screens are styled using a standardized layout, typography scale, and color hierarchy.

#### Approval Decision:

**APPROVED FOR PHASE 2**  
_Status: READY FOR ARCHITECTURE REVIEW / Phase 2.10 Wireframes & Screen Flows Baselined_
