# Documentation Naming Standard

## Document Information
- **Title:** Documentation Naming Standard
- **Document ID:** DOC-GOV-003
- **Status:** Baseline
- **Owner:** Architecture Review Board (ARB)

## Applies To
- All Project Phases
- Architecture Documents
- ADRs
- Standards
- Policies
- Specifications
- Baselines
- Reports
- Technical Documents
- Operational Documents

---

## 1. Purpose
The purpose of the Documentation Naming Standard is to establish a single, enterprise-wide naming convention governing every official document produced throughout the MANARATAK 2.0 project lifecycle. This standard ensures consistency, discoverability, traceability, and structural integrity across the entire documentation repository.

## 2. Scope
This standard applies to all existing and future documentation within the MANARATAK 2.0 ecosystem. It dictates the nomenclature for files, directories, document titles, unique identifiers, version labels, and specific document types such as ADRs and Phase reports.

## 3. Objectives
- **Consistency:** Ensure absolute uniformity across all documentation assets.
- **Readability:** Make names human-readable, conveying immediate context.
- **Predictability:** Allow stakeholders to deduce naming patterns without consulting an index.
- **Stability:** Ensure file names and IDs remain stable even as underlying content evolves.
- **Scalability:** Support thousands of documents across multiple domains without collision.
- **Searchability:** Optimize names for automated parsing, linking, and repository indexing using standard delimiters.

## 4. Naming Principles
- **Clarity Over Brevity:** A longer, descriptive name is always preferred over a short, ambiguous one.
- **Domain-Driven Context:** Names should reflect the architectural domain or bounded context they describe.
- **Immutability of IDs:** Once a Document ID is assigned, it must never change, even if the document's title is updated.
- **Machine-Friendly:** File paths and names must be safe for all operating systems and CI/CD environments.

## 5. Naming Rules

### File Names
- Must use `PascalCase` or `Kebab-Case` with hyphens `-` as word separators.
- Must not contain spaces, underscores `_`, or special characters (e.g., `@`, `#`, `!`).
- Must end with the `.md` extension (for Markdown documentation).
- When applicable, must include the Document ID as a prefix (e.g., `ADR-001-Architecture-Version.md`).

### Folder Names
- Must use lowercase `kebab-case` only (e.g., `api-contracts`, `phase-01`).
- Must represent logical, stable groupings. Do not name folders after transient concepts.

### Document Titles
- Must be the first element in the file, represented as an `# H1 Heading`.
- Must use Title Case.
- Must accurately and comprehensively describe the document's core subject.

### Document IDs
- Must use uppercase alphanumeric characters and hyphens.
- Must follow the format: `[CATEGORY]-[DOMAIN]-[SEQUENCE]` (e.g., `DOC-GOV-003`).
- Must be globally unique across the enterprise and tracked in the Enterprise Documentation Index.

### Version Labels
- Must strictly adhere to Semantic Versioning (SemVer) formatting (e.g., `1.0.0`, `1.2.0-draft.1`).

### Phase Names
- Must follow the format: `Phase-[Number]-[Name]` (e.g., `Phase-01-Foundation`).

### ADR Names
- Must follow the format: `ADR-[Number]-[Topic].md` (e.g., `ADR-042-Database-Selection.md`).

### Standard Names
- Must follow the format: `STD-[DOMAIN]-[Sequence]-[Topic].md` (e.g., `STD-SEC-001-Authentication-Standard.md`).

### Policy Names
- Must follow the format: `POL-[DOMAIN]-[Sequence]-[Topic].md` (e.g., `POL-GOV-002-Access-Policy.md`).
- *Note: Core governance policies may also use the `DOC-GOV` prefix.*

### Baseline Names
- Must follow the format: `Baseline-[Version]-[Topic].md` or `Baseline-v[Major].[Minor].md` (e.g., `Baseline-v1.0.0-Foundation.md`).

### Report Names
- Must follow the format: `REP-[TYPE]-[Sequence]-[Topic].md` (e.g., `REP-ARCH-001-Architecture-Audit.md`).

## 6. Naming Patterns
Official templates for compliant file naming:

- **Phase Definition:** `Phase-01-Foundation.md`
- **ADR:** `ADR-001-Architecture-Version.md`
- **Policy:** `DOC-GOV-001-doc-gov-001-documentation-lifecycle-policy.md`
- **Standard:** `STD-SEC-001-Authentication-Standard.md`
- **Report:** `REP-ARCH-001-Architecture-Audit.md`
- **Baseline:** `Baseline-v1.0.0-Foundation.md`

## 7. Abbreviation Rules
- Abbreviations must be standardized and documented in the Enterprise Glossary.
- Avoid novel or localized abbreviations.
- **Approved Prefixes:**
  - `DOC`: Documentation
  - `GOV`: Governance
  - `STD`: Standard
  - `POL`: Policy
  - `REP`: Report
  - `ADR`: Architecture Decision Record
  - `SEC`: Security
  - `ARCH`: Architecture
  - `OPS`: Operations

## 8. Forbidden Naming Practices
The following practices are strictly prohibited:
- **Spaces:** Never use spaces in file or folder names (e.g., `My Document.md`).
- **Random Capitalization:** Do not mix cases inconsistently (e.g., `my-Document_name.md`).
- **Duplicate IDs:** Never reuse a Document ID. If a document is retired, its ID is retired with it.
- **Ambiguous Names:** Avoid generic names (e.g., `design.md`, `notes.md`, `architecture.md`).
- **Temporary Suffixes:** Do not use suffixes to indicate state (e.g., `-final`, `-v2`, `-draft`, `-latest`). Versioning and state are managed via metadata and Git history.
- **Undefined Abbreviations:** Do not invent acronyms that are not globally recognized within the enterprise.

## 9. Migration Rules
- **Legacy Documents:** Existing documents that do not comply with this standard must be renamed during their next minor or major revision cycle.
- **Redirection:** When renaming a baselined document, the original filename must temporarily remain as a stub containing a deprecation notice and a relative link to the new file, ensuring external links do not break immediately.
- **ID Assignment:** Existing documents lacking an ID will be assigned the next available sequence number in their category by the Documentation Governance Lead.

## 10. Governance Rules
- All new documentation must pass a naming compliance check before transitioning to the `Approved` or `Baseline` states.
- The Architecture Review Board (ARB) holds final authority over naming disputes, abbreviation approvals, and sequence allocation.
- Automated CI/CD pipelines shall enforce file and folder naming rules (e.g., blocking spaces and underscores).

## 11. Compliance Checklist
Before submitting a document for review, ensure:
- [ ] File name uses valid separators (hyphens).
- [ ] File name contains no spaces, underscores, or special characters.
- [ ] Folder name uses lowercase `kebab-case`.
- [ ] Document ID follows the official prefix and sequence format.
- [ ] File name contains no temporary suffixes (e.g., `-final`, `-v2`).
- [ ] Document Title (H1) matches the file intent and uses Title Case.
- [ ] Only approved abbreviations are used.

## 12. Examples

### Compliant Examples
- **File:** `ADR-015-Message-Broker-Selection.md`
- **File:** `STD-API-002-REST-Guidelines.md`
- **Folder:** `api-contracts`
- **Document ID:** `DOC-GOV-003`

### Non-Compliant Examples
- **File:** `ADR 15 Message Broker v2 final.md` *(Violation: Contains spaces, temporary suffixes, missing hyphens)*
- **File:** `Rest_Guidelines.md` *(Violation: Uses underscores, missing ID prefix if it's a standard)*
- **Folder:** `API Contracts` *(Violation: Contains space, uses uppercase)*
- **Document ID:** `DOC#GOV-003` *(Violation: Invalid special characters)*

## 13. Glossary
- **ADR:** Architecture Decision Record.
- **ARB:** Architecture Review Board.
- **SemVer:** Semantic Versioning.
- **Kebab-Case:** Words separated by hyphens (e.g., `my-file-name`).
- **PascalCase:** Words concatenated with capitalized first letters (e.g., `MyFileName`).

## 14. References
- [Documentation Lifecycle Policy (DOC-GOV-001)](./doc-gov-001-documentation-lifecycle-policy.md)
- [Enterprise Documentation Index (DOC-GOV-002)](./doc-gov-002-enterprise-documentation-index.md)
- Architecture Versioning Standard
- ADR Management Policy
- Baseline Management Policy
