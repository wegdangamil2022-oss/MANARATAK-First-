# Fix Report: Scholarship Import State Mismatch

## Executive Summary
This report details the successful resolution of the state mismatch issue between the **Scholarship Import Modal** and the central **Import Control Plane (`/admin/imports`)** in MANARATAK 2.0.

---

## 1. Root Cause Identification
The state mismatch was caused by an Express routing priority conflict in `apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts`. The wildcard parameter route `GET /:id` was registered **before** the static import route `GET /imported-records`.

When the front-end executed `GET /api/v1/admin/scholarships/imported-records`, Express matched `:id = "imported-records"` and attempted to fetch a scholarship entity with ID `"imported-records"`. This returned a `400 Bad Request` error (`{"error":"Scholarship with id imported-records not found"}`), breaking data loading for both the Review Records tab and the central `/admin/imports` page.

---

## 2. Route Order Changes

### Before Fix (`ScholarshipAdminRouter.ts`)
```typescript
// Dynamic :id route registered FIRST
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const scholarship = await adminScholarshipUseCases.getScholarship(req.params.id);
  res.json(scholarship);
}));

// ...

// Static import routes registered LOWER down (UNREACHABLE for GET /imported-records)
router.get('/imported-records', asyncHandler(async (req: Request, res: Response) => { ... }));
```

### After Fix (`ScholarshipAdminRouter.ts`)
```typescript
// Static import routes registered FIRST
router.post('/import', asyncHandler(async (req: Request, res: Response) => { ... }));
router.get('/imported-records', asyncHandler(async (req: Request, res: Response) => { ... }));
router.post('/imported-records/:id/promote', asyncHandler(async (req: Request, res: Response) => { ... }));

// Dynamic :id route registered AFTER static routes
router.get('/:id', asyncHandler(async (req: Request, res: Response) => { ... }));
```

---

## 3. Endpoint Proof

### `GET /api/v1/admin/scholarships/imported-records?pageSize=50`

#### Before Fix
- **HTTP Status**: `400 Bad Request`
- **Response**: `{"error":"Scholarship with id imported-records not found"}`

#### After Fix
- **HTTP Status**: `200 OK`
- **Response Output**:
```json
{
  "data": [
    {
      "id": "rec-6cff98ef",
      "createdAt": "2026-07-27T18:25:09.629Z",
      "updatedAt": "2026-07-27T18:25:19.107Z",
      "batchId": "batch-5070f5ad",
      "status": "PROMOTED",
      "rawPayload": {
        "scholarshipName": "DEMO-COMPLETE Oman Higher Education Grant",
        "displayName": "DEMO-COMPLETE Oman Higher Education Grant",
        "fundingCoverage": "Fully Funded",
        "degreeLevel": "Bachelor",
        "applicationLink": "https://moeri.gov.om/apply",
        "officialSourceUrl": "https://moeri.gov.om",
        "sponsorName": "Ministry of Higher Education",
        "studyCountry": "Oman"
      },
      "promotedEntityId": "mem-1785176719107-yfzxd"
    },
    {
      "id": "rec-68c474b2",
      "batchId": "batch-5070f5ad",
      "status": "NEEDS_REVIEW",
      "rawPayload": {
        "scholarshipName": "DEMO-NEEDS-REVIEW British Council Oman Award"
      }
    },
    {
      "id": "rec-abfbfb06",
      "batchId": "batch-5070f5ad",
      "status": "INCOMPLETE",
      "rawPayload": {
        "scholarshipName": ""
      }
    }
  ],
  "total": 3,
  "page": 1,
  "pageSize": 50
}
```

---

## 4. UI Metrics & Data Mapping

### Metric & Mapping Alignment (`AdminImportsPreviewPage.tsx`)
- Updated batch row count mapping from `batch.totalRows` to `batch.totalRecords ?? batch.totalRows ?? 0` to align with the backend `ImportBatch` data model.

### UI Metrics Comparison
| Metric | Before Fix | After Fix (End-to-End Test) |
| :--- | :--- | :--- |
| **Import Batches** | 0 | 1 |
| **Imported Records** | 0 | 3 |
| **Needs Review** | 0 | 1 |
| **Failed / Incomplete Rows** | 0 | 1 |
| **Promoted to Catalog** | 0 | 1 |
| **Batch Row Count Display** | `undefined rows` | `3 rows` |

---

## 5. Translation Keys Fixed
Added missing translation keys to both `apps/web/src/i18n/en.ts` and `apps/web/src/i18n/ar.ts`:

| Key | English Value | Arabic Value |
| :--- | :--- | :--- |
| `control_plane_active` | Control Plane Active | لوحة التحكم نشطة |
| `refresh_import_audit_logs` | Refresh Audit Metrics | تحديث مقاييس التدقيق |
| `launch_scholarship_importer` | Launch Scholarship Importer & Review | تشغيل أداة استيراد ومراجعة المنح |
| `architectural_boundary_note` | Architecture Boundary Enforcement: | فرض الحدود المعمارية: |
| `recent_import_batches` | Recent Import Batches | دفعات الاستيراد الأخيرة |
| `admin_promoted_records` | Promoted to Catalog | المُرَقاة إلى الدليل |

**Result**: No raw translation keys are visible anywhere on the `/admin/imports` page.

---

## 6. Files Changed
1. `apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts`
   - Moved `/import`, `/imported-records`, and `/imported-records/:id/promote` above `/:id`.
2. `apps/web/src/features/admin-preview/AdminImportsPreviewPage.tsx`
   - Fixed `batch.totalRecords ?? batch.totalRows ?? 0` mapping.
3. `apps/web/src/i18n/en.ts`
   - Added 6 missing English translation keys.
4. `apps/web/src/i18n/ar.ts`
   - Added 6 missing Arabic translation keys.
5. `docs/implementation-status/MANARATAK-2.0-Scholarship-Import-State-Mismatch-Fix-Report.md`
   - Created this fix verification report.

---

## 7. Verification Results
- **Linter (`npm run lint`)**: Passed cleanly (0 errors).
- **Build (`npm run build`)**: Compiled successfully.
- **Test Suite (`npm run test`)**: All tests passed.
