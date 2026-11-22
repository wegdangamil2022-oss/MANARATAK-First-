# MANARATAK22 scholarship integration

The source template is MANARATAK22 commit `875776af7fd5c9adac9139e29140ff82a9a6ceae`. The official public web uses its components and assets with the existing API, routes, and security settings. The scholarships route uses the template catalog and in-section filters with the published API records. The public details support funding packages and study-language tabs from published scholarship data.

## Publication evidence

Target: Manaratak development database `neondb` (OID 16395) on Neon, project `hidden-smoke-02928871`, default branch `br-sweet-king-b9pem1dg`. The transaction used the application role `manaratak_app`.

The [source manifest](../../workspace/import-sources/scholarships/manaratak22-programs.json) has SHA-256 `98202e41489ce164931da2b04937c975c7bbc48abb5dc2aec44ab5559b0bcc29`. The owner authorized publication of the template's joint university and provincial award information. Other program profiles cite the official records consulted. The Silk Road specialties are scoped to Central South University.

The rehearsal exercised the canonical scholarship repository, review and publication commands, public reader, and transaction rollback. The committed import produced four audited public records, each with a published version and a null application deadline.

| Record | Result |
| --- | --- |
| `csc-china` | Published |
| `daad-germany` | Published as a programme overview |
| `china-university-provincial-joint` | Published with full and partial funding packages |
| `silk-road-multilingual-china` | Published with Chinese and English study options for Central South University |
| `schol-7f804805` | Existing Chevening draft. Completeness blocked and 11 unresolved relationships |
| `schol-8a3b579d` | Existing Türkiye Scholarships draft. Completeness blocked and 18 unresolved relationships |

Deployment of the web build follows the official release workflow.
