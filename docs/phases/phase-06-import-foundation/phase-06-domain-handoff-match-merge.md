# Phase 06: Domain Handoff, Match, and Merge Architectural Specification

## 1. Architectural Boundary Principles

To maintain strict isolation and prevent domain contamination, the Import Foundation (Phase 06) is governed by a unidirectional data-flow contract. **Phase 06 is strictly prohibited from writing directly to any domain tables, schemas, or active aggregate repositories.** 

All import processing results are staged in isolated import boundaries. Downstream integration is achieved exclusively through structured domain handoff proposals.

```
[ Raw Import File ] -> [ Format Parsers ] -> [ Rule-Based Extraction ] 
                                                      |
                                                      v
                                        [ Isolated Import Staging ]
                                                      |
                                                      v (Disabled in Phase 06 until owning-domain approval workflows are implemented.)
                                        [ Domain Promotion Endpoints ] (HTTP 422)
                                                      |
                                                      v
                                        [ Generic Handoff Proposal ]
                                                      |
                                                      v
                             ===================================================
                             Downstream Domains (Phases 07-13, 16, 20)
                             ===================================================
                             - Owns Deterministic Match Keys
                             - Owns Completeness Policies
                             - Owns Merge/Overwrite Policies
                             - Owns Final Approval & Publication
```

### Core Constraints

1. **Zero Direct Domain Writes**: No service within Phase 06 may issue insert, update, or delete commands against any core business domain tables (e.g., Reference Data, Academic Taxonomy, Universities, Scholarships, CMS, Services).
2. **Advisory Nature of Proposals**: All matching, completeness, and merge outputs produced by Phase 06 are strictly advisory data structures (proposals). Downstream domains must evaluate them through domain-specific policies.
3. **Preservation on Omission**: The absence of a previously imported field in a subsequent import stream must never result in the automatic deletion of a published domain value.
4. **No Auto-Publish or Auto-Merge**: System-wide automatic publishing or merging is prohibited to prevent data degradation. All proposed changes that overwrite existing domain data or introduce ambiguity (conflicts) must be held for review.
5. **Disabled Promotion Endpoints**: All REST, GraphQL, or RPC endpoints in the Admin Router that perform promotion or transfer of data into target domains remain disabled and will return an `HTTP 422 Unprocessable Entity` or `HTTP 501 Not Implemented` with a clear explanation of policy requirements.

---

## 2. Structured Handoff Contracts

Every field proposed to a downstream domain must be encapsulated in a structured `FieldExtractionProposal` container. The evidence and confidence properties gathered during the extraction phase must propagate unimpeded.

### 2.1 Proposed Field Contract
Each proposed field contains:
- **`targetFieldName`**: Identifier of the field mapping to the downstream schema.
- **`proposedValue`**: The raw extracted value.
- **`evidence`**: A complete `FieldEvidence` object containing:
  - `sourceId`: UUID of the source definition.
  - `contentHash`: Hash of the raw source line.
  - `connectorVersion`: Version of the acquisition connector.
  - `schemaVersion`: Version of the extraction schema.
  - `evidenceSnippet`: The exact line context (or `[REDACTED]` if sensitive).
  - `confidenceScore`: The associated `ConfidenceScore` object.
- **`validationResults`**: Associated format validation results (e.g., regex check, length checks).

### 2.2 Domain Match Candidate Contract
Matching identifies overlaps with existing domain records. A `MatchCandidate` object includes:
- **`domainIdentifier`**: The target domain type (e.g., `ImportTargetDomain.UNIVERSITY`).
- **`matchedRecordId`**: The ID of the existing database record, if a match was identified.
- **`matchStrength`**: Quantitative metric representing the confidence of the match.
- **`matchReason`**: Natural language or structured explanation of why the record matched (e.g., "Deterministic Match Key: Institution Code matches precisely").

### 2.3 Field Diff Contract
When a match is found, a field-by-field diff must be computed:
- **`fieldName`**: Target field name.
- **`currentValue`**: Current value persisted in the domain table.
- **`proposedValue`**: The value extracted from the import source.
- **`evidence`**: The new evidence backing the proposed value.
- **`isConflict`**: Boolean indicating whether `currentValue` and `proposedValue` differ in a non-trivial manner (excluding whitespace and capitalization normalization).

### 2.4 Completeness Report Contract
Before handing off, a report calculates field completeness based on target schema requirements:
- **`schemaCompleted`**: Boolean indicating whether all required fields are present.
- **`missingFields`**: List of required fields that were absent in the import.
- **`warnings`**: Informational warnings about optional fields or formatting anomalies.

### 2.5 Merge Proposal Contract
The final composite structure sent to a downstream domain for evaluation:
- **`proposalId`**: Unique identifier for the proposal.
- **`targetDomain`**: The destination `ImportTargetDomain` enum.
- **`candidate`**: The `ExtractionCandidate` under review.
- **`matchCandidate`**: The matched record, if any.
- **`fieldDiffs`**: Array of computed `FieldDiff` structures.
- **`completeness`**: The computed `CompletenessReport`.
- **`requiresReview`**: Set to `true` if:
  - Any field diff results in a conflict.
  - Target domain-specific policies require review.
  - The extracted confidence score is below the domain's minimum threshold.
  - The completeness report shows missing required fields.

---

## 3. Ownership and Division of Labor

To maintain clean architectural boundaries, matching, merge policies, and publication flows are explicitly split between the Phase 06 Import Foundation and downstream business domains.

| Capability | Phase 06 Import Foundation | Downstream Business Domain (Phases 07-13, 16, 20) |
| :--- | :--- | :--- |
| **Deterministic Key Defin.** | ❌ Forbidden (Does not define keys) | **Owns** (Defines and maintains match keys, e.g. code/slug) |
| **Completeness Policies** | ❌ Forbidden (Only checks simple schema rules) | **Owns** (Defines complex multi-field rules and state validation) |
| **Merge Policies** | ❌ Forbidden (Produces diffs only) | **Owns** (Determines if a field can overwrite, e.g. source precedence) |
| **Conflict Resolution** | ❌ Forbidden (Stops and flags conflicts) | **Owns** (Runs custom merge handlers, overrides, or manual paths) |
| **Final Publish/Commit** | ❌ Forbidden (Does not write to core) | **Owns** (Transitions records to active states in domain tables) |

---

## 4. Conflict & Merge Rules

Downstream domains must implement their merge/overwrite evaluation based on the following deterministic rules:

1. **Source Precedence**: Each domain should maintain a lookup of source connector authority. An import proposal from a high-authority source may be recommended in a MergeProposal, but final merge/overwrite approval is owned by the downstream domain policy and/or admin review workflow.
2. **Manual Intervention Flags**: Any match that results in a conflict on a core field where source precedence is equal or ambiguous must trigger `requiresReview = true` and lock the merge proposal in a pending state.
3. **No Phantom Deletions**: If a field is omitted from an incoming import stream but exists in the target domain record, the downstream domain's merge coordinator must preserve the existing value.
