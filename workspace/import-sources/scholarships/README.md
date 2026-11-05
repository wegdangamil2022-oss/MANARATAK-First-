# Scholarship source — unified 2027 master through 1138

The owner replaced v6.6 on 2026-11-06 with `MANARATAK_Scholarships_Master_2027_Through_1138.md`. This is the only active scholarship dataset in `../dataset-manifest.json`. Its supplied bytes are unchanged: **6,391,925 bytes**, SHA-256 `6b657da9e1f5a9159b1952afe914d8aacb97593ed178e3cb99c141d564d1cf13`.

The previous v6.6 source remains recoverable in Git at `63f9f42ee266a5dbaa704d7e59edd3738d1464cb`. Historical import receipts and source evidence are preserved; their old hashes must not be replaced with the new artifact hash.

## Reader and projection

- 1,138 unique primary identities, display positions 0001–1138. The introductory example is excluded. One merged related identity is retained as an alias, never a second scholarship.
- 1,073 records have eight sections; 65 have nine including optional participating universities. Resolve headings by labels and explicit aliases, never fixed numeric positions.
- Hidden original IDs include both `SCH-*` and the new Italian IDs. Original English names, basic fields, exact raw blocks, line numbers, record hashes and source sections are retained.
- `ScholarshipUnifiedSourceProjection` maps basic information, overview, participating universities, separately grouped funding benefits, degree/program groups, source-only numbered eligibility, required documents, important notes, application URL and official guide URL. It performs no network or database operations.
- Source-authored numbered lists retain their item boundaries, including comma-separated alternatives inside one condition. Enrichment cannot contribute eligibility items.
- The file has no execution-status markers. All 1,138 records enter offline canonical/source review; zero are automatically approved, published or claimed imported. Source availability labels are separate from platform workflow/publication status.
- Date-only labels are preserved verbatim; an instant requires an explicit timezone/time review. Names never manufacture canonical universities, programs, majors or tests.

The application accepts its existing JSON/NDJSON/CSV import contracts. Markdown is projected to a provenance-bound payload before the existing asset, screening, owner review and atomic transfer flow. The single owner-requested replacement and its database evidence are documented separately in the current review report. This file does not authorize importing the entire source.

## Dashboard coverage

The existing sections cover all source section types. The dashboard additionally exposes official English name, source application status, mixed full/partial funding, source degree/program groups, the official application guide and a read-only full original-file tab. Editorial changes retain the raw source and canonical relationships.

The permanent scholarship identity is protected by `scholarship_identity_no_delete`. Replacing an imported draft uses the existing archive command and a new draft import; no trigger is disabled and no original schema migration is required.
