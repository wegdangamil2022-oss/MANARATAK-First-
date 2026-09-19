/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, FileText, GitBranch, Layers3, Link2, Loader2, XCircle } from 'lucide-react';

interface MajorDetail {
  id: string;
  publicId?: string;
  slug?: string;
  displayName: string;
  canonicalName?: string;
  degreeLevel?: string;
  sourceClassificationSystem?: string;
  academicFieldOrDiscipline?: string | null;
  collegeOrFaculty?: string | null;
  classificationCode?: string | null;
  academicFieldId?: string | null;
  disciplineId?: string | null;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  currentPublishedVersionId?: string | null;
  status: string;
  completenessStatus: string;
  updatedAt?: string;
}

interface MajorProfile {
  id?: string;
  level?: string;
  code?: string;
  profileType?: string;
  displayName?: string;
  collegeContext?: string;
  academicFieldId?: string;
  disciplineId?: string;
  currentPublishedVersionId?: string;
  status?: string;
  completenessStatus?: string;
}

interface MajorContentSection {
  id?: string;
  sectionKey: string;
  title?: string;
  content: string;
  reviewStatus?: string;
}

interface MajorVersion {
  id?: string;
  versionNumber?: number;
  status?: string;
  sourceFileName?: string;
  sourceHash?: string;
  importedAt?: string;
  publishedAt?: string;
  approvedBy?: string;
}

interface MajorSource {
  id?: string;
  sourceType?: string;
  sourceName?: string;
  sourceUri?: string;
  sourceHash?: string;
  importedAt?: string;
}

interface MajorAlias {
  id?: string;
  alias: string;
  aliasType?: string;
  locale?: string;
}

interface MajorRelationship {
  id?: string;
  targetMajorId?: string;
  relationshipType?: string;
  confidence?: number;
  notes?: string;
}

interface MajorClassificationMapping {
  id?: string;
  taxonomyNodeId: string;
  relationshipType?: string;
  standardType?: string;
  standardCode?: string;
  confidence?: number;
}

type DetailTab = 'basic' | 'content' | 'taxonomy' | 'relations' | 'versions';

const tabs: Array<{ id: DetailTab; label: string; icon: typeof BookOpen }> = [
  { id: 'basic', label: 'البيانات الأساسية', icon: BookOpen },
  { id: 'content', label: 'المحتوى التفصيلي', icon: FileText },
  { id: 'taxonomy', label: 'التصنيف', icon: Layers3 },
  { id: 'relations', label: 'العلاقات', icon: GitBranch },
  { id: 'versions', label: 'النسخ والمصادر', icon: Link2 },
];

const PUBLIC_WEB_BASE_URL = (import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '');

function formatLabel(value?: string | null): string {
  if (!value) return 'غير محدد';
  return value.replace(/_/g, ' ');
}

function badgeTone(value?: string): string {
  switch (value) {
    case 'PUBLISHED':
    case 'COMPLETE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'READY_TO_PUBLISH':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'READY_TO_REVIEW':
    case 'NEEDS_REVIEW':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function Badge({ value }: { value?: string | null }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeTone(value ?? undefined)}`}>{formatLabel(value)}</span>;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-[12px] font-bold text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-extrabold text-slate-900">{value || 'غير محدد'}</dd>
    </div>
  );
}

export function MajorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [major, setMajor] = useState<MajorDetail | null>(null);
  const [profiles, setProfiles] = useState<MajorProfile[]>([]);
  const [sections, setSections] = useState<MajorContentSection[]>([]);
  const [versions, setVersions] = useState<MajorVersion[]>([]);
  const [sources, setSources] = useState<MajorSource[]>([]);
  const [aliases, setAliases] = useState<MajorAlias[]>([]);
  const [relationships, setRelationships] = useState<MajorRelationship[]>([]);
  const [mappings, setMappings] = useState<MajorClassificationMapping[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMajor = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [majorResult, profileResult, sectionResult, versionResult, sourceResult, aliasResult, relationshipResult, mappingResult] = await Promise.all([
        adminApiClient.request<MajorDetail>(`/admin/majors/${id}`),
        adminApiClient.request<{ data: MajorProfile[] }>(`/admin/majors/${id}/profiles`),
        adminApiClient.request<{ data: MajorContentSection[] }>(`/admin/majors/${id}/content-sections`),
        adminApiClient.request<{ data: MajorVersion[] }>(`/admin/majors/${id}/versions`),
        adminApiClient.request<{ data: MajorSource[] }>(`/admin/majors/${id}/sources`),
        adminApiClient.request<{ data: MajorAlias[] }>(`/admin/majors/${id}/aliases`),
        adminApiClient.request<{ data: MajorRelationship[] }>(`/admin/majors/${id}/relationships`),
        adminApiClient.request<{ data: MajorClassificationMapping[] }>(`/admin/majors/${id}/classification-mappings`),
      ]);

      setMajor(majorResult);
      setProfiles(profileResult.data ?? []);
      setSections(sectionResult.data ?? []);
      setVersions(versionResult.data ?? []);
      setSources(sourceResult.data ?? []);
      setAliases(aliasResult.data ?? []);
      setRelationships(relationshipResult.data ?? []);
      setMappings(mappingResult.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load major details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMajor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const completenessCount = useMemo(() => ({
    sections: sections.length,
    profiles: profiles.length,
    sources: sources.length,
    versions: versions.length,
  }), [profiles.length, sections.length, sources.length, versions.length]);

  const runAction = async (action: string, message: string) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApiClient.request(`/admin/majors/${id}/${action}`, { method: 'POST' });
      setSuccess(message);
      await loadMajor();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to execute action.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !major) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  if (!major) {
    return (
      <div dir="rtl" className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
        تعذر تحميل تفاصيل التخصص.
      </div>
    );
  }

  const publicMajorUrl = major.slug ? `${PUBLIC_WEB_BASE_URL}/majors/${major.slug}` : undefined;

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button onClick={() => navigate('/majors')} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
          العودة للتخصصات
        </button>
        <div className="flex flex-wrap gap-2">
          {major.status !== 'READY_TO_REVIEW' && major.status !== 'PUBLISHED' && (
            <button disabled={saving} onClick={() => runAction('mark-ready', 'تم نقل التخصص إلى المراجعة.')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50">مراجعة</button>
          )}
          {major.completenessStatus === 'COMPLETE' && major.status === 'READY_TO_REVIEW' && (
            <button disabled={saving} onClick={() => runAction('mark-publishable', 'تم تجهيز التخصص للنشر.')} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 disabled:opacity-50">جاهز للنشر</button>
          )}
          {major.status === 'READY_TO_PUBLISH' && (
            <button disabled={saving} onClick={() => runAction('publish', 'تم نشر التخصص.')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">نشر</button>
          )}
          {major.status === 'PUBLISHED' && (
            <button disabled={saving} onClick={() => runAction('unpublish', 'تم إلغاء نشر التخصص.')} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 disabled:opacity-50">إلغاء النشر</button>
          )}
          <button disabled={saving} onClick={() => runAction('archive', 'تمت أرشفة التخصص.')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">أرشفة</button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><XCircle className="h-5 w-5" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" />{success}</div>}

      <header className="rounded-xl bg-[#142B5F] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge value={major.status} />
              <Badge value={major.completenessStatus} />
              {major.classificationCode && <span className="rounded-md bg-white/10 px-2.5 py-1 font-mono text-xs font-bold">{major.classificationCode}</span>}
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-4xl">{major.displayName}</h1>
            <p className="mt-2 text-sm text-slate-300">{major.publicId ?? major.id} · {formatLabel(major.degreeLevel)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label="الملفات" value={completenessCount.sources} />
            <Field label="النسخ" value={completenessCount.versions} />
            <Field label="الأقسام" value={completenessCount.sections} />
            <Field label="الملفات الفرعية" value={completenessCount.profiles} />
          </div>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold ${activeTab === tab.id ? 'bg-[#DDEFF2] text-[#0E7C86]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'basic' && (
        <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-950">هوية التخصص</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="الاسم المعتمد" value={major.displayName} />
              <Field label="الاسم القانوني" value={major.canonicalName} />
              <Field label="الدرجة" value={major.degreeLevel} />
              <Field label="المجال" value={major.academicFieldOrDiscipline} />
              <Field label="الكلية أو السياق" value={major.collegeOrFaculty} />
              <Field label="نظام التصنيف" value={major.sourceClassificationSystem} />
              <Field label="معرف المجال" value={major.academicFieldId} />
              <Field label="معرف التخصص الفرعي" value={major.disciplineId} />
            </dl>
          </div>
          <aside className="space-y-3">
            {(major.officialSourceUrl || major.sourceUrl) && (
              <a href={major.officialSourceUrl || major.sourceUrl || '#'} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#142B5F] px-4 text-sm font-bold text-white">
                <ExternalLink className="h-4 w-4" />
                فتح المصدر
              </a>
            )}
            {publicMajorUrl && major.status === 'PUBLISHED' && (
              <a href={publicMajorUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
                <BookOpen className="h-4 w-4" />
                فتح الصفحة العامة
              </a>
            )}
            <div className="rounded-xl border border-[#DDEFF2] bg-[#DDEFF2]/50 p-4 text-sm leading-7 text-[#142B5F]">
              المرحلة 10 تملك هوية التخصص. البرامج، المنح، الدورات، والوظائف ترتبط بهذا السجل ولا تنشئ هوية تخصص جديدة.
            </div>
          </aside>
        </section>
      )}

      {activeTab === 'content' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-950">أقسام الملف التفصيلي</h2>
          {sections.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-4 text-sm font-bold text-amber-800">لا توجد تفاصيل مستوردة لهذا التخصص بعد.</p>
          ) : (
            <div className="grid gap-3">
              {sections.map((section) => (
                <article key={section.id ?? section.sectionKey} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-950">{section.title || section.sectionKey}</h3>
                    <Badge value={section.reviewStatus} />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{section.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'taxonomy' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black">ملفات الدرجة</h2>
            <div className="grid gap-3">
              {profiles.length === 0 ? <p className="text-sm text-slate-500">لا توجد ملفات درجة محفوظة.</p> : profiles.map((profile) => (
                <div key={profile.id ?? profile.code} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-black">{profile.displayName || major.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatLabel(profile.level)} · {profile.collegeContext || major.collegeOrFaculty || 'بدون سياق'}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black">خرائط التصنيف</h2>
            <div className="grid gap-3">
              {mappings.length === 0 ? <p className="text-sm text-slate-500">لا توجد خرائط تصنيف محفوظة.</p> : mappings.map((mapping) => (
                <div key={mapping.id ?? mapping.taxonomyNodeId} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-mono text-xs font-bold text-slate-700">{mapping.taxonomyNodeId}</p>
                  <p className="mt-1 text-xs text-slate-500">{mapping.relationshipType || 'PRIMARY'} · {mapping.standardType || 'custom'} {mapping.confidence !== undefined ? `· ثقة ${mapping.confidence}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'relations' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black">الأسماء والمرادفات</h2>
            <div className="flex flex-wrap gap-2">
              {aliases.length === 0 ? <p className="text-sm text-slate-500">لا توجد أسماء بديلة.</p> : aliases.map((alias) => <Badge key={alias.id ?? alias.alias} value={`${alias.alias} · ${alias.aliasType || 'ALIAS'}`} />)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black">التخصصات المرتبطة</h2>
            <div className="grid gap-2">
              {relationships.length === 0 ? <p className="text-sm text-slate-500">لا توجد علاقات محفوظة.</p> : relationships.map((relationship) => (
                <div key={relationship.id ?? `${relationship.targetMajorId}-${relationship.relationshipType}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-bold">{relationship.relationshipType || 'RELATED'} · {relationship.targetMajorId || 'غير محدد'}</p>
                  {relationship.notes && <p className="mt-1 text-xs text-slate-500">{relationship.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'versions' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black">نسخ الاستيراد</h2>
            <div className="grid gap-3">
              {versions.length === 0 ? <p className="text-sm text-slate-500">لا توجد نسخ محفوظة.</p> : versions.map((version) => (
                <div key={version.id ?? version.versionNumber} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-black">نسخة {version.versionNumber ?? '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">{version.sourceFileName || 'ملف غير محدد'} · {version.status || 'DRAFT'}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black">المصادر</h2>
            <div className="grid gap-3">
              {sources.length === 0 ? <p className="text-sm text-slate-500">لا توجد مصادر محفوظة.</p> : sources.map((source) => (
                <div key={source.id ?? source.sourceHash ?? source.sourceName} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-black">{source.sourceName || 'مصدر غير محدد'}</p>
                  <p className="mt-1 text-xs text-slate-500">{source.sourceType || 'SOURCE'} · {source.sourceHash || 'بدون بصمة'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {saving && (
        <div className="fixed bottom-4 left-4 inline-flex items-center gap-2 rounded-lg bg-[#142B5F] px-4 py-3 text-sm font-bold text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          جار تنفيذ الإجراء...
        </div>
      )}
    </main>
  );
}
