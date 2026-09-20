# University Stage 2 Enrichment Sources

These source artifacts contain the 44-field university enrichment stage. Their internal worksheet title says `Phase 1 Enrichment`, but MANARATAK classifies them as **Stage 2** because Stage 1 is the basic university identity import.

| Artifact | Records | Columns | SHA-256 |
|---|---:|---:|---|
| `Africa_Universities_Phase_1_FINAL_WEAK_RECORDS_REENRICHED.xlsx` | 1,656 | 44 | `D027FB76545DDAFB97EFB2456721F0BD61075D90FD76FD7D217794C528D53DCE` |
| `Europe_Universities_Phase_1_Enrichment_2399_74_ENRICHED_FINAL_2026-08-10.xlsx` | 2,399 | 44 | `9705E974BF8F8A9050D7ED74B21AE94EEAE4C1EBA96A69DED95966942A8BD67F` |
| `Asia_Universities_Phase_1_Enrichment_4154_FINAL_ENRICHED_COMPLETE(20260813-215654).xlsx` | 4,154 | 44 | `B014E5BBA8F648E66501258EB449D22FE923224A6FD4E7107C0DAD19CE0E55EE` |
| `North_America_Universities_Phase_1_Enrichment_COMPLETED_1566(3)(3)(1).xlsx` | 1,566 | 44 | `058FA60CF7246F97FD6BE4D88DE4A7B305EF54D1DB448A55E9DF06A8F3374235` |

Total prepared records: **9,775**.

Pending continents: **Oceania** and **South America**.

## Identity And Promotion Rules

- `University Reference ID` (`INS-*`) is the permanent update key.
- Stage 2 may update only a university identity already established by Stage 1.
- Name-only matching, random ID generation, and implicit university creation are prohibited.
- Source validation and local dry-run are allowed without a database.
- Promotion remains blocked until the Google Studio recovery gate and database identity comparison are complete.
- The source workbooks are immutable inputs and must not be edited by import tooling.

Run the source-only check with:

```text
npm run universities:stage2:dry-run
```
