> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase7 PartB Domain Contracts

## Canonical Consumption Status

Country, Region, City, Language, and Currency are shared canonical reference identities. Internal IDs are the stable relationship keys. ISO and other standard codes are canonical external keys or aliases used through `IReferenceResolver`; names are display values and must not be used as semantic keys.

Higher domains consume `IReferenceResolver` and must not query Phase 07 persistence tables directly. Country/Region/City hierarchy validation is enforced at the application boundary where the current source model permits it. Database foreign keys, existing-row validation, and backfills remain runtime-pending and may be executed only through the Greenfield Database Provisioning and Mutation Safety gate.

Implementation truth: country, currency, language, city persistence and active/inactive status are `IMPLEMENTED`; administrative-region lookup and source-level city/country compatibility checks are `IMPLEMENTED`; alias and historic-name storage, superseded/merged lifecycle, and full database constraints are `DEFERRED`. Country Study Destination editorial and operational semantics are outside Reference Data ownership.

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B — Domain Contracts

### Final Baseline v1.1

## 7.0 Introduction

This document defines the canonical Domain Contracts for Phase 7 (Enterprise Reference Data Platform). It translates the approved enterprise architectural baseline (Part A) into strongly-typed TypeScript domain contracts. These contracts establish the absolute Single Source of Truth (SSoT) for core global standards and reference concepts across the MANARATAK 2.0 ecosystem.

---

## 7.6.B Reference Foundation & Base Entity Contracts

_(Architectural Commentary: Establishes the foundational interface and lifecycle states for all reference entities across the enterprise platform. Every reference entity implements `IReferenceEntity` to ensure standard identity, localization, standard code tracking, and versioning capability.)_

```typescript
export type ReferenceLifecycleState = 'Active' | 'Superseded' | 'Deprecated' | 'Retired';

export interface IReferenceEntity {
  readonly id: string;
  readonly publicId: string;
  readonly slug: string;
  readonly canonicalName: string;
  readonly localizedNames: Record<string, string>;
  readonly standardCodes: readonly string[];
  readonly aliases: readonly string[];
  readonly state: ReferenceLifecycleState;
  readonly supersededByPublicId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

---

## 7.7.B Core Reference Entity Contracts

_(Architectural Commentary: Defines canonical domain entity representations for fundamental international datasets including Countries (ISO 3166-1), Currencies (ISO 4217), Languages (ISO 639), Regions (UN M49), Cities, Administrative Divisions (ISO 3166-2), Time Zones (IANA), and Standard Codes.)_

```typescript
export interface ICountryReference extends IReferenceEntity {
  readonly isoAlpha2: string;
  readonly isoAlpha3: string;
  readonly isoNumeric: string;
  readonly phoneCode: string;
  readonly defaultCurrencyCode: string;
}

export interface ICurrencyReference extends IReferenceEntity {
  readonly isoCode: string;
  readonly symbol: string;
  readonly exponent: number;
}

export interface ILanguageReference extends IReferenceEntity {
  readonly iso6391: string;
  readonly iso6392: string;
  readonly nativeName: string;
  readonly direction: 'ltr' | 'rtl';
}

export interface IRegionReference extends IReferenceEntity {
  readonly countryPublicId: string;
  readonly regionCode: string;
  readonly category: string;
}

export interface ICityReference extends IReferenceEntity {
  readonly regionPublicId: string;
  readonly countryPublicId: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export interface IAdminDivisionReference extends IReferenceEntity {
  readonly countryPublicId: string;
  readonly divisionCode: string;
  readonly divisionType:
    'State' | 'Province' | 'Governorate' | 'Prefecture' | 'Territory' | 'Municipality';
}

export interface ITimezoneReference extends IReferenceEntity {
  readonly ianaId: string;
  readonly utcOffset: string;
  readonly dstOffset?: string;
  readonly abbreviation: string;
}

export interface IStandardCodeReference extends IReferenceEntity {
  readonly authority: string;
  readonly codeIdentifier: string;
  readonly category: string;
  readonly effectiveDate: Date;
}
```

---

## 7.8.B Cross-Entity Mapping Contracts

_(Architectural Commentary: Governs explicit, normalized relational associations between countries and their associated standard legal tender currencies, official/spoken languages, and time zones.)_

```typescript
export interface ICountryCurrencyMapping {
  readonly countryPublicId: string;
  readonly currencyIsoCode: string;
  readonly isLegalTender: boolean;
  readonly isPrimaryCurrency: boolean;
  readonly effectiveFrom?: Date;
  readonly effectiveTo?: Date;
}

export interface ICountryLanguageMapping {
  readonly countryPublicId: string;
  readonly languageIsoCode: string;
  readonly isOfficialLanguage: boolean;
  readonly isSpokenLanguage: boolean;
  readonly percentageOfPopulation?: number;
}

export interface ICountryTimezoneMapping {
  readonly countryPublicId: string;
  readonly timezoneIanaId: string;
  readonly isPrimaryTimezone: boolean;
}
```

---

## 7.9.B Generic Hierarchy & DAG Contracts

_(Architectural Commentary: Establishes structural polyhierarchical graph representation and closure table management for complex nested hierarchies (such as administrative regions or academic taxonomies) with built-in DAG cycle detection.)_

```typescript
export interface IHierarchyNode {
  readonly nodeId: string;
  readonly nodeType: string;
  readonly parentNodeIds: readonly string[];
  readonly childNodeIds: readonly string[];
  readonly depth: number;
}

export interface IClosureTableRepository {
  maintainClosureAsync(ancestorId: string, descendantId: string, depth: number): Promise<void>;
  getAncestorsAsync(nodeId: string): Promise<readonly string[]>;
  getDescendantsAsync(nodeId: string): Promise<readonly string[]>;
  detectCycleAsync(ancestorId: string, descendantId: string): Promise<boolean>;
}
```

---

## 7.10.B Repository & Data Access Contracts

_(Architectural Commentary: Defines clean repository abstractions separating read-side query operations from write-side command operations for all reference entities.)_

```typescript
export interface IReferenceQueryRepository<T extends IReferenceEntity> {
  getByIdAsync(id: string): Promise<T | null>;
  getByPublicIdAsync(publicId: string): Promise<T | null>;
  getBySlugAsync(slug: string): Promise<T | null>;
  findByCodeAsync(code: string): Promise<readonly T[]>;
  findByAliasAsync(alias: string): Promise<readonly T[]>;
  autocompleteAsync(searchTerm: string, locale?: string): Promise<readonly T[]>;
}

export interface IReferenceCommandRepository<T extends IReferenceEntity> {
  createAsync(entity: T): Promise<void>;
  updateAsync(entity: T): Promise<void>;
  supersedeAsync(existingPublicId: string, replacementEntity: T): Promise<void>;
  deprecateAsync(publicId: string, reason: string): Promise<void>;
}
```

---

## 7.11.B Integration & Domain Event Contracts

_(Architectural Commentary: Defines event payloads for decoupled asynchronous integration across the MANARATAK ecosystem whenever reference entities undergo lifecycle changes.)_

```typescript
export interface IReferenceEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly publicId: string;
  readonly timestamp: Date;
}
```

---

## 7.11.B Import Match/Merge Ownership Contracts

To support incoming data from the Phase 06 Import Foundation without violating domain boundaries, this domain explicitly defines and owns the following lifecycle integration responsibilities:

- **Deterministic Match Key**: This domain defines and owns the deterministic match keys (such as standard codes and unique slug patterns) used to identify reference record overlaps.
- **Completeness Policy**: This domain defines and owns all validation rules and policies determining when reference data records are considered complete and eligible for active publication.
- **Merge/Overwrite Policy**: This domain defines and owns the merge rules (such as source authority precedence and immutable baseline fields) that govern how incoming data updates existing records.
- **Final Approval/Publish**: This domain owns final approval, administrative override pathways, and the transition of reference data into active operational states.
- **Phase 06 Role**: The Phase 06 Import Foundation is restricted to delivering raw extraction proposals, field diffs, and associated evidence and confidence metrics. It is strictly prohibited from writing directly to reference data tables.

---

## 7.12.B Contracts Review & Architectural Verification

_(Architectural Commentary: Final summary confirming adherence to Phase 7 architectural constraints, ADRs, and enterprise standards.)_

- **Zero Upward Dependency:** Phase 7 contracts depend ONLY on enterprise shared baseline specifications. They contain zero references to downstream platforms (Scholarships, Universities, Courses, etc.).
- **ADR-027 Alignment:** All B2B organizational/employer concepts are strictly excluded from Phase 7 contracts and resolved within their respective domain bounded contexts.
- **Pure TypeScript Standard:** Fully aligned with ADR-025. Contains zero C#, EF Core, or legacy object-relational mapping syntax.
- **Implementation Strictness:** Zero concrete execution logic exists in Part B. All implementations are strictly deferred to Part C (Implementation Guide).

---

### Status

- **Current Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING

---

### Navigation

- **Previous**: [Phase 07 — Architectural Baseline](phase-07-01-architectural-baseline.md)
- **Next**: [Phase 07 — Implementation Guide](phase-07-03-implementation-guide.md)
