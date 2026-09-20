> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 16 (Enterprise CMS Platform) Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B — Enterprise Domain Contracts

### 16.B.1 Foundation Contracts

**Architectural Commentary**
The foundation contracts establish the core identity and structure of an editorial content node. These interfaces ensure that all content—whether articles, pages, or reusable blocks—is anchored to a canonical identifier that remains stable across translations and versions.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
/**
 * Governs the absolute, immutable identity of a Content Node across the enterprise.
 */
export interface IContentIdentity {
  contentId: string;
  defaultSlug: string;
  contentType: string; // Article, Page, LandingPage, Block
}
/**
 * The root aggregate representing a uniquely identifiable piece of editorial content.
 */
export interface IContentNode extends IReferenceEntity {
  identity: IContentIdentity;
  primaryLocale: string;
  createdAt: Date;
  createdBy: string;
  /**
   * A dictionary resolving locale codes to specific localized payload instances.
   */
  localizedPayloadReferences: Record<string, string>;
}
```

### 16.B.2 Editorial Content Contracts

**Architectural Commentary**
Editorial contracts define the specific topologies of content managed by the CMS. They remain decoupled from layout rendering, strictly holding the semantic data structures required for presentation layers to construct user interfaces.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
/**
 * Represents a time-sensitive informational publication.
 */
export interface IArticle extends IReferenceEntity {
  contentId: string;
  authorId: string;
  publishDate?: Date;
  estimatedReadingTimeMinutes: number;
  isFeatured: boolean;
}
/**
 * Represents an evergreen, structurally static informational page.
 */
export interface IPage extends IReferenceEntity {
  contentId: string;
  templateId: string;
  excludeFromNavigation: boolean;
}
/**
 * Represents a dynamically composed promotional or aggregation page.
 */
export interface ILandingPage extends IReferenceEntity {
  contentId: string;
  targetAudienceSegment: string;
  compositionLayoutId: string;
}
/**
 * Represents a high-priority, site-wide alert banner or announcement.
 */
export interface IAnnouncement extends IReferenceEntity {
  contentId: string;
  urgencyLevel: string; // Low, Medium, High, Critical
  expirationDate?: Date;
  targetSiteIdentifier: string;
}
```

### 16.B.3 Localization Contracts

**Architectural Commentary**
Localization contracts mandate that translations are treated as isolated, sparse overlays attached to the core content node. This structural separation permits independent publishing lifecycles per region.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
/**
 * Represents a specific translation payload for a content node.
 */
export interface ILocalizedContent extends IReferenceEntity {
  localizedId: string;
  contentId: string;
  localeCode: string; // e.g., "en-US", "ar-SA"

  title: string;
  excerpt: string;
  bodyRichText: string;

  lastModifiedAt: Date;
  lastModifiedBy: string;
}

export interface ILocaleDefinition {
  localeCode: string;
  fallbackLocale: string;
  isActive: boolean;
  isRtl: boolean;
}
```

### 16.B.4 Workflow & Lifecycle Contracts

**Architectural Commentary**
These contracts enforce editorial governance. They dictate the strict multi-stage transitions (Draft, Scheduled, Published, Archived) and enforce separation of duties via Maker-Checker validation rules before global distribution.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from "@manaratak/core";
export type PublishingState = 'Draft' | 'InReview' | 'Scheduled' | 'Published' | 'Archived';

/**
 * Defines the state machine transitions for a localized content payload.
 */
export interface IPublishingLifecycle {
  localizedId: string;
  state: PublishingState;
  updatedAt: Date;
}
/**
 * Represents a formal approval record satisfying Maker-Checker governance constraints.
 */
export interface IWorkflowApproval
{
    approvalId: string;
    localizedId: string;
    requestedBy: string; // Maker
    approvedBy: string;  // Checker
    approvedAt: Date;
    editorialComments: string;
}
```

### 16.B.5 SEO & Metadata Contracts

**Architectural Commentary**
SEO contracts ensure that every published entity natively supports global search engine visibility. This includes canonical routing constraints to prevent duplication penalties and structured metadata for external social syndication.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
export interface ISeoMetadata {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  keywords: string[];
}

export interface IOpenGraphMetadata {
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  ogType: string;
  twitterCardType: string;
}
```

### 16.B.6 Taxonomy Contracts

**Architectural Commentary**
Taxonomy contracts provide the hierarchical and folksonomic classification boundaries. They allow dynamic querying and programmatic aggregation of content across the enterprise distribution tier.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
export interface ICategory extends IReferenceEntity {
  categoryId: string;
  parentCategoryId: string;
  machineName: string;
  displayName: string;
}

export interface ITag extends IReferenceEntity {
  tagId: string;
  normalizedValue: string;
}
```

### 16.B.7 Navigation Contracts

**Architectural Commentary**
Navigation contracts govern the structural hierarchy and structural routing of the multi-site platform. They separate the visual menu presentations from the logical site taxonomy, enabling dynamic resolution of navigation nodes across regions and devices.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
/**
 * Represents a localized menu structure attached to a specific site or application.
 */
export interface INavigationMenu extends IReferenceEntity {
  menuId: string;
  siteIdentifier: string;
  locationKey: string; // e.g., "Header", "Footer", "Sidebar"
  nodes: INavigationNode[];
}
/**
 * Represents an individual item within a navigation hierarchy.
 */
export interface INavigationNode {
  nodeId: string;
  parentNodeId: string;
  displayText: string;
  targetUrl: string;
  targetContentId: string;
  sortOrder: number;
  openInNewWindow: boolean;
}
```

### 16.B.8 Composition & Widget Contracts

**Architectural Commentary**
Composition contracts define how dynamic pages are constructed from granular, reusable building blocks. Widgets represent real-time integration points where the presentation layer hydrates external read models (e.g., Course Catalogs) within an editorial layout.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
/**
 * Represents a highly reusable, atomic unit of content (e.g., Hero Banner, Testimonial).
 */
export interface IContentBlock extends IReferenceEntity {
  blockId: string;
  schemaDefinitionId: string;
  jsonPayload: string; // All media asset references contained within the payload must strictly use AssetId / AssetReference from Phase 05 EAP
}
/**
 * Represents a dynamic placeholder that executes logic at runtime to hydrate cross-domain Read Models.
 */
export interface IDynamicWidget {
  widgetId: string;
  widgetType: string; // e.g., "CourseCarousel", "ScholarshipList"
  configurationJson: string;
}
/**
 * Represents the spatial arrangement of blocks and widgets for a specific Landing Page.
 */
export interface ILayoutConfiguration {
  layoutId: string;
  regions: LayoutRegion[];
}

export interface LayoutRegion {
  regionName: string;
  sortOrder: number;
  componentReferenceId: string; // Maps to BlockId or WidgetId
  componentType: string;
}
```

### 16.B.9 Versioning & Audit Contracts

**Architectural Commentary**
Versioning contracts enforce absolute immutability for published states. They provide the complete historical ledger necessary to satisfy enterprise compliance, auditing, and rollback requirements.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
/**
 * An immutable snapshot representing the exact state of a localized payload at publication time.
 */
export interface IContentSnapshot extends IReferenceEntity {
  snapshotId: string;
  localizedId: string;
  versionNumber: number;
  serializedPayload: string;
  capturedAt: Date;
  capturedBy: string;
}
```

### 16.B.10 Read Model Integration Contracts

**Architectural Commentary**
These contracts define how the Enterprise CMS structurally references business data without absorbing transactional ownership. The CMS holds pointers to external entities, resolving them only during presentation rendering.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
/**
 * A lightweight reference pointing to an external enterprise domain read model.
 */
export interface IExternalDomainReference {
  referenceId: string;
  targetDomain: string; // e.g., "LearningPlatform", "ScholarshipPlatform"
  entityIdentifier: string;
  displayFallback: string;
}
```

### 16.B.10.2 CMS Import Match/Merge Ownership Contracts

To support incoming editorial data from the Phase 06 Import Foundation without violating domain boundaries, this domain explicitly defines and owns the following lifecycle integration responsibilities:

- **CMS-Owned Deterministic Key**: This domain defines and owns the deterministic match keys (such as normalized content slugs or localization identity codes) used to identify reference record overlaps.
- **CMS-Owned Merge Policy**: This domain defines and owns the merge policies (such as draft queue isolation, maker-checker authorization, and localized field overlays) that govern how incoming editorial updates merge with existing content.
- **No Direct Phase 06 Publish**: The Phase 06 Import Foundation is restricted to delivering raw extraction proposals, content diffs, and associated evidence and confidence metrics. It is strictly prohibited from writing directly to active CMS content tables, nor can it bypass CMS maker-checker publishing workflows to publish content directly.

### 16.B.11 Repository Contracts

**Architectural Commentary**
Repository contracts define the boundary for data persistence retrieval without leaking database technology, query languages, or ORM mechanisms into the pure domain logic.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
export interface IContentNodeRepository {
  getByIdAsync(contentId: string): Promise<IContentNode>;
  saveAsync(content: IContentNode): Promise<void>;
}

export interface ILocalizedContentRepository {
  getByLocaleAsync(contentId: string, localeCode: string): Promise<ILocalizedContent>;
  saveAsync(localizedContent: ILocalizedContent): Promise<void>;
}

export interface IContentSnapshotRepository {
  getVersionAsync(localizedId: string, versionNumber: number): Promise<IContentSnapshot>;
  saveSnapshotAsync(snapshot: IContentSnapshot): Promise<void>;
}
```

### 16.B.12 Event Contracts

**Architectural Commentary**
Event contracts dictate how the Enterprise CMS signals state changes to the enterprise Event Bus, enabling asynchronous decoupling with Search Platforms, Notification Services, and external delivery caches.

```typescript
import { IReferenceEntity, IEnterpriseDomainEvent } from '@manaratak/core';
export interface IContentPublished extends IEnterpriseDomainEvent {
  contentId: string;
  localizedId: string;
  localeCode: string;
  versionNumber: number;
}

export interface IContentArchived extends IEnterpriseDomainEvent {
  contentId: string;
  localizedId: string;
  localeCode: string;
}

export interface IWorkflowReviewRequested extends IEnterpriseDomainEvent {
  localizedId: string;
  requestedBy: string;
  requestedAt: Date;
}

export interface IWorkflowReviewRejected extends IEnterpriseDomainEvent {
  localizedId: string;
  rejectedBy: string;
  reason: string;
}
```

### 16.B.13 Contracts Review

**Formal Review Conclusion**

- **Single Source of Truth (SSoT):** Validated. Phase 16 acts exclusively as the editorial authority, orchestrating content nodes and widgets without absorbing transactional ownership of core enterprise entities.
- **Clean Architecture:** Validated. Domain logic is encapsulated via strictly typed pure TypeScript interfaces reflecting true bounded context isolation. Zero implementation details or Application Layer/ORM leakage exist in the domain layer.
- **Event-Driven Architecture (EDA):** Validated. Adherence to `IEnterpriseDomainEvent` ensures proper integration across the enterprise event bus. Cache invalidation and search indexing rely purely on ID-based domain events.
- **Domain Focus:** Validated. All application-level constructs (Commands, Queries, Services, Validation logic) have been strictly expelled from the Domain Contracts, ensuring pure structural domain representation consistent with the enterprise standard.

**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING
