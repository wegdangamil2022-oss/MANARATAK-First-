# P13 Final Source Traceability Matrix — 2026-09-03

**Status:** FINAL SOURCE TRACEABILITY  
**Architecture authority:** `docs/governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md`

| Roadmap / ownership | Architecture | Domain | Application / query | Repository / adapter | API / read model | UI consumer | Source verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P7 Reference Data | Dependency Graph / Ownership Matrix | canonical Country/Region/City/Language/Currency | reference resolvers | owner repositories | Reference Data APIs | P23/P24 selectors/filters | P7 + remediation verifiers |
| P8 Academic Taxonomy | Bounded Context Map | DegreeLevel / taxonomy | canonical taxonomy services | taxonomy repositories | taxonomy APIs | P23/P24 | P8 + architecture guards |
| P9 International Tests | API Registry | canonical Test identity | test application services | test repository | Test APIs | P11/P12/P23/P24 | cross-domain + P9/P10 guards |
| P10 Majors | Ownership Matrix | Major canonical identity | Major query/mutation contracts | Major repository | Major owner/read APIs | P11/P12/P15/P23/P24 | P9/P10/P13 verifiers |
| P11 Universities / Programs | Dependency Graph | University + AcademicProgram | normalized program services | University repository | University owner/read APIs | P12/P15/P23/P24 | University + P9/P13 checks |
| P12 Scholarships | Bounded Context Map | Scholarship canonical relations | scholarship resolution/read services | Scholarship repository | Scholarship owner/read APIs | P15/P23/P24 | Scholarship + P9/P10/P13 checks |
| P13 Learning | Event Catalog | Course/Enrollment/Completion | learning/progress application contracts | course progress repository | Course APIs/read models | P15/P23/P24 | P5/P6/P13 checks |
| P14 Certificates | Event Catalog / API Registry | credential lifecycle | `CertificateReadModelService` / issuance consumer | certificate repository/inbox | private student read + public verify | P15/P24 | P6/P13 checks |
| P15 Student | Ownership Matrix | personal workspace/references only | workspace + dashboard hydration services | P15 repository + owner-read gateways | protected Student APIs | live Student Workspace | P13 verifier + architecture guards |
| P16–P21 Late domains | Dependency Graph | owner-specific records | owner services/adapters | owner repositories | owner APIs/read models | P15/P23/P24 where applicable | P8/P9/P10/P11 guards |
| P23 Admin | Control-plane boundary | no copied domain truth | owner API orchestration | no direct Prisma | canonical picker/editor APIs | Admin UI | P9/P11 guards |
| P24 Public | Composition boundary | no owned business records | published read composition | no direct owner persistence | public owner/read APIs | live Public UI | P10/P11/P13 guards |

## Traceability invariant

Every cross-phase relationship is tracked in `docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md`. Final identity is canonical where such an identity exists; translated labels and source text are display/provenance only. Reverse navigation is implemented through owner read models/aggregation rather than reverse ownership.
