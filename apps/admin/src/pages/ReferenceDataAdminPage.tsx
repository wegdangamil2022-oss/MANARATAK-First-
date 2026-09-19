import React, { useState, useEffect } from 'react';
import {
  CsrfClientManager,
  readXlsxWorkbook,
  spreadsheetRowsToObjects,
} from '@manaratak/shared';
import { FileCheck2, Loader2, Upload } from 'lucide-react';

const API_BASE = '/api/v1/reference-data';
const ADMIN_API_BASE = '/api/v1/admin/reference-data';

function useFetchData(endpoint: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const separator = endpoint.includes('?') ? '&' : '?';
      const res = await CsrfClientManager.getInstance().fetchWithCsrf(`${API_BASE}${endpoint}${separator}page=1&pageSize=50`);
      if (!res.ok) throw new Error(`Error: ${res.statusText}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  return { data, loading, error, refetch: fetchData };
}

export function ReferenceDataAdminPage() {
  const [activeTab, setActiveTab] = useState<'countries' | 'currencies' | 'languages' | 'cities'>('countries');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reference Data</h2>
        <p className="text-sm text-gray-500 mt-1">Foundational Settings for Countries, Currencies, Languages, and Cities.</p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {['countries', 'currencies', 'languages', 'cities'].map(tab => (
            <button 
              key={tab}
              className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab(tab as any)}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {activeTab === 'countries' && <CountriesTab />}
          {activeTab === 'currencies' && <CurrenciesTab />}
          {activeTab === 'languages' && <LanguagesTab />}
          {activeTab === 'cities' && <CitiesTab />}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, required = false }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label} {required && '*'}</label>
      <input 
        type="text" 
        value={value} 
        onChange={e => onChange(e.target.value)}
        required={required}
        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function CountriesTab() {
  const { data, loading, error, refetch } = useFetchData('/countries');
  const [form, setForm] = useState({ iso2Code: '', iso3Code: '', name: '', nameAr: '', region: '' });
  const [saveStatus, setSaveStatus] = useState<{loading: boolean, error?: string, success?: string}>({ loading: false });
  const [preview, setPreview] = useState<any>(null);
  const [previewStatus, setPreviewStatus] = useState<{ loading: boolean; error?: string }>({ loading: false });

  const handlePreview = async (file?: File) => {
    if (!file) return;
    setPreview(null);
    setPreviewStatus({ loading: true });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const workbook = await readXlsxWorkbook(bytes);
      const sheet = workbook.sheets.get('Countries');
      if (!sheet) throw new Error('The workbook must contain a Countries sheet.');
      const records = spreadsheetRowsToObjects<Record<string, unknown>>(sheet, { defaultValue: null, raw: false });
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      const sha256 = Array.from(new Uint8Array(hash)).map(value => value.toString(16).padStart(2, '0')).join('');
      const response = await CsrfClientManager.getInstance().fetchWithCsrf(`${ADMIN_API_BASE}/countries/import-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceName: file.name, sourceVersion: sha256.slice(0, 16), sha256, records }),
      });
      if (!response.ok) throw new Error(await response.text());
      setPreview(await response.json());
      setPreviewStatus({ loading: false });
    } catch (err: any) {
      setPreviewStatus({ loading: false, error: err.message });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ loading: true });
    try {
      const res = await CsrfClientManager.getInstance().fetchWithCsrf(`${ADMIN_API_BASE}/countries/${form.iso2Code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nameAr: form.nameAr || null, region: form.region || null })
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveStatus({ loading: false, success: 'Saved successfully' });
      setForm({ iso2Code: '', iso3Code: '', name: '', nameAr: '', region: '' });
      refetch();
    } catch (err: any) {
      setSaveStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div className="space-y-8">
      <section className="border border-gray-200 bg-white p-4 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">Country source preview</h3>
            <p className="text-sm text-gray-500">Validate the unified workbook before database promotion.</p>
          </div>
          <label className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-gray-800">
            <Upload className="h-4 w-4" /> Select workbook
            <input type="file" accept=".xlsx" className="sr-only" onChange={event => handlePreview(event.target.files?.[0])} />
          </label>
        </div>
        {previewStatus.loading && <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Validating source...</div>}
        {previewStatus.error && <p className="text-sm text-red-600">{previewStatus.error}</p>}
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <PreviewMetric label="Records" value={preview.totalRecords} />
              <PreviewMetric label="Valid" value={preview.validRecords} />
              <PreviewMetric label="Invalid" value={preview.invalidRecords} />
              <PreviewMetric label="Needs review" value={preview.reviewRequiredRecords} />
            </div>
            <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 text-amber-800 p-3 rounded text-sm">
              <FileCheck2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Dry run complete. Database writes: {preview.databaseWrites}. Promotion remains blocked until the database recovery gate and source review are closed.</span>
            </div>
          </div>
        )}
      </section>
      <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg">Manual Upsert Country</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="ISO2 Code" required value={form.iso2Code} onChange={(v: string) => setForm({...form, iso2Code: v})} />
          <Input label="ISO3 Code" required value={form.iso3Code} onChange={(v: string) => setForm({...form, iso3Code: v})} />
          <Input label="Name" required value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="Arabic Name (optional)" value={form.nameAr} onChange={(v: string) => setForm({...form, nameAr: v})} />
          <Input label="Region (optional)" value={form.region} onChange={(v: string) => setForm({...form, region: v})} />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveStatus.loading} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saveStatus.loading ? 'Saving...' : 'Save'}
          </button>
          {saveStatus.success && <span className="text-green-600 text-sm">{saveStatus.success}</span>}
          {saveStatus.error && <span className="text-red-600 text-sm">{saveStatus.error}</span>}
        </div>
      </form>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Active Records ({data.length})</h3>
          <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="text-gray-500 text-sm">No records found.</p>}
        {data.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr><th className="p-3">ISO2</th><th className="p-3">ISO3</th><th className="p-3">Name</th><th className="p-3">Region</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map(item => (
                  <tr key={item.iso2Code} className="hover:bg-gray-50">
                    <td className="p-3 font-mono">{item.iso2Code}</td><td className="p-3 font-mono">{item.iso3Code}</td><td className="p-3">{item.name}</td><td className="p-3">{item.region || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return <div className="border border-gray-200 rounded p-3"><div className="text-xs text-gray-500">{label}</div><div className="text-xl font-bold mt-1">{value}</div></div>;
}

function DerivedReferencePreview({ kind }: { kind: 'currencies' | 'languages' }) {
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<{ loading: boolean; error?: string }>({ loading: false });

  const preview = async (file?: File) => {
    if (!file) return;
    setResult(null);
    setStatus({ loading: true });
    try {
      const workbook = await readXlsxWorkbook(new Uint8Array(await file.arrayBuffer()));
      const sheet = workbook.sheets.get('Countries');
      if (!sheet) throw new Error('The workbook must contain a Countries sheet.');
      const records = spreadsheetRowsToObjects<Record<string, unknown>>(sheet, { defaultValue: null, raw: false });
      const response = await CsrfClientManager.getInstance().fetchWithCsrf(`${ADMIN_API_BASE}/countries/derived-reference-preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records }),
      });
      if (!response.ok) throw new Error(await response.text());
      setResult(await response.json());
      setStatus({ loading: false });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message });
    }
  };

  const candidates = result?.[kind] ?? [];
  return (
    <section className="border border-gray-200 bg-white p-4 rounded-lg space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg">{kind === 'currencies' ? 'Currency candidates' : 'Language candidates'}</h3>
          <p className="text-sm text-gray-500">Extract source codes and usage evidence from the unified Country workbook.</p>
        </div>
        <label className="inline-flex items-center justify-center gap-2 border border-gray-300 px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-gray-50">
          <Upload className="h-4 w-4" /> Select workbook
          <input type="file" accept=".xlsx" className="sr-only" onChange={event => preview(event.target.files?.[0])} />
        </label>
      </div>
      {status.loading && <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Extracting candidates...</div>}
      {status.error && <p className="text-sm text-red-600">{status.error}</p>}
      {result && (
        <>
          <div className="flex items-center justify-between border border-amber-200 bg-amber-50 text-amber-800 p-3 rounded text-sm">
            <span>{candidates.length} source codes found. Authoritative enrichment is required before promotion.</span>
            <span className="font-mono">writes: {result.databaseWrites}</span>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-72">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700 sticky top-0"><tr><th className="p-3">Code</th><th className="p-3">Suggested display</th><th className="p-3">Usage</th><th className="p-3">Countries</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.map((candidate: any) => <tr key={candidate.code}><td className="p-3 font-mono">{candidate.code}</td><td className="p-3">{candidate.suggestedDisplayName || '-'}</td><td className="p-3">{candidate.usageCount}</td><td className="p-3">{candidate.countryIso2Codes.length}</td></tr>)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function CurrenciesTab() {
  const { data, loading, error, refetch } = useFetchData('/currencies');
  const [form, setForm] = useState({ isoCode: '', name: '', nameAr: '', symbol: '', numericCode: '' });
  const [saveStatus, setSaveStatus] = useState<{loading: boolean, error?: string, success?: string}>({ loading: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ loading: true });
    try {
      const res = await CsrfClientManager.getInstance().fetchWithCsrf(`${ADMIN_API_BASE}/currencies/${form.isoCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nameAr: form.nameAr || null, symbol: form.symbol || null, numericCode: form.numericCode || null })
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveStatus({ loading: false, success: 'Saved successfully' });
      setForm({ isoCode: '', name: '', nameAr: '', symbol: '', numericCode: '' });
      refetch();
    } catch (err: any) {
      setSaveStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div className="space-y-8">
      <DerivedReferencePreview kind="currencies" />
      <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg">Manual Upsert Currency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="ISO Code" required value={form.isoCode} onChange={(v: string) => setForm({...form, isoCode: v})} />
          <Input label="Name" required value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="Arabic Name (optional)" value={form.nameAr} onChange={(v: string) => setForm({...form, nameAr: v})} />
          <Input label="Symbol (optional)" value={form.symbol} onChange={(v: string) => setForm({...form, symbol: v})} />
          <Input label="Numeric Code (optional)" value={form.numericCode} onChange={(v: string) => setForm({...form, numericCode: v})} />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveStatus.loading} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saveStatus.loading ? 'Saving...' : 'Save'}
          </button>
          {saveStatus.success && <span className="text-green-600 text-sm">{saveStatus.success}</span>}
          {saveStatus.error && <span className="text-red-600 text-sm">{saveStatus.error}</span>}
        </div>
      </form>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Active Records ({data.length})</h3>
          <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="text-gray-500 text-sm">No records found.</p>}
        {data.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr><th className="p-3">ISO Code</th><th className="p-3">Name</th><th className="p-3">Symbol</th><th className="p-3">Numeric</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map(item => (
                  <tr key={item.isoCode} className="hover:bg-gray-50">
                    <td className="p-3 font-mono">{item.isoCode}</td><td className="p-3">{item.name}</td><td className="p-3">{item.symbol || '-'}</td><td className="p-3">{item.numericCode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguagesTab() {
  const { data, loading, error, refetch } = useFetchData('/languages');
  const [form, setForm] = useState({ isoCode: '', name: '', nameAr: '', nativeName: '', direction: 'LTR' });
  const [saveStatus, setSaveStatus] = useState<{loading: boolean, error?: string, success?: string}>({ loading: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ loading: true });
    try {
      const res = await CsrfClientManager.getInstance().fetchWithCsrf(`${ADMIN_API_BASE}/languages/${form.isoCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nameAr: form.nameAr || null, nativeName: form.nativeName || null })
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveStatus({ loading: false, success: 'Saved successfully' });
      setForm({ isoCode: '', name: '', nameAr: '', nativeName: '', direction: 'LTR' });
      refetch();
    } catch (err: any) {
      setSaveStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div className="space-y-8">
      <DerivedReferencePreview kind="languages" />
      <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg">Manual Upsert Language</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="ISO Code" required value={form.isoCode} onChange={(v: string) => setForm({...form, isoCode: v})} />
          <Input label="Name" required value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="Arabic Name (optional)" value={form.nameAr} onChange={(v: string) => setForm({...form, nameAr: v})} />
          <Input label="Native Name (optional)" value={form.nativeName} onChange={(v: string) => setForm({...form, nativeName: v})} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Direction *</label>
            <select 
              value={form.direction} 
              onChange={e => setForm({...form, direction: e.target.value})}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LTR">LTR</option>
              <option value="RTL">RTL</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveStatus.loading} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saveStatus.loading ? 'Saving...' : 'Save'}
          </button>
          {saveStatus.success && <span className="text-green-600 text-sm">{saveStatus.success}</span>}
          {saveStatus.error && <span className="text-red-600 text-sm">{saveStatus.error}</span>}
        </div>
      </form>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Active Records ({data.length})</h3>
          <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="text-gray-500 text-sm">No records found.</p>}
        {data.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr><th className="p-3">ISO Code</th><th className="p-3">Name</th><th className="p-3">Native</th><th className="p-3">Dir</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map(item => (
                  <tr key={item.isoCode} className="hover:bg-gray-50">
                    <td className="p-3 font-mono">{item.isoCode}</td><td className="p-3">{item.name}</td><td className="p-3">{item.nativeName || '-'}</td><td className="p-3">{item.direction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CitiesTab() {
  const { data, loading, error, refetch } = useFetchData('/cities');
  const [form, setForm] = useState({ countryIso2Code: '', name: '', nameAr: '', region: '', timezone: '' });
  const [saveStatus, setSaveStatus] = useState<{loading: boolean, error?: string, success?: string}>({ loading: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus({ loading: true });
    try {
      const res = await CsrfClientManager.getInstance().fetchWithCsrf(`${ADMIN_API_BASE}/cities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nameAr: form.nameAr || null, region: form.region || null, timezone: form.timezone || null })
      });
      if (!res.ok) throw new Error(await res.text());
      setSaveStatus({ loading: false, success: 'Saved successfully' });
      setForm({ countryIso2Code: '', name: '', nameAr: '', region: '', timezone: '' });
      refetch();
    } catch (err: any) {
      setSaveStatus({ loading: false, error: err.message });
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg">Manual Upsert City</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Country ISO2 Code" required value={form.countryIso2Code} onChange={(v: string) => setForm({...form, countryIso2Code: v})} />
          <Input label="Name" required value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="Arabic Name (optional)" value={form.nameAr} onChange={(v: string) => setForm({...form, nameAr: v})} />
          <Input label="Region (optional)" value={form.region} onChange={(v: string) => setForm({...form, region: v})} />
          <Input label="Timezone (optional)" value={form.timezone} onChange={(v: string) => setForm({...form, timezone: v})} />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveStatus.loading} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saveStatus.loading ? 'Saving...' : 'Save'}
          </button>
          {saveStatus.success && <span className="text-green-600 text-sm">{saveStatus.success}</span>}
          {saveStatus.error && <span className="text-red-600 text-sm">{saveStatus.error}</span>}
        </div>
      </form>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Active Records ({data.length})</h3>
          <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data.length === 0 && <p className="text-gray-500 text-sm">No records found.</p>}
        {data.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr><th className="p-3">Country</th><th className="p-3">City Name</th><th className="p-3">Region</th><th className="p-3">Timezone</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map(item => (
                  <tr key={`${item.countryIso2Code}-${item.name}`} className="hover:bg-gray-50">
                    <td className="p-3 font-mono">{item.countryIso2Code}</td><td className="p-3">{item.name}</td><td className="p-3">{item.region || '-'}</td><td className="p-3">{item.timezone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
