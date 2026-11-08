# University Stage 2 Enrichment Sources

These source artifacts contain the 44-field university enrichment stage. Their internal worksheet title says `Phase 1 Enrichment`, but MANARATAK classifies them as **Stage 2** because Stage 1 is the basic university identity import.

| Artifact | Records | Columns | SHA-256 |
|---|---:|---:|---|
| `Africa_Universities_Phase_1_FINAL_WEAK_RECORDS_REENRICHED.xlsx` | 1,656 | 44 | `D027FB76545DDAFB97EFB2456721F0BD61075D90FD76FD7D217794C528D53DCE` |
| `Europe_Universities_Phase_1_Enrichment_2399_74_ENRICHED_FINAL_2026-08-10.xlsx` | 2,399 | 44 | `9705E974BF8F8A9050D7ED74B21AE94EEAE4C1EBA96A69DED95966942A8BD67F` |
| `Asia_Universities_Phase_1_Enrichment_4154_FINAL_ENRICHED_COMPLETE(20260813-215654).xlsx` | 4,154 | 44 | `B014E5BBA8F648E66501258EB449D22FE923224A6FD4E7107C0DAD19CE0E55EE` |
| `North_America_Universities_Phase_1_Enrichment_COMPLETED_1566(3)(3)(1).xlsx` | 1,566 | 44 | `058FA60CF7246F97FD6BE4D88DE4A7B305EF54D1DB448A55E9DF06A8F3374235` |
| `South_America_Universities_Phase_1_Enrichment_UPDATED_879_COMPLETE.xlsx` | 879 | 44 | `73D62158A16D12DC7930C9FFA10DB5FFFF9FBC203AE40AEA93B15C96F4FEBA1E` |

Total supplied records: **10,654**. South America was recovered from the owner's local Downloads folder on 2026-11-08 and pinned without changing its bytes.

Pending continent: **Oceania** (69 identities); the owner confirmed its enrichment file is not yet supplied.

## Identity And Promotion Rules

- `University Reference ID` (`INS-*`) is the permanent update key.
- Stage 2 may update only a university identity already established by Stage 1.
- Name-only matching, random ID generation, and implicit university creation are prohibited.
- Source validation and local dry-run are allowed without a database.
- Application requires the original-database identity/version comparison, active source assets, operator authorization and atomic audit/outbox. Source review flags are not publication approval.
- The source workbooks are immutable inputs and must not be edited by import tooling.

Run the source-only check with:

```text
npm run universities:stage2:dry-run
```
