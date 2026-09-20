> **Historical / superseded runtime note (MNT-AUD-0109, W2):** `createInMemoryPrismaClient()` was removed from the canonical production composition on 2026-09-06. This document is retained only as historical evidence and must not be used as current runtime authority.

# Code Inspection Report: Scholarship Import State Mismatch

## Executive Summary
This report analyzes the state mismatch between the **Scholarship Import Modal** and the central **Import Control Plane (`/admin/imports`)** in MANARATAK 2.0. 

### Core Finding
The state mismatch is **not** caused by separate in-memory database instances, thread separation, or data reset between requests. The `prisma` instance is a **singleton** in-memory mockup client that persists state in-memory across the lifecycle of the dev server, which was verified via raw `curl` calls.

Instead, the issue is caused by a **critical routing order bug in Express**. In `ScholarshipAdminRouter.ts`, the wildcard route `router.get('/:id')` is registered **before** the static route `router.get('/imported-records')`. When the client (both the Modal and the Control Plane page) makes a `GET` request to `/api/v1/admin/scholarships/imported-records`, the routing engine intercepts it as a request to fetch a scholarship with the ID `"imported-records"`. 
- Since no such scholarship exists, the backend returns `{"error":"Scholarship with id imported-records not found"}` with a `400 Bad Request` or `404 Not Found` status.
- This uncaught API error causes the `Promise.all` in the central Control Plane page to reject, clearing the entire state and resetting all metric cards and lists to `0` or empty.
- In the Import Modal, the initial `POST /admin/scholarships/import` succeeds (as there is no routing conflict for `POST` requests). However, when the modal attempts to transition to the "Review Records" tab and fetch the records via `GET /admin/scholarships/imported-records`, that request similarly fails silently (caught and logged in the console), rendering the review screen completely empty.

Additionally, raw translation keys are displayed in the `/admin/imports` page because the required translation keys are **completely missing** from the `en.ts` and `ar.ts` translation dictionaries.

---

## 1. Scholarship Import Modal Component
**File Path**: `apps/web/src/features/admin-preview/AdminScholarshipsPreviewPage.tsx`

### Opening the Modal
The modal is controlled via the `showImportModal` boolean state:
```tsx
// Line 74
const [showImportModal, setShowImportModal] = useState<boolean>(false);
```

### Sample CSV Insertion
```tsx
// Lines 181-188
const insertSampleCsv = () => {
  const sample = `scholarshipName,fundingCoverage,degreeLevel,applicationLink,officialSourceUrl,sponsorName,studyCountry,applicationDeadline,coverageDetails,eligibleMajorsOrFields
DEMO-COMPLETE Oman Higher Education Grant,Fully Funded,Bachelor,https://moeri.gov.om/apply,https://moeri.gov.om,Ministry of Higher Education,Oman,2027-08-31,Covers full tuition and monthly allowance,Engineering; Science; IT
DEMO-NEEDS-REVIEW British Council Oman Award,Partial Coverage,Master,https://britishcouncil.om/apply,https://britishcouncil.om,British Council,Oman,2027-09-15,,English; Education
,Fully Funded,PhD,https://squ.edu.om,https://squ.edu.om,Sultan Qaboos University,Oman,2027-10-01,Full PhD Research Grant,Science`;
  setImportText(sample);
  setImportError(null);
};
```

### Process/Import Button Handler
```tsx
// Lines 204-227
const handleProcessImport = async () => {
  if (!importText.trim()) {
    setImportError(t('validation_import_text_required') || 'Please enter or upload CSV/JSON import data.');
    return;
  }

  setImportSubmitting(true);
  setImportError(null);
  setImportSuccess(null);

  try {
    const res = await ApiClient.importScholarships(importText);
    setImportSuccess(`${t('import_success') || 'Import batch processed successfully! Total records:'} ${res.records.length}`);
    setImportText('');
    setImportRecordFilter('');
    await loadImportedRecords('');
    loadData();
    setImportTab('review');
  } catch (err: any) {
    setImportError(err.message || 'Failed to process import');
  } finally {
    setImportSubmitting(false);
  }
};
```

### API Call used for Import
```typescript
// Calls the ApiClient wrapper
const res = await ApiClient.importScholarships(importText);
```

### Local State Update after Successful Import
```typescript
setImportSuccess(`${t('import_success') || 'Import batch processed successfully! Total records:'} ${res.records.length}`);
setImportText('');
setImportRecordFilter('');
await loadImportedRecords('');
loadData();
```

### Switching to Review Records Tab
```typescript
setImportTab('review');
```

### Imported Records Rendering Logic
```tsx
// Rendered under the 'review' tab in the modal:
{loadingImportedRecords ? (
  <div className="p-8 text-center text-slate-400">
    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600" />
    <span className="text-xs">{t('loading') || 'Loading...'}</span>
  </div>
) : importedRecords.length === 0 ? (
  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
    {t('no_imported_records') || 'No imported records found for this filter.'}
  </div>
) : (
  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
    {importedRecords.map((rec) => {
      const raw = rec.rawPayload || {};
      const name = raw.scholarshipName || 'Unnamed';
      return (
        <div key={rec.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-900">{name}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">{raw.sponsorName || 'No Sponsor'} • {raw.studyCountry || 'No Country'}</div>
            {rec.validationErrors && (
              <div className="text-rose-600 text-[10px] font-semibold mt-1">
                {t('missing_fields') || 'Missing:'} {rec.validationErrors}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Status badge and Promotion button */}
          </div>
        </div>
      );
    })}
  </div>
)}
```

---

## 2. Admin Imports Page Component
**File Path**: `apps/web/src/features/admin-preview/AdminImportsPreviewPage.tsx`

### `/admin/imports` Route/Page
The route is registered in the frontend router pointing to `AdminImportsPreviewPage`.

### Data Loading Function
```typescript
// Lines 23-47
const loadImportData = async () => {
  setLoading(true);
  try {
    const [fetchedBatches, recordsRes] = await Promise.all([
      ApiClient.getImportBatches(),
      ApiClient.getImportedRecords({ pageSize: 50 }),
    ]);

    const recs = recordsRes.data || [];
    setBatches(fetchedBatches || []);
    setRecords(recs);

    setMetrics({
      batchesCount: (fetchedBatches || []).length,
      totalRecords: recordsRes.total || recs.length,
      needsReviewCount: recs.filter((r: any) => r.status === 'NEEDS_REVIEW' || r.status === 'INCOMPLETE').length,
      failedCount: recs.filter((r: any) => r.status === 'FAILED').length,
      promotedCount: recs.filter((r: any) => r.status === 'PROMOTED').length,
    });
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

### API Call used for Import Batches & Records
```typescript
ApiClient.getImportBatches()
ApiClient.getImportedRecords({ pageSize: 50 })
```

### Metric Cards Calculation
```typescript
setMetrics({
  batchesCount: (fetchedBatches || []).length,
  totalRecords: recordsRes.total || recs.length,
  needsReviewCount: recs.filter((r: any) => r.status === 'NEEDS_REVIEW' || r.status === 'INCOMPLETE').length,
  failedCount: recs.filter((r: any) => r.status === 'FAILED').length,
  promotedCount: recs.filter((r: any) => r.status === 'PROMOTED').length,
});
```

### Recent Import Batches Rendering
```tsx
// Lines 150-164
<div className="space-y-3">
  {batches.map((batch) => (
    <div key={batch.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
      <div>
        <div className="font-bold text-slate-900">{batch.dataType} - {batch.sourceSystem}</div>
        <div className="text-[11px] text-slate-500">{new Date(batch.createdAt).toLocaleString()}</div>
      </div>
      <div className="text-right">
        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
          {batch.totalRows} {t('rows') || 'rows'}
        </span>
      </div>
    </div>
  ))}
</div>
```
*(Note: There is a key structural mismatch here where the component expects `batch.totalRows` but the API response returns `batch.totalRecords`)*

### Refresh Button Behavior
```tsx
// Lines 82-88
<button 
  onClick={loadImportData} 
  className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
  title={t('refresh') || 'Refresh'}
>
  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
</button>
```

---

## 3. API Client
**File Path**: `apps/web/src/api/client.ts`

### `importScholarships`
```typescript
// Lines 807-818
static async importScholarships(dataText: string, sourceSystem = 'ADMIN_CONSOLE'): Promise<{ batch: any; records: any[] }> {
  const res = await fetch(`${API_BASE_URL}/admin/scholarships/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataText, sourceSystem }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to process import');
  }
  return res.json();
}
```

### `getImportedRecords`
```typescript
// Lines 829-842
static async getImportedRecords(params?: { batchId?: string; status?: string; page?: number; pageSize?: number }): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const searchParams = new URLSearchParams();
  if (params?.batchId) searchParams.append('batchId', params.batchId);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  const res = await fetch(`${API_BASE_URL}/admin/scholarships/imported-records?${searchParams.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch imported records');
  }
  return res.json();
}
```

### `getImportBatches`
```typescript
// Lines 820-828
static async getImportBatches(dataType = 'SCHOLARSHIPS'): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/admin/imports/batches?dataType=${encodeURIComponent(dataType)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch import batches');
  }
  return res.json();
}
```

### `promoteImportedRecord`
```typescript
// Lines 844-855
static async promoteImportedRecord(recordId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/admin/scholarships/imported-records/${encodeURIComponent(recordId)}/promote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to promote imported record');
  }
  return res.json();
}
```

---

## 4. Backend Routes

### Route Mount Points
Registered in `apps/api/src/app.ts`:
```typescript
v1Router.use('/admin/scholarships', requireAdminPermission('admin:scholarships:manage'), container.resolve('scholarshipAdminRouter'));
v1Router.use('/admin/imports', requireAdminPermission('admin:imports:manage'), container.resolve('importAdminRouter'));
```

### Route Definitions in `ScholarshipAdminRouter.ts`

- **POST /api/v1/admin/scholarships/import**
```typescript
// Lines 181-186
router.post('/import', asyncHandler(async (req: Request, res: Response) => {
  if (!importAdminUseCases) throw new Error('Import use cases not configured');
  const { dataText, sourceSystem } = req.body;
  const result = await importAdminUseCases.importScholarshipData({ dataText, sourceSystem });
  res.status(201).json(result);
}));
```

- **GET /api/v1/admin/scholarships/imported-records**
```typescript
// Lines 188-197
router.get('/imported-records', asyncHandler(async (req: Request, res: Response) => {
  if (!importAdminUseCases) throw new Error('Import use cases not configured');
  const batchId = req.query.batchId as string;
  const status = req.query.status as string;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;

  const records = await importAdminUseCases.listRecords({ batchId, status, page, pageSize });
  res.json(records);
}));
```

- **POST /api/v1/admin/scholarships/imported-records/:id/promote**
```typescript
// Lines 199-203
router.post('/imported-records/:id/promote', asyncHandler(async (req: Request, res: Response) => {
  if (!importAdminUseCases) throw new Error('Import use cases not configured');
  const result = await importAdminUseCases.promoteRecord(req.params.id);
  res.json(result);
}));
```

### Route Definitions in `ImportAdminRouter.ts`

- **GET /api/v1/admin/imports/batches**
```typescript
// Lines 27-32
router.get('/batches', asyncHandler(async (req: Request, res: Response) => {
  const batches = await importAdminUseCases.listBatches({
    dataType: req.query.dataType as string || 'SCHOLARSHIPS',
  });
  res.json(batches);
}));
```

- **GET /api/v1/admin/imports/records**
```typescript
// Lines 34-48
router.get('/records', asyncHandler(async (req: Request, res: Response) => {
  const batchId = req.query.batchId as string;
  const status = req.query.status as string;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;

  const records = await importAdminUseCases.listRecords({
    batchId,
    status,
    page,
    pageSize,
  });
  res.json(records);
}));
```

---

## 5. Import Foundation Use Cases
**File Path**: `packages/application/src/import-foundation/use-cases/ImportAdminUseCases.ts`

### Create Batch
```typescript
// Lines 47-54
const batch = await this.importRepository.createBatch({
  sourceSystem: input.sourceSystem || 'ADMIN_CONSOLE',
  dataType: 'SCHOLARSHIPS',
  batchStatus: 'COMPLETED',
  totalRecords: rawRows.length,
  processedRecords: 0,
  failedRecords: 0,
});
```

### Create Records
```typescript
// Lines 103-110
const record = await this.importRepository.createRecord({
  batchId: batch.id,
  status,
  rawPayload: normalizedPayload,
  validationErrors: classification.missingFields || null,
  processingNotes: `Source row ${sourceRowNumber}`,
  sourceDedupKey: `${scholarshipName}|${normalizedPayload.sponsorName}`.toLowerCase(),
});
```

### List Batches
```typescript
// Lines 124-126
async listBatches(filters?: any) {
  return this.importRepository.listBatches(filters);
}
```

### List Records
```typescript
// Lines 128-130
async listRecords(filters?: any) {
  return this.importRepository.listRecords(filters);
}
```

### Validation / Classification Result Persistence
```typescript
// Lines 89-101
const classification = ScholarshipCompletenessClassifier.classify(normalizedPayload);
let status: string = ImportRecordStatus.VALID;

if (classification.state === ScholarshipCompletenessState.INCOMPLETE) {
  status = ImportRecordStatus.INCOMPLETE;
  failedCount++;
} else if (classification.state === ScholarshipCompletenessState.NEEDS_REVIEW) {
  status = ImportRecordStatus.NEEDS_REVIEW;
  processedCount++;
} else {
  status = ImportRecordStatus.COMPLETE;
  processedCount++;
}
```

---

## 6. Repository / Storage
**File Path**: `packages/infrastructure/src/import-foundation/PrismaImportRepository.ts`

### Storage Layer (Singleton In-Memory fallback or mock Prisma client)
In MANARATAK 2.0, standard registration resolves `prisma` to an in-memory database mock:
```typescript
// apps/api/src/infrastructure/di/container.ts Line 288
prisma: asFunction(() => createInMemoryPrismaClient()).singleton()
```
The mock Prisma client keeps internal collections state in memory inside its closure:
```typescript
function createInMemoryPrismaClient() {
  const collections: Record<string, any[]> = {
    scholarship: [],
    importBatch: [],
    importRecord: [],
    // ...
  };
```
Because the `prisma` client is registered as a `.singleton()`, both `PrismaScholarshipRepository` and `PrismaImportRepository` read from and write to the exact same database state source.

---

## 7. Translation Dictionaries
**File Paths**: `apps/web/src/i18n/en.ts` & `apps/web/src/i18n/ar.ts`

A search in these files reveals that the following translation keys used by the `/admin/imports` page are **missing entirely**:
- `control_plane_active`
- `refresh_import_audit_logs`
- `launch_scholarship_importer`
- `architectural_boundary_note`
- `recent_import_batches`
- `admin_promoted_records`

Since they are missing, the UI renders the raw translation keys directly.

---

## 8. Detailed Analysis of the State Mismatch

### Why the modal reports "Import batch processed successfully. Total records: 3"
- When the user triggers the import, the client initiates a `POST` request to `/api/v1/admin/scholarships/import` with the CSV text.
- Since this is a `POST` request, it does **not** match the `GET /admin/scholarships/:id` route. It bypasses it and successfully hits the `/import` POST handler in `ScholarshipAdminRouter.ts`.
- The handler processes the records in memory, successfully inserts them into `collections.importBatch` and `collections.importRecord`, and returns the 3 processed records.
- The UI catches this response, successfully increments the total, and renders the success notification.

### Why `/admin/imports` page displays 0
- The `/admin/imports` page executes `Promise.all([ ApiClient.getImportBatches(), ApiClient.getImportedRecords({ pageSize: 50 }) ])` upon loading.
- `ApiClient.getImportedRecords()` initiates a request to `GET /api/v1/admin/scholarships/imported-records?pageSize=50`.
- In `ScholarshipAdminRouter.ts`, the router handles `/:id` before `/imported-records`:
```typescript
// Line 107
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const scholarship = await adminScholarshipUseCases.getScholarship(req.params.id);
  res.json(scholarship);
}));

// ...

// Line 188
router.get('/imported-records', asyncHandler(async (req: Request, res: Response) => { ... }));
```
- Because of this, the route engine routes the request to `router.get('/:id')` with `req.params.id` set to `"imported-records"`.
- This throws an error because no scholarship with the ID `"imported-records"` exists. The API responds with `400 Bad Request` (`{"error":"Scholarship with id imported-records not found"}`).
- The front-end's `Promise.all` in the `/admin/imports` page rejects because of this failure. 
- The error is caught by the `catch (err)` block in `loadImportData`, which prints it to the console but sets `loading` to `false` without setting the fetched batches and records. Therefore, they default to `[]` and the metrics render as `0`.

### Summary of State Sources
- Promoted records and imported records **do** share the same database state source (`createInMemoryPrismaClient`).
- The mismatch is solely a **routing conflict** that prevents the client from successfully querying the records.
- Additionally, the UI page expecting `batch.totalRows` instead of `batch.totalRecords` is a minor secondary formatting mismatch that needs to be synchronized.
