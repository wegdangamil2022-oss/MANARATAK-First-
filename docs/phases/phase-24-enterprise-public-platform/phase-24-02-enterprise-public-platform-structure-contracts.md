# MANARATAK 2.0: Phase 24 (Enterprise Public Platform) Structure Contracts

**Document ID:** PHASE-24-02-STRUCT-CONTRACTS  
**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING  
**Phase:** 24  
**Domain:** Enterprise Public Platform  
**Artifact:** Part B - Public Platform Structure Contracts  

---

> **W7 source-rebaseline notice (2026-09-07):** This specification is source-rebaselined under `MNT-AUD-0045` against the remediated owner APIs, Admin/Public composition, source tests and cross-phase traceability. This status is not runtime or production certification; external DB/provider/deployment/browser evidence remains `RUNTIME_EVIDENCE_PENDING`. See `docs/remediation/P23_P24_REBASELINE_TRACEABILITY.md`.

### Navigation
[← Phase 23: Enterprise Administration Portal](../phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 24: Architecture Spec (Part A)](./phase-24-01-enterprise-public-platform-architecture-specification.md) | [Phase 24: Public Pages & User Experience (Part C)](./phase-24-03-enterprise-public-platform-public-pages-user-experience.md) | [Roadmap Completion ]

---

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.  
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.  
> **Note:** The contracts declared in Part B represent public page composition, layout structure, and UX navigation contracts, NOT domain persistence contracts, ORM models, or database schemas.  

---

## Part B — Public Platform Structure Contracts

### 24.B.1 Public Platform Structure Contract

**Architectural Commentary**  
The public platform structure defines the composition layout and navigational routing for visitor-facing pages. It presents underlying domain read-models without creating separate domain databases.

```typescript
/**
 * Core contract defining the composition structure of the MANARATAK Public Platform.
 * Represents public page assembly and navigation contracts only.
 */
export interface IPublicPlatformStructure {
  /** The primary public entry point to the educational ecosystem */
  readonly homepage: IHomepageStructure;

  /** Domain-specific public composition sections mirroring roadmap taxonomies */
  readonly sections: IPublicSectionRegistry;

  /** Navigation and relationship graph presentation */
  readonly navigation: INavigationPhilosophy;

  /** Published-owner + CMS composition governance consumed by the public platform */
  readonly sourceGovernance: IPublicCompositionSourceGovernance;

  /** Foundational design and composition principles */
  readonly principles: IPublicPlatformPrinciples;
}
```

---

### 24.B.2 Homepage Structure Contract

**Architectural Commentary**  
The homepage is codified to provide immediate clarity and navigational routing across approved roadmap domains.

```typescript
/**
 * Contract defining the structural hierarchy of the Homepage composition.
 */
export interface IHomepageStructure {
  readonly header: IHeaderSection;
  readonly hero: IHeroSection;
  readonly dynamicPreviews: IDynamicPreviewSection[];
}

export interface IHeaderSection {
  readonly elements: [
    'MANARATAK Logo',
    'Bilingual Platform Title (Arabic & English)',
    'Public Search Bar (Delegates query execution to search engine)',
    'User Login Button (Routes to Phase 15 — Enterprise Student Platform)',
    'Navigation Menu Control',
  ];
}

export interface IHeroSection {
  readonly introduction: string;
  readonly purpose: 'Clear articulation of the MANARATAK mission and discovery pathways';
}

export interface IDynamicPreviewSection {
  readonly sectionName: string;
  readonly shortDescription: string;
  readonly featuredItems: IFeaturedItemSubset[];
  readonly action: 'View More Action -> Dedicated Public Domain Section';
}

/**
 * Initial curated domain sections on the homepage within Roadmap v6.0.
 */
export type TInitialHomepageSections =
  | 'Scholarships'
  | 'Courses'
  | 'Educational Tools'
  | 'Universities'
  | 'Educational Services'
  | 'Majors'
  | 'Countries'
  | 'Articles';
```

---

### 24.B.3 Public Sections Contract

**Architectural Commentary**  
The public platform presents cohesive, domain-specific sections mirroring approved roadmap entities. In accordance with ADR-027, no standalone Organizations or Employers section exists; recruitment employer metadata is scoped under Phase 21 Career & Alumni read-models. Authenticated student workspace state is owned exclusively by Phase 15 — Enterprise Student Platform and is excluded from public section registries.

```typescript
/**
 * Contract defining approved public section composition targets within Roadmap v6.0.
 * Does NOT define database schemas or domain persistence registries.
 */
export interface IPublicSectionRegistry {
  readonly home: ISectionCompositionContract;
  readonly scholarships: ISectionCompositionContract;
  readonly universities: ISectionCompositionContract;
  readonly countries: ISectionCompositionContract;
  readonly majors: ISectionCompositionContract;
  readonly courses: ISectionCompositionContract;
  readonly articles: ISectionCompositionContract;
  readonly educationalServices: ISectionCompositionContract;
  readonly educationalTools: ISectionCompositionContract;
  readonly publicSearch: ISectionCompositionContract;
  readonly careerAndAlumni: ISectionCompositionContract;

  /** Extensibility bounded strictly to approved 24-phase roadmap domains */
  readonly isExtensibleWithinRoadmap: boolean; // true
}

export interface ISectionCompositionContract {
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly targetDomainPhase: string;
  readonly isPubliclyAccessible: boolean;
}
```

---

### 24.B.4 Educational Relationships Contract

**Architectural Commentary**  
Public page rendering presents interconnected semantic pathways between educational read-models, facilitating contextual navigation.

```typescript
/**
 * Contract defining the public presentation of interconnected semantic pathways.
 */
export interface IEducationalRelationshipGraph {
  readonly structuralLinks: IEntityLinkage[];
  readonly semanticLinks: ISemanticLinkage[];
}

export interface IEntityLinkage {
  readonly sourceDomain: string;
  readonly targetDomain: string;
  readonly behavior: 'Direct public navigational pathway';
}

/** Core public relationship pathways */
export const CoreRelationships: IEntityLinkage[] = [
  { sourceDomain: 'Scholarship (Phase 12)', targetDomain: 'Major (Phase 10)', behavior: 'Direct public navigational pathway' },
  { sourceDomain: 'Major (Phase 10)', targetDomain: 'University (Phase 11)', behavior: 'Direct public navigational pathway' },
  { sourceDomain: 'Major (Phase 10)', targetDomain: 'Course (Phase 13)', behavior: 'Direct public navigational pathway' },
  { sourceDomain: 'Course (Phase 13)', targetDomain: 'Educational Service (Phase 20)', behavior: 'Direct public navigational pathway' },
  { sourceDomain: 'Educational Service (Phase 20)', targetDomain: 'Educational Tool (Phase 18)', behavior: 'Direct public navigational pathway' },
];

export interface ISemanticLinkage {
  readonly contextualTerm: string;
  readonly targetEntityPage: string;
  readonly rule: 'Educational terminology inside public content renders contextual navigation links';
}
```

---

### 24.B.5 Navigation Philosophy Contract

**Architectural Commentary**  
Navigation within Phase 24 is fluid and multi-dimensional, providing intuitive public routing across all discovery pathways.

```typescript
/**
 * Contract defining public routing mechanisms and navigation rules.
 */
export interface INavigationPhilosophy {
  readonly mechanisms: {
    mainNavigation: 'Persistent taxonomy menu across public layout';
    homepageSections: 'Curated entry points to roadmap domains';
    centralSearch: 'Visitor-facing intent query presentation';
    relatedContent: 'Contextual read-model suggestions on detail pages';
    educationalRelationships: 'Lateral movement through semantic links';
  };
  readonly objective: 'Navigation is intuitive, organized, and educational';
}
```

---

### 24.B.6 Public Search Presentation Contract

**Architectural Commentary**  
Public search is a visitor-facing result composition layer. Phase 24 presents search UI components and formats search results using read-models/indexes exposed by shared search infrastructure, without operating an independent search engine or index.

```typescript
/**
 * Contract defining visitor-facing search presentation behavior.
 */
export interface IPublicSearchPresentation {
  readonly location: 'Master header navigation bar';
  readonly behavior: 'Captures visitor search queries and presents aggregated result sets';
  readonly engineDependency: 'Consumes search indexing services from platform foundation';
}
```

---

### 24.B.7 Public Composition Source Governance Contract

**Architectural Commentary**  
There is no separate Phase 23-owned public-visibility truth store. Phase 23 is a control-plane client of owner APIs: publish/unpublish/availability commands mutate the owning domain's lifecycle state, while homepage/navigation/section ordering is authored through Phase 16 CMS navigation/block contracts. Phase 24 consumes only those approved owner read models and CMS composition records; it does not invent an additional visibility flag.

```typescript
/** Public composition is derived from authoritative owner lifecycle + P16 CMS composition. */
export interface IPublicCompositionSourceGovernance {
  readonly domainVisibilityAuthority: 'Owning P7-P21 domain publication/availability lifecycle';
  readonly editorialCompositionAuthority: 'Phase 16 CMS navigation and published block/content lifecycle';
  readonly adminRole: 'Phase 23 invokes owner/CMS commands through approved APIs; no duplicate visibility persistence';
  readonly publicRole: 'Phase 24 composes approved owner read models; no business-truth mutation';
  readonly constraint: 'An item is renderable only when its owner public contract exposes it; homepage/navigation ordering comes from published CMS composition where configured';
}
```

---

### 24.B.8 Platform Extensibility & Scope Governance

**Architectural Commentary**  
Phase 24 is designed as a modular composition chassis bounded strictly to the approved 24-phase Roadmap v6.0.

```typescript
/**
 * Contract governing public composition extensibility within Roadmap v6.0.
 */
export interface IPlatformExtensibilityGovernance {
  readonly supportsRoadmapExpansion: boolean; // true
  readonly allowsUnapprovedPhases: boolean; // false (Restricted to 24-phase roadmap)
  readonly supportedCompositionTargets: string[];
}

export const SupportedCompositionTargets: string[] = [
  'Scholarship Discovery Pages (Phase 12)',
  'University Catalog Pages (Phase 11)',
  'Country Study Destination Guides (Phases 07 & 16)',
  'Course Catalog & Detail Pages (Phase 13)',
  'CMS Articles & Editorial Pages (Phase 16)',
  'Educational Tools & AI-Assisted Student Tools (Phases 17 & 18)',
  'Educational Services Landing Pages (Phase 20)',
  'Career & Alumni Read-Model Pages (Phase 21)',
  'Certificate Verification Pages (Phase 14)',
];
```

---

### 24.B.9 Visual Identity Principles Contract

**Architectural Commentary**  
Visual identity enforces institutional trust and visual consistency across all public views.

```typescript
/**
 * Contract defining structural application of brand identity in public pages.
 */
export interface IVisualIdentity {
  readonly brandColors: {
    primary: 'Emerald Green (Education, growth, trust)';
    accent: 'Royal Gold (Excellence, achievement, prestige)';
    background: 'White / Warm Neutral Canvas (Clarity, readability, professionalism)';
  };
  readonly identityEmphasis: [
    'Professionalism',
    'Simplicity',
    'Educational Trust',
    'Modern Clean Layout',
    'Visual Pacing and Spacing',
  ];
}
```

---

### 24.B.10 Public Platform Principles Contract

```typescript
/**
 * Enterprise principles governing public page composition.
 */
export interface IPublicPlatformPrinciples {
  readonly core: 'Organization First';
  readonly principles: [
    'Educational First',
    'Unified Discovery Ecosystem',
    'Connected Knowledge Pathways',
    'Consistent Public Navigation',
    'Simplicity & Clarity',
    'High Discoverability',
    'Enterprise Scalability within Roadmap v6.0',
  ];
}
```

---

### 24.B.11 Validation Rules & Boundary Rules

```typescript
export interface IPublicStructureValidation {
  validateNoStandaloneOrganizationsSection(): boolean; // Enforces ADR-027
  validateNoStudentWorkspaceInPublicRegistry(): boolean; // Enforces Phase 15 boundary
  validateCommandAndCompositionSeparation(): boolean; // Enforces Phase 23 vs Phase 24 boundary
}
```

---

### 24.B.12 Final Contracts Review

- **Structure Validation:** Validated. Public page composition and navigation are codified without creating redundant domain registries.
- **Boundary Validation:** Validated. ADR-027 compliance enforced (no standalone Organizations section). Phase 15 student workspace excluded from public registries.
- **Governance Validation:** Validated. Command/composition separation between Phase 23 and Phase 24 established.
- **Readiness Review:** Approved for baseline.

---

### Navigation
[← Phase 23: Enterprise Administration Portal](../phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md) | [Phase 24: Architecture Spec (Part A)](./phase-24-01-enterprise-public-platform-architecture-specification.md) | [Phase 24: Public Pages & User Experience (Part C)](./phase-24-03-enterprise-public-platform-public-pages-user-experience.md) | [Roadmap Completion ]

---

**Status:** APPROVED FOR BASELINE / DOCUMENTATION READY  
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)  
