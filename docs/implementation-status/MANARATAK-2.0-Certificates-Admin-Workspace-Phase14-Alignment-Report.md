# MANARATAK 2.0 - Certificates Admin Workspace Phase 14 Alignment Report

**Date:** July 28, 2026  
**Phase Target:** Phase 23 (Enterprise Administration Portal) & Phase 14 (Certificates Engine Platform)  
**Related Domain Phases:** Phase 13 (Courses & Learning Platform), Phase 15 (Student Workspace & Profile), Phase 05 (EAP Enterprise Assets Platform), Phase 24 (Enterprise Public Platform Composition)  
**Status:** SUPERSEDED BY SOURCE-CLOSURE IMPLEMENTATION

---

## 1. Executive Summary

This report documents the implementation and architectural alignment of the **Certificates Admin Workspace** within MANARATAK 2.0 Enterprise Administration Portal (`@manaratak/admin` / Phase 23).

The workspace establishes a secure, compliant control-plane surface for issuing, verifying, revoking, and managing official certificate templates across student accomplishment programs while strictly adhering to cross-phase boundaries and governance rules.

---

## 2. Key Architecture & Domain Boundaries

1. **Phase 14 Ownership (Certificates Engine Platform):** Owns certificate issuance, verification, revocation, template definitions, digital signatures, and certificate lifecycle.
2. **Phase 13 Ownership (Courses & Learning Platform):** Owns course completion verification, academic progress, grades, and student eligibility.
3. **Phase 15 Ownership (Student Workspace):** Owns student profile and identity data.
4. **Phase 05 Ownership (EAP Enterprise Assets Platform):** Owns certificate PDF files, logos, and signature asset handles via EAP Asset Ref IDs.
5. **Phase 23 Ownership (Enterprise Administration Portal):** Owns admin UI, issuance request queues, template management, and operational controls.
6. **Phase 24 Ownership (Enterprise Public Platform):** Owns public verification page composition (`/verify-certificate`).
7. **Strict Boundary Rules:**
   - No editing student grades or course progress from Certificates Admin.
   - No editing course curriculum content from Certificates Admin.
   - No raw file URLs in UI; all PDF/media assets referenced via Phase 05 EAP asset handles.
   - No auto-issuance without verified eligibility from Phase 13 or explicit authorized admin action with audit reason.
   - **Strict Permanent Deletion Prohibition:** Issued certificates can NEVER be deleted permanently. Issued certificates can only be revoked with a mandatory documented reason and immutable audit trail.
   - Public verification page exposes verification status and protected student references without leaking private personal data.

---

## 3. Implemented Components & Routes

### 3.1 Components Created

- `apps/web/src/features/admin-preview/AdminCertificatesPreviewPage.tsx`
  - Main Certificate Registry List with lightweight, vertical row layout (Certificate ID/Number, Student Name & Ref, Source Program/Course, Issue Date, Status Badge, View Details).
  - Top 5 Summary Metrics: Total Certificates, Issued & Verifiable, Pending Requests, Revoked, Active Templates.
  - 3 Workstation Tabs:
    - **سجل الشهادات الصادرة (Main Registry List)**
    - **طلبات الإصدار المعلقة (Pending Issuances Queue)** with Phase 13 eligibility sources and Approve/Reject controls.
    - **نماذج وقوالب الشهادات (Certificate Templates)** with bilingual metadata, EAP logo & signature handles, paper styles, and interactive visual template preview.
  - Create Template Modal & Visual Certificate Preview Frame.

- `apps/web/src/features/admin-preview/AdminCertificateDetailPage.tsx`
  - Unified Certificate Detail Page (`/admin/certificates/:id`).
  - Displays Certificate ID, Student Reference & Name, Source Course Reference, Issue Date, Status, Template Used, Digital Signature Verification Status & Hash, QR / Public Link, EAP PDF Asset Handle, Audit History Ledger, and Admin Notes.
  - **Safe Administrative Actions Bar**:
    - Preview Certificate (interactive visual modal)
    - Issue Certificate / Approve Issuance Request
    - Verify Digital Signature against Phase 14 cryptographic ledger
    - Download PDF via Phase 05 EAP asset handle
    - Open Public Verification Page (`/verify-certificate?code=...`)
    - Revoke Certificate with mandatory revocation reason input modal
    - Archive Certificate
  - **Governance Warning Notice**: Explicitly highlights prohibition of permanent deletion and requirement of revocation reasons.

### 3.2 Registered Router Routes

- `/admin/certificates` -> `AdminCertificatesPreviewPage`
- `/admin/certificates/:id` -> `AdminCertificateDetailPage`

---

## 4. Verification & Quality Assurance

- **Build Status (`compile_applet`):** PASS - Clean build with zero TypeScript compilation errors.
- **Lint Status (`lint_applet`):** PASS - Clean lint with 0 ESLint warnings or errors.
- **RTL & Bilingual Support:** Fully verified with Arabic default RTL layout and English LTR text handling.
- **Public Verification Alignment:** Compatible with `CertificateVerificationPage` public verification flow (`/verify-certificate?code=...`).

---

## 5. Documentation Alignment

The following Phase 23 specification documents have been updated:

1. `docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md` (Added Section 23.A.12)
2. `docs/phases/phase-23-enterprise-administration-portal/phase-23-02-enterprise-administration-portal-structure-contracts.md` (Added Section 23.B.14 TypeScript Contracts)
3. `docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md` (Added Section 23.C.18 Operational Workflows)

---

**Approval:** Chief Enterprise Architect & ARB  
**Status:** Historical preview report. See `MANARATAK-2.0-Phase14-Source-Closure-and-Google-Studio-Runbook.md` for the real persistence-backed implementation and deferred runtime activation steps.
