# Course master source preparation

The two original workbooks are preserved byte-for-byte. The active source-level catalog is `../dataset-manifest.json`; these files are not reference seeds.

| Dataset | Rows | Import order | SHA-256 |
|---|---:|---:|---|
| `MANARATAK_MASTER_1_RESEND_2026-09-15.xlsx` | 16,861 | 1 | `8e92f89b4814ae40398d5b555b02a8c17eeb5db3ce247f316cf68987b99c8d88` |
| `MANARATAK_Free_Courses_MASTER_2_UPDATED_2026-09-23_ATLASSIAN_161_CLOSED_130_WORKATO_162_BATCH_001_2_ADDED_21562_NOT_CLOSED.xlsx` | 4,701 | 2 | `f5944476f63f13999216ebd5eb6dcfeb6bb067ce1ffb2166735bd973e5da321e` |

Both have a `Courses` sheet and all 11 required course fields. MASTER 2 also has a leading export `index` column and audit sheets. The course parser projects the leading index only when the remaining columns exactly match the approved contract. It does not alter the workbook.

Source comparison used normalized direct URL and normalized platform plus course name as comparison keys only. The 21,562 rows contain 21,559 distinct URL keys and 21,559 distinct platform/name keys. One URL occurs across the files: MASTER 1 row 10632 and MASTER 2 row 432. MASTER 2 repeats URL and platform/name at rows 2070/2141 and 2071/2142, and repeats platform/name at rows 2112/2129. These rows require identity review before any bulk import; raw sources remain intact.

The alleged older approximately 5,000-row course workbook is not present in the current repository or its available Git history. Its unique-course count and supersession status cannot be established. Do not retire it from any external source inventory until it is supplied and compared. The two staged files must not be imported as independent unrestricted batches because of the overlaps above.
