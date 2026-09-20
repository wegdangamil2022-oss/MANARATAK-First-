# MANARATAK 2.0: Phase 05 Foundation Closure & Localization Strategy

**Document ID:** PHASE-05-FOUNDATION-LOCALIZATION-CLOSURE  
**Status:** Architecture Baselined / Runtime Validation Pending  
**Phase:** 05 - Core Implementation / EAP  
**Scope:** Finalizing Phase 05 i18n foundation, Vite environment declarations, localization ownership boundaries, and alignment of shared services implementation status.

---

## 1. Executive Summary & Strategy Decisions

1. **Official Default Language:** MANARATAK's primary and official default UI language is Arabic (`ar`).
2. **First-Visit Default:** Both Web (`apps/web`) and Admin (`apps/admin`) applications default to Arabic (`ar`) on first visit when no saved language preference exists in `localStorage`.
3. **Secondary Language Support:** English (`en`) is fully supported as a secondary UI language and can be toggled dynamically by the user.
4. **Vite Client Types:** `apps/web/src/vite-env.d.ts` is established with `/// <reference types="vite/client" />` to provide full TypeScript environment typing (`import.meta.env`) across web features and routes.
5. **Current Runtime Boundary:** Audit, Identity, Authorization, and Settings have Prisma-backed source implementations, but database behavior is `RUNTIME VALIDATION PENDING`. Unsupported shared services are explicitly unavailable in active composition. Malware scanning and sanitization fail closed when unconfigured.
6. **Phase 5 Traceability Matrix:** The official, detailed mapping and status of all Phase 5 shared services can be found in [Phase 5 Shared Services Traceability Matrix](./phase-05-traceability-matrix.md).

---

## 2. Localization Ownership Boundaries

- **Phase 05 (Core Foundation):**
  - Owns i18n core infrastructure (`I18nProvider`, translation hooks, dictionary typing, direction handling `dir="rtl"` / `dir="ltr"`, and fallback language state management).
  - Web and Admin providers default to Arabic (`ar`).
  
- **Phase 23 (Enterprise Administration Portal):**
  - Owns Admin portal Arabic-first UI implementation, localized dashboard components, and administrative workflows.
  
- **Phase 24 (Enterprise Public Platform):**
  - Owns public localized route composition and URL routing.
  - Multilingual public URL routing (such as `/ar/courses`, `/en/courses`, `/ar/scholarships`, `/en/scholarships`, `/ar/universities`, `/en/universities`) is explicitly deferred to Phase 24 and must not be implemented in Phase 05.

- **Domain Content Translations:**
  - Dynamic domain content translations (universities, scholarships, majors, courses, services, taxonomy, etc.) belong to their respective domain-owning phases (Phases 07–21).

---

## 3. Multilingual Public Routing Deferred to Phase 24

The following public route prefixes are documented for future implementation in Phase 24:
- `/ar/courses` & `/en/courses`
- `/ar/scholarships` & `/en/scholarships`
- `/ar/universities` & `/en/universities`
- `/ar/majors` & `/en/majors`
- `/ar/services` & `/en/services`
- `/ar/tools` & `/en/tools`

Phase 05 provides the `I18nProvider` state foundation without adding route-level path prefixes or changing router implementations.

---

## 4. Phase 06 P2 Integration Note

Phase 06 P2 consumes Phase 05 Background Jobs, Events, Audit, Monitoring, Settings, and EAP as integration foundations, but P2B only defines import queue contracts and does not implement production queue infrastructure. All background job processing is executed in-process/in-memory, meaning process restarts will purge active queue queues.
