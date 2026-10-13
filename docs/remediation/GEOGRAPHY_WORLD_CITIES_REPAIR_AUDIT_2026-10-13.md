# MANARATAK — World city-to-region source repair, 13 October 2026

**Scope:** Source CSV data only, matching ten files in the user's Library. No live PostgreSQL operations, import, migration, deploy, or university FK assignment.

## Final source audit

| Metric | Count |
|---|---:|
| City records, across five continents | 8,991 |
| Administrative-region records, across five continents | 5,001 |
| City rows updated, compared with the unchanged base | 1,188 |
| Country-scoped name aliases **still requiring independent geographic review** | 1,138 |
| Region links with specific source-backed assignments (`MATCHED_BY_CODE`) | 50 |
| City rows still without `regionCode` | 293 |
| City source IDs changed or records removed | 0 |
| Region records modified | 0 |
| Database writes | 0 |

**Status semantics:** Do **not** treat `SOURCE_ALIAS_REVIEW_REQUIRED` as a verified region relationship or promote those 1,138 source aliases to canonical UUIDs automatically. All 8,991 city records retain `verificationStatus=NEEDS_MANUAL_REVIEW`. Only 50 rows have `regionMatchStatus=MATCHED_BY_CODE`, including the initial five and an additional 45 government-sourced records.

### Additional 45 documented links

- **Philippines (29):** Fifteen Metro Manila (NCR) city records `PH-00`, Baguio `PH-15`, Calapan `PH-MDR`, plus 12 more regional city links for Angeles, Olongapo, Cagayan de Oro, Iligan, Butuan, Zamboanga, Lapu-Lapu, Mandaue, Davao, General Santos, Ormoc, and Tacloban. Sources: [Philippine Statistics Authority NCR](https://psa.gov.ph/classification/psgc/cities/1300000000), [CAR](https://psa.gov.ph/classification/psgc/cities/1400000000), [Calapan](https://psa.gov.ph/classification/psgc/citimuni/1705200000), [current city/region classification](https://psa.gov.ph/classification/psgc/summary).
- **Armenia (2):** Gavar to `AM-GR`; Yerevan to `AM-ER`. Source: [Government of Armenia administrative territories](https://gov.am/en/state-administration-system-2).
- **Yemen (1):** Sanaa to `YE-SA`, not Sanaa Governorate (`YE-SN`). Source: [UK Government Yemen Toponymic Factfile](https://assets.publishing.service.gov.uk/media/6672f2ccd427ab249955ce95/Yemen_Toponymic_Factfile.pdf).
- **Argentina (3):** Buenos Aires (autonomous city) `AR-C`; Ushuaia and Rio Grande (Tierra del Fuego) `AR-V`. Sources: [CABA](https://www.argentina.gob.ar/caba), [Tierra del Fuego](https://www.argentina.gob.ar/node/193843).
- **Colombia (2):** Bogotá `CO-DC`; San Andrés `CO-SAP`. Sources: [ISO 3166-2 subdivisions](https://www.iso.org/obp/ui/#iso:code:3166:CO), [San Andrés administration](https://www.sanandres.gov.co/gobernacion/).
- **Bulgaria (1):** Sofia city proper `BG-22`, distinct from Sofia Province `BG-23`. Source: [National Statistical Institute Bulgaria](https://www.nsi.bg/en/press-release/administrative-territorial-and-territorial-division-of-the-republic-of-bulgaria-9010).
- **Czechia (1):** Jihlava in Vysočina `CZ-63`. Source: [Czech government regional information](https://ris.gov.cz/cs/krajske-ris/kraj-vysocina/regionalni-informace/o-kraji).
- **United Kingdom (6):** Cardiff, Belfast, Kingston upon Hull, Swansea, Newport, Rhondda mapped to their catalogued administrative authorities. Sources: [UK ONS Wales](https://www.ons.gov.uk/explore-local-statistics/areas/W92000004-wales), [UK government administrative topographic guidance](https://www.gov.uk/government/publications/toponymic-guidelines/toponymic-guidelines-for-map-and-other-editors-united-kingdom-of-great-britain-and-northern-ireland--2).

Each changed row keeps the raw `regionNameEn`, country identity, source city ID, and coordinates intact; the previous name and evidence link are appended to its `notes` field.

## Machine-checked invariants

- 8,991 unique `cityId` and 8,991 unique `sourceCityId`; 5,001 unique country+regionCode keys.
- All populated city `regionCode` values refer to an existing region in the **same ISO3 country**.
- 293 rows have empty `regionCode`.
- All 8,991 rows still have `NEEDS_MANUAL_REVIEW`.
- No city deleted, no region file or its historical identity changed.
- ZIP copy of the ten source files was independently rebuilt. **All five rebuilt city file Git blob SHA-1 digests are identical to the branch**, providing full-content parity. Current checked city blob SHAs:
  - Africa `df590754b6f8fedc8475c292b8aeced17e4d269e`
  - Americas `7e4ccdeb505823d95ef718b61782166fba66e305`
  - Asia `044862b1d3c1be2c9cbefa2ab9276fbdafa4f28d`
  - Europe `9ed582b0d3a0a6804dd04002fe8b41bd12d1ab7b`
  - Oceania `664abee78399dee91ba3f7bb067b537acefd9a49`

## Remaining source blockers

1. **293 region-empty city rows:** see `workspace/reports/section-06/UNRESOLVED_CITY_REGION_REVIEW_2026-10-13.csv`; some countries and territories have no region catalog yet (Taiwan, Kosovo, and dependent territories); in others the original names are municipalities or obsolete subdivision levels.
2. **1,138 scoped aliases:** code assignment is a review candidate only until independent geographic proof (source with authoritative parent and, where possible, GIS point-in-polygon).
3. **Eight scoped city-name collisions:** not merged; distinct sourceCityId values and separate UUIDs must remain until a reviewer distinguishes true homonyms from duplicates.
4. **University geography:** still requires its own end-to-end link review; previous unresolved-university report did not include every university across all Stage 1/2/3+4 sources.
5. **Database:** Google AI Studio's actual `ReferenceCity.administrativeRegionId`, `University.cityReferenceId` and `University.regionReferenceId` remain unverified and unmodified. Source `regionCode` is **not** a canonical UUID.

**Merge policy:** No `main` merge unless the exact PR head's required GitHub CI/security checks are passing, or the user explicitly approves a policy exception with a reviewed root-cause record. All DB mutations remain gated separately.
