# MANARATAK 2.0: Phase 23 Domain Import Centers Refactor Report

**Document ID:** MANARATAK-20-PHASE-23-DOMAIN-IMPORT-CENTERS-REFACTOR-REPORT  
**Date:** July 27, 2026  
**Phase:** Phase 23 — Enterprise Administration Portal  
**Status:** Completed & Verified  

---

## 1. Executive Summary

In accordance with Phase 23 Enterprise Administration Portal governance, the Admin Import Management flow has been refactored. The main `/admin/imports` page retains its generic multi-domain summary overview, while clicking "Start Import" on any domain card now routes administrators to a **Dedicated Domain Import Center page** (`/admin/imports/:domainKey`) featuring domain-tailored provider cards and a 6-step Import Wizard.

---

## 2. Added Routes & Component Architecture

### A. Route Configuration (`/apps/web/src/router/index.tsx`)
- Main Overview Route: `/admin/imports` → `AdminImportsPreviewPage`
- Dedicated Domain Import Center Route: `/admin/imports/:domainKey` → `AdminDomainImportCenterPage`

Supported Domain Route Parameters:
1. `/admin/imports/scholarships`
2. `/admin/imports/universities`
3. `/admin/imports/majors`
4. `/admin/imports/courses`
5. `/admin/imports/international-tests`
6. `/admin/imports/services`
7. `/admin/imports/cms`

---

## 3. Retained Main Domain Cards (`/admin/imports`)

The main `/admin/imports` overview page maintains its simple, high-contrast domain summary cards for all 7 catalog domains. Each card displays:
- Domain Icon & Title
- Supported Inputs: `CSV/JSON`, `Paste`, `Official URL`, `Connector`
- Statistics Grid: `Imported`, `Incomplete`, `Transferred`, `Failed`
- Primary Action: `Start Import` → Navigates to `/admin/imports/:domainKey` (Modal popups removed!)
- Secondary Action: `Open Domain Workspace` → Navigates to `/admin/:domainKey`

Below the domain cards, `/admin/imports` retains generic, read-only summaries for:
- Active Data Sources & Connectors
- Import Operations Center (IOC) Batch Audit Logs
- Scheduled Imports Preview

---

## 4. Domain-Specific Provider Cards

Each dedicated Domain Import Center (`/admin/imports/:domainKey`) renders simple, un-cluttered provider/source cards tailored specifically to that domain:

| Domain | Configured Provider Feeds | Source Types & Trust Badges |
|---|---|---|
| **Scholarships** | DAAD German Academic Exchange, Chevening UK Scholarships, ScholarshipPortal Feed, Saudi MOE Scholarship Channel, University Scholarship Pages | Official Foundation (98%), Official Government (100%), Aggregator (85%), Official University (95%) |
| **Courses** | Coursera Partner Catalog, edX Open Catalog, Cisco Networking Academy, AWS Skill Builder, Microsoft Learn | Trusted Platform (90%-95%) |
| **Universities** | Official Ministry University Registry, QS World Ranking Data Portal (Enrichment Only), Global University Directory (WHED) | Official Government (100%), Aggregator (92%), Official Foundation (95%) |
| **International Tests** | IELTS Official Test Center Registry, TOEFL / ETS Test Center Ingestion, British Council Exam Registry | Official Foundation (95%-98%) |
| **Majors** | UNESCO ISCED Classification Directory, CIP Classification Registry (NCES), Official University Program Catalogs | Official Government (100%), Official University (95%) |
| **Services** | Ministry Student Services Catalog, Academic Guidance & Advisory Registry | Official Government (100%), Official Foundation (90%) |
| **CMS Articles** | Official Education Ministry News Feed, Ministry Press Release Portal | Official Government (100%) |

Each provider card includes:
- Provider/Source Name & Official URL
- Source Type & Trust Score Badge (e.g. `100% Verified`, `85% Trusted`, `Needs Verification`)
- Last Check Timestamp
- Metric Badges: `Imported`, `Transferred`, `Incomplete`, `Failed`
- Status Badge: `Active`, `Needs Setup`, `Disabled`
- Action Buttons: `Test Source`, `Start Import From This Source`, `Disable/Enable Source`

*Clean Design Enforcement:* Technical clutter like RAM usage, SDK version, latency, or internal engine settings are excluded.

---

## 5. 6-Step Import Wizard Workflow

Clicking "Start Import From This Source" launches an execution stepper:
- **Step 1: Confirm Source & Domain:** Displays domain workspace handoff path, provider details, trust score, and transfer safety guarantee notice.
- **Step 2: Choose Input Method:** Selects `CSV/JSON File Upload`, `Paste Data`, `Official URL` (includes mandatory notice: *"URL extraction is staged for review; automated extraction will be added later"*), `Registered Connector`, or `Demo Dataset`.
- **Step 3: Define Processing Limits:** Selects batch processing boundaries (`10 Records`, `50 Records`, `100 Records`, or `Custom Limit` up to 200).
- **Step 4: Admin Engine Rules:** Toggles operational rules:
  - *Focus on Master / Postgraduate level opportunities*
  - *Ignore expired / past opportunities*
  - *Require official source URL on all records*
  - *Mark missing application deadline as Needs Review*
  - *Import bilingual Arabic / English text if available*
  - Plus custom engine notes.
- **Step 5: Review Run:** High-contrast summary review before batch execution.
- **Step 6: Batch Execution & Results:**
  - Valid records transferred to domain workspace as `Needs Review`.
  - Incomplete records quarantined with field reasons.
  - Failed records logged with error reasons.
  - Zero auto-publishing confirmed.

---

## 6. Architectural Safety Confirmations

| Safety Requirement | Implementation Status |
|---|---|
| **No Auto-Publishing** | Records transfer to domain workspace in `Needs Review` / `Imported` state. Domain workspace is where final review and publishing happen. |
| **No Full Web Crawling** | Official URL import accepts 1 URL only as a staged reference. |
| **Controlled Source Ingestion** | Registered connector ingestion is source-scoped and verified. |
| **No Unsafe Global Actions** | Unsafe actions ("Run All", "Stop All", "Pause All") are excluded. |
| **No Public Data Exposure** | Admin data is isolated inside protected admin preview views. |

---

## 7. Updated Phase 23 Documentation

The following Phase 23 specification documents were updated to record the Domain Import Centers and 6-step Import Wizard architecture:
1. `docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md`
2. `docs/phases/phase-23-enterprise-administration-portal/phase-23-02-enterprise-administration-portal-structure-contracts.md` (Added `IAdminImportDomainCard`, `IAdminDomainImportCenter`, `IAdminImportProviderCard`, `IAdminImportWizardState`, `IAdminImportInstructionNote`, `IAdminImportExecutionSummary`)
3. `docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md`

---

## 8. Verification Results

| Check / Tool | Status | Result |
|---|---|---|
| **TypeScript Compilation (`compile_applet`)** | **PASSED** | Applet compiled cleanly with 0 errors. |
| **Linter (`lint_applet`)** | **PASSED** | ESLint executed with 0 errors and 0 warnings. |
| **RTL / Mobile Responsiveness** | **VERIFIED** | Full support for English & Arabic with flex/grid responsive wrappers. |
