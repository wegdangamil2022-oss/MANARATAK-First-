# Phase 1 University Source Dry Run Report

Status: `SOURCE_VALIDATED / DATABASE_MATCH_PENDING / UNIVERSITIES_IMPORTED = 0`

Date: 2026-08-12

The six continent workbooks were read without modification. Only their primary `* Universities` sheets were treated as import data. Coverage/plan sheets remain source notes and were not interpreted as University records.

## Input Contract

All six data sheets use the same 12 columns: Reference ID, National Code, Official English Name, Local Name, Country, ISO3, City, Institution Type, Ownership, Status, Official Website, and Official Source.

This is Phase 1/basic identity data. Missing later University workspace sections do not make these source rows invalid and do not make them complete or publishable.

## Results

| Continent | Records | Source valid | Review required | Conflict | Rejected | Missing website |
|---|---:|---:|---:|---:|---:|---:|
| Europe | 2,399 | 2,191 | 208 | 0 | 0 | 7 |
| Asia | 4,154 | 2,091 | 2,063 | 0 | 0 | 1,611 |
| Africa | 1,656 | 243 | 1,413 | 0 | 0 | 1,410 |
| Oceania | 69 | 69 | 0 | 0 | 0 | 0 |
| North America | 1,566 | 147 | 1,419 | 0 | 0 | 1,419 |
| South America | 879 | 63 | 816 | 0 | 0 | 816 |
| **Total** | **10,723** | **4,804** | **5,919** | **0** | **0** | **5,263** |

Identity findings:

- Valid `INS-{ISO3}-{sequence}` format: 10,723
- Duplicate SourceReferenceId: 0
- Invalid SourceReferenceId: 0
- SourceReferenceId/ISO3 mismatch: 0
- Rejected source rows: 0
- Database writes: 0

Review issue occurrences:

- `OFFICIAL_WEBSITE_MISSING`: 5,263
- `SHARED_OFFICIAL_WEBSITE`: 654
- `DUPLICATE_COUNTRY_OFFICIAL_NAME`: 12

A shared website is review evidence, not automatic duplication: several institutions legitimately use a regulator, system, or umbrella website. Likewise, duplicate names within a country require review and cannot trigger silent matching.

## Source Fingerprints

| Continent | SHA-256 |
|---|---|
| Europe | `062B8A19FEA66F3EF3BBF1597CC54F43E81468131930869F0F52A34FF8AA8571` |
| Asia | `50B707DB4B4FF060734E0AEDEAAB6C743735588D3D5196F8FAA6565330AF78A1` |
| Africa | `AEC074291173B9A3C8284412F2BE216917182C761A58B643980CF428D83BB99D` |
| Oceania | `F6C4698523487CD028146246ED83D6277FECF3697D3A59A1A0C46AE69305D384` |
| North America | `C028E423CF4AD9A7D0466138D9AB4ABE56B5CE30A3E0B80C58A951AADCF1F930` |
| South America | `FEAD7E09A6387828EF8B08D91FEB89FF517AFC6BBBFD8BBD583B08A490964186` |

## Remaining Gate

`SOURCE_VALID` means only that the row passed source-level identity and basic field checks. It does not mean `NEW`, `MATCHED`, or ready to write.

Before import, Google Studio must resolve ISO3 to a Phase 7 Country ID, resolve City without creating placeholders, compare every `INS-*` against the original Development DB, run a no-write sample Dry Run, close backup/rollback gates, and receive explicit import approval.
