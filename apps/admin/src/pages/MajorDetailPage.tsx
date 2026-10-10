import {MajorGovernanceWorkspace} from '../components/MajorGovernanceWorkspace';
/// <reference types="vite/client" />
import {
AlertCircle,
AlertTriangle,
ArrowLeft,
BookOpen,
Building2,
Check,
CheckCircle2,
Clock,
Edit3,
ExternalLink,
FileText,
GitBranch,
Globe,
GraduationCap,
Layers,
Layers3,
Link2,
Loader2,
RotateCcw,
Save,
ShieldCheck,
Sparkles,
X
} from 'lucide-react';
import React,{ useEffect,useMemo,useState } from 'react';
import { Link,useParams,useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { ReviewedGraphEditor } from '../components/ReviewedGraphEditor';

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
  description?: string;
  studentFriendlySummary?: string;
  acquiredSkills?: string[];
  careerOutcomes?: string[];
  typicalCourses?: string[];
  updatedAt?: string;
}

interface MajorProfile {
  id: string;
  majorId?: string;
  level: string;
  code?: string;
  profileType?: string;
  displayName?: string;
  localizedNameAr?: string;
  localizedNameEn?: string;
  collegeContext?: string;
  academicFieldId?: string;
  disciplineId?: string;
  currentPublishedVersionId?: string | null;
  status?: string;
  completenessStatus?: string;
  updatedAt?: string;
}

interface MajorContentSection {
  id?: string;
  profileId?: string;
  versionId?: string;
  sectionKey: string;
  title?: string;
  content: string;
  reviewStatus?: string;
  metadata?: {
    sourceLevel?: number;
    sourceReviewStatus?: string;
    [key: string]: unknown;
  };
}

interface MajorVersion {
  id?: string;
  versionNumber?: number;
  profileId?: string;
  status?: string;
  sourceFileName?: string;
  sourceHash?: string;
  importedAt?: string;
  publishedAt?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
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
  profileId?: string;
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
  { id: 'taxonomy', label: 'التصنيف والدرجات', icon: Layers3 },
  { id: 'relations', label: 'العلاقات والمرادفات', icon: GitBranch },
  { id: 'versions', label: 'النسخ والمصادر', icon: Link2 },
];

const PUBLIC_WEB_BASE_URL = (import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '');

function formatLabel(value?: string | null): string {
  if (!value) return 'غير محدد';
  const val = value.toUpperCase();
  if (val === 'PUBLISHED') return 'منشور للعامة';
  if (val === 'READY_TO_PUBLISH') return 'جاهز للنشر';
  if (val === 'READY_TO_REVIEW') return 'جاهز للمراجعة';
  if (val === 'IMPORTED') return 'مستورد';
  if (val === 'COMPLETE') return 'مكتمل البيانات';
  if (val === 'NEEDS_REVIEW') return 'بحاجة لمراجعة';
  if (val === 'INCOMPLETE') return 'بيانات ناقصة';
  if (val === 'ARCHIVED') return 'مؤرشف';
  if (val === 'BACHELOR' || val === 'BACHELORS') return 'بكالوريوس';
  if (val === 'MASTER' || val === 'MASTERS') return 'ماجستير';
  if (val === 'DOCTORATE' || val === 'PHD') return 'دكتوراه';
  if (val === 'FELLOWSHIP') return 'زمالة أبحاث';
  return value.replace(/_/g, ' ');
}

function badgeTone(value?: string): string {
  switch (value?.toUpperCase()) {
    case 'PUBLISHED':
    case 'COMPLETE':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30';
    case 'READY_TO_PUBLISH':
      return 'bg-cyan-50 text-cyan-800 border-cyan-300 ring-1 ring-cyan-400/30';
    case 'READY_TO_REVIEW':
    case 'NEEDS_REVIEW':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-600 border-slate-300';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function Badge({ value }: { value?: string | null }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badgeTone(value ?? undefined)} font-['Cairo']`}>
      {value?.toUpperCase() === 'PUBLISHED' && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
      {formatLabel(value)}
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-[#FAF7F0]/40 p-4 transition hover:bg-white hover:border-[#0E7C86]/30">
      <dt className="text-xs font-bold text-slate-400 font-['Cairo']">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-black text-slate-900 font-['Cairo']">{value || '—'}</dd>
    </div>
  );
}

interface CanonicalMainSectionDef {
  number: number;
  title: string;
  matcher: (key: string, title?: string) => boolean;
}

const BACHELOR_MAIN_SECTIONS: CanonicalMainSectionDef[] = [
  { number: 1, title: 'معلومات التخصص الأساسية', matcher: (k) => k.startsWith('01-') },
  { number: 2, title: 'نبذة عن التخصص', matcher: (k) => k.startsWith('02-') },
  { number: 3, title: 'ماذا يدرس الطالب؟', matcher: (k) => ['03-', '04-', '05-', '06-'].some(p => k.startsWith(p)) },
  { number: 4, title: 'المهارات التخصصية التي يكتسبها الطالب', matcher: (k) => k.startsWith('07-') },
  { number: 5, title: 'المسارات والتخصصات الدقيقة', matcher: (k) => k.startsWith('08-') },
  { number: 6, title: 'مجالات العمل بعد التخرج', matcher: (k) => k.startsWith('09-') },
  { number: 7, title: 'أهم الوظائف المرتبطة بالتخصص', matcher: (k) => k.startsWith('10-') },
  { number: 8, title: 'فرص الدراسات العليا', matcher: (k) => ['11-', '12-'].some(p => k.startsWith(p)) },
  { number: 9, title: 'التخصصات المشابهة', matcher: (k) => k.startsWith('13-') },
  { number: 10, title: 'التنبيه المهني', matcher: (k) => k.startsWith('14-') },
];

const MASTER_MAIN_SECTIONS: CanonicalMainSectionDef[] = [
  { number: 1, title: 'معلومات تخصص الماجستير الأساسية', matcher: (k) => k.startsWith('01-') },
  { number: 2, title: 'نبذة عن تخصص الماجستير', matcher: (k) => k.startsWith('02-') },
  { number: 3, title: 'أنواع البرنامج الشائعة', matcher: (k) => k.startsWith('03-') },
  { number: 4, title: 'الخلفيات الأكاديمية المناسبة للقبول', matcher: (k) => ['04-', '05-', '06-', '07-'].some(p => k.startsWith(p)) },
  { number: 5, title: 'المتطلبات التأسيسية أو الاستدراكية العامة', matcher: (k) => k.startsWith('08-') },
  { number: 6, title: 'ماذا يدرس الطالب؟', matcher: (k) => ['09-', '10-', '11-', '12-', '13-'].some(p => k.startsWith(p)) },
  { number: 7, title: 'المسارات والتخصصات الدقيقة', matcher: (k) => k.startsWith('14-') },
  { number: 8, title: 'مكونات التخرج', matcher: (k) => k.startsWith('15-') },
  { number: 9, title: 'المهارات المتقدمة المكتسبة', matcher: (k) => k.startsWith('16-') },
  { number: 10, title: 'مجالات العمل بعد الماجستير', matcher: (k) => k.startsWith('17-') },
  { number: 11, title: 'أهم الوظائف المرتبطة', matcher: (k) => k.startsWith('18-') },
  { number: 12, title: 'المسارات الأكاديمية والمهنية اللاحقة', matcher: (k) => ['19-', '20-', '21-'].some(p => k.startsWith(p)) },
  { number: 13, title: 'التخصصات المشابهة والفروق', matcher: (k) => k.startsWith('22-') },
  { number: 14, title: 'العلاقة بتخصصات البكالوريوس', matcher: (k) => k.startsWith('23-') },
  { number: 15, title: 'التنبيه الأكاديمي والمهني', matcher: (k) => k.startsWith('24-') },
  { number: 16, title: 'المصادر والتحقق', matcher: (k) => k.startsWith('25-') },
];

const DOCTORATE_MAIN_SECTIONS: CanonicalMainSectionDef[] = [
  { number: 1, title: 'معلومات تخصص الدكتوراه الأساسية', matcher: (k) => k.startsWith('01-') },
  { number: 2, title: 'طبيعة الدكتوراه وهدفها', matcher: (k) => k.startsWith('02-') },
  { number: 3, title: 'أنواع الدكتوراه الشائعة', matcher: (k) => k.startsWith('03-') },
  { number: 4, title: 'الخلفيات الأكاديمية المناسبة ومسارات الدخول', matcher: (k) => ['04-', '05-', '06-', '07-', '08-'].some(p => k.startsWith(p)) },
  { number: 5, title: 'مراحل برنامج الدكتوراه', matcher: (k) => ['09-', '10-'].some(p => k.startsWith(p)) },
  { number: 6, title: 'المعرفة والمقررات المتقدمة', matcher: (k) => ['11-', '12-', '13-'].some(p => k.startsWith(p)) },
  { number: 7, title: 'مجالات البحث والتخصصات الدقيقة', matcher: (k) => k.startsWith('14-') },
  { number: 8, title: 'الامتحان التأهيلي أو الشامل عند وجوده', matcher: (k) => k.startsWith('15-') },
  { number: 9, title: 'مقترح البحث ومرحلة الترشح', matcher: (k) => k.startsWith('16-') },
  { number: 10, title: 'الأطروحة والمساهمة الأصلية', matcher: (k) => k.startsWith('17-') },
  { number: 11, title: 'الإشراف والبيئة البحثية', matcher: (k) => k.startsWith('18-') },
  { number: 12, title: 'متطلبات البحث والنشر والتدريس', matcher: (k) => k.startsWith('19-') },
  { number: 13, title: 'المهارات البحثية والمهنية المتقدمة', matcher: (k) => k.startsWith('20-') },
  { number: 14, title: 'مجالات العمل بعد الدكتوراه', matcher: (k) => k.startsWith('21-') },
  { number: 15, title: 'أهم الوظائف المرتبطة', matcher: (k) => k.startsWith('22-') },
  { number: 16, title: 'ما بعد الدكتوراه والمسارات اللاحقة', matcher: (k) => k.startsWith('23-') },
  { number: 17, title: 'الدكتوراه المشابهة والفروق', matcher: (k) => k.startsWith('24-') },
  { number: 18, title: 'التنبيه الأكاديمي والمهني', matcher: (k) => k.startsWith('25-') },
  { number: 19, title: 'المصادر والتحقق', matcher: (k) => k.startsWith('26-') },
];

interface MainSectionGroup {
  number: number;
  title: string;
  blocks: MajorContentSection[];
}

function groupSectionsByCanonicalDefinitions(
  level: string | undefined,
  rawSections: MajorContentSection[]
): { groups: MainSectionGroup[]; unassigned: MajorContentSection[] } {
  const normLevel = (level || '').toUpperCase();
  let defs = BACHELOR_MAIN_SECTIONS;
  if (normLevel === 'MASTER' || normLevel === 'MASTERS') {
    defs = MASTER_MAIN_SECTIONS;
  } else if (normLevel === 'DOCTORATE' || normLevel === 'PHD') {
    defs = DOCTORATE_MAIN_SECTIONS;
  }

  const groups: MainSectionGroup[] = defs.map(d => ({
    number: d.number,
    title: d.title,
    blocks: [],
  }));

  const unassigned: MajorContentSection[] = [];

  const normalizeTitle = (value: string) => value.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[\u064B-\u065F؟?]/g, '').replace(/^\d+[.)-]?\s*/, '').trim();
  let parentNumber: number | undefined;
  for (const section of rawSections) {
    const title = normalizeTitle(section.title || '');
    const parentTitle = typeof section.metadata?.sourceMainTitle === 'string'
      ? normalizeTitle(section.metadata.sourceMainTitle) : undefined;
    let number = defs.find(def => normalizeTitle(def.title) === (parentTitle || title))?.number;
    if (!number && (section.metadata?.sourceLevel === 3 || section.metadata?.sourceLevel === 4)) {
      if (normLevel === 'MASTER' || normLevel === 'MASTERS') {
        if (/تخصصات بكالوريوس|تخصصات قريبة|تخصصات قد تحتاج/.test(title)) number = 4;
        else if (/المقررات|مناهج البحث|الجانب العملي/.test(title)) number = 6;
        else if (/الدكتوراه المرتبطة|الزمالات او الاعتمادات/.test(title)) number = 12;
      } else if (normLevel === 'DOCTORATE' || normLevel === 'PHD') {
        if (/تخصصات الماجستير|تخصصات قريبة|الدخول المباشر|الخبرة او الترخيص/.test(title)) number = 4;
        else if (/المعرفة النظرية|مناهج البحث|الاخلاقيات والنزاهة/.test(title)) number = 6;
      } else {
        if (/المواد|الجانب العملي/.test(title)) number = 3;
        else if (/تخصصات الماجستير المرتبطة/.test(title)) number = 8;
      }
      number ??= parentNumber;
    }
    if (!number && section.metadata?.sourceLevel === undefined) number = defs.find(def => def.matcher(section.sectionKey, section.title))?.number;
    if (number) {
      groups.find(group => group.number === number)?.blocks.push(section);
      parentNumber = number;
    } else unassigned.push(section);
  }

  return { groups, unassigned };
}

function FormattedContent({ text }: { text: string }) {
  if (!text) return <span className="text-slate-400 italic font-['Cairo']">لا يوجد محتوى مسجل</span>;

  // Check if content has markdown tables
  const lines = text.split('\n');
  const hasTable = lines.some(l => l.trim().startsWith('|') && l.trim().endsWith('|'));

  if (!hasTable) {
    return (
      <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-700 font-medium font-['Cairo']">
        {text}
      </div>
    );
  }

  // Segment text into table and text chunks
  const elements: React.ReactNode[] = [];
  let tableLines: string[] = [];
  let currentKey = 0;

  const flushTable = () => {
    if (tableLines.length === 0) return;
    const rows = tableLines.filter(l => !l.trim().match(/^\|(?:\s*:?-+:?\s*\|)+$/));
    if (rows.length > 0) {
      const headerCols = rows[0].split('|').slice(1, -1).map(c => c.trim());
      const bodyRows = rows.slice(1).map(r => r.split('|').slice(1, -1).map(c => c.trim()));
      elements.push(
        <div key={`table-${currentKey++}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs font-['Cairo']">
            <thead className="bg-[#142B5F]/5">
              <tr>
                {headerCols.map((c, i) => (
                  <th key={i} className="px-3 py-2 text-right font-black text-[#142B5F]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {bodyRows.map((r, ri) => (
                <tr key={ri} className="hover:bg-slate-50 transition">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 font-medium text-slate-800">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableLines = [];
  };

  let textBuffer: string[] = [];
  const flushText = () => {
    if (textBuffer.length === 0) return;
    const txt = textBuffer.join('\n').trim();
    if (txt) {
      elements.push(
        <p key={`text-${currentKey++}`} className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-700 font-medium font-['Cairo']">
          {txt}
        </p>
      );
    }
    textBuffer = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushText();
      tableLines.push(line);
    } else {
      flushTable();
      textBuffer.push(line);
    }
  }
  flushText();
  flushTable();

  return <div className="space-y-2">{elements}</div>;
}

export function MajorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [major, setMajor] = useState<MajorDetail | null>(null);
  const [profiles, setProfiles] = useState<MajorProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [sections, setSections] = useState<MajorContentSection[]>([]);
  const [versions, setVersions] = useState<MajorVersion[]>([]);
  const [aliases, setAliases] = useState<MajorAlias[]>([]);
  const [relationships, setRelationships] = useState<MajorRelationship[]>([]);
  const [mappings, setMappings] = useState<MajorClassificationMapping[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Content Editing State
  const [editingBlockKey, setEditingBlockKey] = useState<string | null>(null);
  const [editedBlocks, setEditedBlocks] = useState<Record<string, { title: string; content: string; reviewStatus: string }>>({});
  const [dirtyBlockKeys, setDirtyBlockKeys] = useState<Set<string>>(new Set());
  const [savingBlockKey, setSavingBlockKey] = useState<string | null>(null);

  // Edit Modal State (Basic Metadata)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: '',
    canonicalName: '',
    degreeLevel: 'BACHELOR',
    collegeOrFaculty: '',
    academicFieldOrDiscipline: '',
    classificationCode: '',
    officialSourceUrl: '',
    description: '',
    studentFriendlySummary: '',
  });

  // Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'publish' | 'unpublish' | 'archive' | 'mark-publishable' | 'mark-ready' | null;
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant: 'emerald' | 'amber' | 'rose' | 'teal';
  }>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
    confirmLabel: '',
    confirmVariant: 'emerald',
  });

  // 1. Initial Load of Major and Profiles
  const loadMajorAndProfiles = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [majorResult, profileResult, aliasResult, relationshipResult, mappingResult] = await Promise.all([
        adminApiClient.request<MajorDetail>(`/admin/majors/${id}`),
        adminApiClient.request<{ data: MajorProfile[] }>(`/admin/majors/${id}/profiles`).catch(() => ({ data: [] })),
        adminApiClient.request<{ data: MajorAlias[] }>(`/admin/majors/${id}/aliases`).catch(() => ({ data: [] })),
        adminApiClient.request<{ data: MajorRelationship[] }>(`/admin/majors/${id}/relationships`).catch(() => ({ data: [] })),
        adminApiClient.request<{ data: MajorClassificationMapping[] }>(`/admin/majors/${id}/classification-mappings`).catch(() => ({ data: [] })),
      ]);

      setMajor(majorResult);
      const profList = profileResult.data ?? [];
      setProfiles(profList);
      setAliases(aliasResult.data ?? []);
      setRelationships(relationshipResult.data ?? []);
      setMappings(mappingResult.data ?? []);

      // Determine initial active profile
      const queryProf = searchParams.get('profileId');
      let targetProfile = profList.find(p => p.id === queryProf || p.code === queryProf);
      if (!targetProfile && id) {
        targetProfile = profList.find(p => p.id === id || p.code === id);
      }
      if (!targetProfile && profList.length > 0) {
        targetProfile = profList[0];
      }

      const activeProfId = targetProfile ? targetProfile.id : null;
      setSelectedProfileId(activeProfId);
      if (activeProfId && searchParams.get('profileId') !== activeProfId) {
        setSearchParams({ profileId: activeProfId }, { replace: true });
      }

      // Populate Edit Form
      setEditFormData({
        displayName: majorResult.displayName || '',
        canonicalName: majorResult.canonicalName || '',
        degreeLevel: targetProfile?.level || majorResult.degreeLevel || 'BACHELOR',
        collegeOrFaculty: majorResult.collegeOrFaculty || '',
        academicFieldOrDiscipline: majorResult.academicFieldOrDiscipline || '',
        classificationCode: targetProfile?.code || majorResult.classificationCode || '',
        officialSourceUrl: majorResult.officialSourceUrl || majorResult.sourceUrl || '',
        description: majorResult.description || '',
        studentFriendlySummary: majorResult.studentFriendlySummary || '',
      });

      // Load Profile-Scoped Data (Sections & Versions)
      if (activeProfId) {
        await loadProfileData(majorResult.id, activeProfId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل تفاصيل التخصص الأكاديمي.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Profile Data specifically for activeProfile
  const loadProfileData = async (majorId: string, profileId: string) => {
    setLoadingSections(true);
    try {
      const [sectionResult, versionResult] = await Promise.all([
        adminApiClient.request<{ data: MajorContentSection[] }>(`/admin/majors/${majorId}/content-sections?profileId=${profileId}`).catch(() => ({ data: [] })),
        adminApiClient.request<{ data: MajorVersion[] }>(`/admin/majors/${majorId}/versions?profileId=${profileId}`).catch(() => ({ data: [] })),
      ]);
      const secData = sectionResult.data ?? [];
      setSections(secData);
      setVersions(versionResult.data ?? []);

      // Initialize editedBlocks map
      const initialEdits: Record<string, { title: string; content: string; reviewStatus: string }> = {};
      secData.forEach(s => {
        initialEdits[s.sectionKey] = {
          title: s.title || '',
          content: s.content || '',
          reviewStatus: s.reviewStatus || 'NEEDS_REVIEW',
        };
      });
      setEditedBlocks(initialEdits);
      setDirtyBlockKeys(new Set());
      setEditingBlockKey(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل أقسام المحتوى لهذا المستوى.');
    } finally {
      setLoadingSections(false);
    }
  };

  useEffect(() => {
    void loadMajorAndProfiles();
  }, [id]);

  const activeProfile = useMemo(() => {
    if (!selectedProfileId) return profiles[0] || null;
    return profiles.find(p => p.id === selectedProfileId) || profiles[0] || null;
  }, [profiles, selectedProfileId]);

  const activeDegreeLevel = activeProfile?.level || major?.degreeLevel || 'BACHELOR';

  // Handle Level Switch
  const handleSelectLevel = async (profile: MajorProfile) => {
    if (dirtyBlockKeys.size > 0) {
      const confirmLeave = window.confirm('لديك تعديلات غير محفوظة على هذا المستوى. هل تود الانتقال دون حفظ؟');
      if (!confirmLeave) return;
    }
    setSelectedProfileId(profile.id);
    setSearchParams({ profileId: profile.id });
    if (major) {
      await loadProfileData(major.id, profile.id);
    }
  };

  // Grouped Canonical Sections for Active Profile
  const { groups: canonicalGroups, unassigned: unassignedBlocks } = useMemo(() => {
    return groupSectionsByCanonicalDefinitions(activeDegreeLevel, sections);
  }, [activeDegreeLevel, sections]);

  // Edit / Save Handlers for Content Blocks
  const handleStartEditBlock = (blockKey: string) => {
    setEditingBlockKey(blockKey);
    setSuccess(null);
    setError(null);
  };

  const handleBlockChange = (blockKey: string, field: 'title' | 'content' | 'reviewStatus', val: string) => {
    setEditedBlocks(prev => ({
      ...prev,
      [blockKey]: {
        ...(prev[blockKey] || { title: '', content: '', reviewStatus: 'NEEDS_REVIEW' }),
        [field]: val,
      }
    }));
    setDirtyBlockKeys(prev => new Set(prev).add(blockKey));
  };

  const handleCancelEditBlock = (blockKey: string) => {
    const original = sections.find(s => s.sectionKey === blockKey);
    if (original) {
      setEditedBlocks(prev => ({
        ...prev,
        [blockKey]: {
          title: original.title || '',
          content: original.content || '',
          reviewStatus: original.reviewStatus || 'NEEDS_REVIEW',
        }
      }));
    }
    setDirtyBlockKeys(prev => {
      const next = new Set(prev);
      next.delete(blockKey);
      return next;
    });
    setEditingBlockKey(null);
  };

  const handleSaveBlock = async (blockKey: string) => {
    if (!major || !activeProfile) return;
    const blockData = editedBlocks[blockKey];
    if (!blockData) return;

    const original = sections.find(s => s.sectionKey === blockKey);
    const targetVersionId = versions[0]?.id;

    setSavingBlockKey(blockKey);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminApiClient.request<{
        success: boolean;
        profileId: string;
        versionId: string;
        count: number;
        data: MajorContentSection[];
      }>(`/admin/majors/${major.id}/content-sections`, {
        method: 'PUT',
        body: JSON.stringify({
          reason:window.prompt('سبب تعديل المحتوى') || '',
          profileId: activeProfile.id,
          versionId: targetVersionId,
          sections: [
            {
              id: original?.id,
              sectionKey: blockKey,
              title: blockData.title,
              content: blockData.content,
              reviewStatus: blockData.reviewStatus,
            }
          ]
        })
      });

      if (response && response.success) {
        setSuccess(`تم حفظ تعديلات القسم بنجاح على ملف مستوى ${activeProfile.code || formatLabel(activeProfile.level)}.`);
        setDirtyBlockKeys(prev => {
          const next = new Set(prev);
          next.delete(blockKey);
          return next;
        });
        setEditingBlockKey(null);
        // Reload fresh data from server to verify exact persistence
        await loadProfileData(major.id, activeProfile.id);
      } else {
        throw new Error('لم تنجح عملية الحفظ في الخادم.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ تعديلات المحتوى.');
    } finally {
      setSavingBlockKey(null);
    }
  };

  const handleSaveAllDirtyBlocks = async () => {
    if (!major || !activeProfile || dirtyBlockKeys.size === 0) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const targetVersionId = versions[0]?.id;
    const dirtySectionsPayload = Array.from(dirtyBlockKeys).map(key => {
      const original = sections.find(s => s.sectionKey === key);
      const data = editedBlocks[key];
      return {
        id: original?.id,
        sectionKey: key,
        title: data?.title ?? original?.title,
        content: data?.content ?? original?.content ?? '',
        reviewStatus: data?.reviewStatus || original?.reviewStatus || 'NEEDS_REVIEW',
      };
    });

    try {
      const response = await adminApiClient.request<{
        success: boolean;
        profileId: string;
        versionId: string;
        count: number;
      }>(`/admin/majors/${major.id}/content-sections`, {
        method: 'PUT',
        body: JSON.stringify({
          reason:window.prompt('سبب تعديل المحتوى') || '',
          profileId: activeProfile.id,
          versionId: targetVersionId,
          sections: dirtySectionsPayload,
        })
      });

      if (response && response.success) {
        setSuccess(`تم حفظ ${response.count} أقسام بنجاح على ملف المستوى.`);
        setDirtyBlockKeys(new Set());
        setEditingBlockKey(null);
        await loadProfileData(major.id, activeProfile.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ جميع التعديلات.');
    } finally {
      setSaving(false);
    }
  };

  // Direct Smart Workflow Executor (Publish/Unpublish)
  const executeActionWithFlow = async (action: string, successMessage: string) => {
    if (!id || !major) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    try {
      if (dirtyBlockKeys.size > 0) throw new Error('احفظ تعديلات المحتوى قبل تغيير حالة النشر.');
      const targetId = activeProfile?.id || major.id;
      await adminApiClient.request(`/admin/majors/${targetId}/${action}`, { method: 'POST',body:JSON.stringify({reason:window.prompt('سبب الإجراء') || ''}) });

      setSuccess(successMessage);
      await loadMajorAndProfiles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء المطلوب.');
    } finally {
      setSaving(false);
    }
  };

  const isPublished = (activeProfile?.status || major?.status)?.toUpperCase() === 'PUBLISHED';
  const publicMajorUrl = major?.slug
    ? `${PUBLIC_WEB_BASE_URL}/majors/${major.slug}${activeDegreeLevel ? `/${activeDegreeLevel.toLowerCase()}` : ''}`
    : null;

  if (loading && !major) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-9 w-9 animate-spin text-[#0E7C86]" />
        <p className="text-xs font-bold text-slate-500 font-['Cairo']">جاري تحميل تفاصيل التخصص الأكاديمي...</p>
      </div>
    );
  }

  if (!major) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center space-y-4 font-['Cairo']">
        <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
        <h2 className="text-base font-black text-red-900">لم يتم العثور على التخصص المطلوب</h2>
        <p className="text-xs text-red-700">{error || 'قد يكون المعرف غير صحيح أو تم نقله.'}</p>
        <Link to="/majors" className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-2 text-xs font-bold text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>العودة لقائمة التخصصات</span>
        </Link>
      </div>
    );
  }

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 font-['Cairo'] pb-16">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/majors"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-[#0E7C86]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>العودة لقائمة التخصصات الأكاديمية</span>
        </Link>

        {dirtyBlockKeys.size > 0 && (
          <div className="flex items-center gap-3 animate-pulse">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 border border-amber-300">
              يوجد {dirtyBlockKeys.size} أقسام معدلة غير محفوظة
            </span>
            <button
              type="button"
              onClick={handleSaveAllDirtyBlocks}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>حفظ الكل الآن</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Level Profiles Navigation Bar */}
      {profiles.length > 0 && (
        <section className="rounded-3xl border border-[#DDEFF2] bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-black text-[#142B5F] flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#0E7C86]" />
                <span>ملفات الدرجات الأكاديمية المرتبطة بهذا التخصص ({profiles.length})</span>
              </h2>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                كل درجة علمية لها ملف وهوية ومحتوى ونسخ مستقلة تماماً داخل النظام دون تكرار الجذور.
              </p>
            </div>
            <div className="text-[11px] font-bold text-[#0E7C86] bg-[#0E7C86]/10 px-3 py-1 rounded-full w-fit">
              الملف النشط: <strong className="text-[#142B5F]">{activeProfile?.code || '—'}</strong> ({formatLabel(activeProfile?.level)})
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
            {profiles.map((prof) => {
              const isSelected = prof.id === activeProfile?.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => handleSelectLevel(prof)}
                  className={`flex flex-col text-right rounded-2xl p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0E7C86] bg-gradient-to-l from-[#FAF7F0] to-teal-50/40 shadow-sm ring-2 ring-[#0E7C86]/20'
                      : 'border-slate-200 bg-white hover:border-[#21A7B4] hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-black ${
                      isSelected ? 'bg-[#142B5F] text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <GraduationCap className="h-3 w-3" />
                      <span>{formatLabel(prof.level)}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{prof.code || prof.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-black text-[#142B5F] line-clamp-1">
                    {prof.displayName || major.displayName}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                    <span>الحالة: {formatLabel(prof.status || major.status)}</span>
                    <span className="font-bold text-[#0E7C86] flex items-center gap-1">
                      {isSelected ? 'المستوى المعروض' : 'انقر للعرض والتعديل'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Hero Header Card */}
      <header className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-24 end-0 h-64 w-64 rounded-full bg-[#F2CD78] opacity-15 pointer-events-none blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-xs">
                <GraduationCap className="h-3.5 w-3.5 text-[#F2CD78]" />
                <span>{formatLabel(activeDegreeLevel)}</span>
              </span>

              {(activeProfile?.code || major.classificationCode || major.publicId) && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white/90 backdrop-blur-xs">
                  <span>#{activeProfile?.code || major.classificationCode || major.publicId}</span>
                </span>
              )}

              <Badge value={activeProfile?.status || major.status} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              {activeProfile?.displayName || major.displayName}
            </h1>

            {major.canonicalName && (
              <p className="text-xs sm:text-sm font-semibold text-white/80 font-mono">
                {major.canonicalName}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-white/80 pt-1">
              {major.collegeOrFaculty && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#F2CD78]" />
                  <span>{major.collegeOrFaculty}</span>
                </div>
              )}
              {major.academicFieldOrDiscipline && (
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-200" />
                  <span>{major.academicFieldOrDiscipline}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap gap-2.5 sm:gap-3 shrink-0">
            <div className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur-xs border border-white/10 min-w-20">
              <div className="text-xl font-black text-white">{sections.length}</div>
              <div className="text-[11px] font-bold text-white/70">كتل المحتوى</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur-xs border border-white/10 min-w-20">
              <div className="text-xl font-black text-white">{canonicalGroups.length}</div>
              <div className="text-[11px] font-bold text-white/70">الأقسام الرئيسية</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur-xs border border-white/10 min-w-20">
              <div className="text-xl font-black text-white">{versions.length}</div>
              <div className="text-[11px] font-bold text-white/70">نسخ العمل</div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[#DDEFF2] bg-white p-2 shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-[#142B5F] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-[#FAF7F0] hover:text-[#0E7C86]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#F2CD78]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.id === 'content' && dirtyBlockKeys.size > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab 1: Basic Identity Data */}
      {activeTab === 'basic' && (
        <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="h-5 w-5 text-[#0E7C86]" />
                  <h2 className="text-base font-black text-[#142B5F]">بطاقة هوية التخصص المعتمدة</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-[#0E7C86]" />
                  <span>تعديل الحقول الأساسية</span>
                </button>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="الاسم العربي المعتمد" value={activeProfile?.displayName || major.displayName} />
                <Field label="الاسم الإنجليزي / القانوني" value={major.canonicalName} />
                <Field label="الدرجة الأكاديمية" value={formatLabel(activeDegreeLevel)} />
                <Field label="رمز ملف المستوى" value={activeProfile?.code || major.classificationCode || major.publicId} />
                <Field label="الكلية / السياق الأكاديمي" value={activeProfile?.collegeContext || major.collegeOrFaculty} />
                <Field label="المجال والتخصص الدقيق" value={major.academicFieldOrDiscipline} />
                <Field label="معرف الجذر المشترك (Major ID)" value={major.id} />
                <Field label="معرف ملف المستوى (Profile ID)" value={activeProfile?.id} />
                <Field label="نظام التصنيف المرجعي" value={major.sourceClassificationSystem || 'Phase 10 Unified'} />
                <Field label="حالة النشر والجاهزية" value={formatLabel(activeProfile?.status || major.status)} />
              </dl>
            </div>

            {/* Description & Overview */}
            <div className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-black text-[#142B5F]">
                <BookOpen className="h-4 w-4 text-[#0E7C86]" />
                <span>النبذة والوصف الأكاديمي للطلاب</span>
              </div>
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-700 whitespace-pre-wrap bg-[#FAF7F0]/60 p-4 rounded-2xl border border-slate-100">
                {major.description || major.studentFriendlySummary || 'لا يوجد وصف مضاف لهذا التخصص بعد.'}
              </p>
            </div>
          </div>

          <aside className="space-y-4">
            {/* Quick Action Side Card */}
            <div className="rounded-3xl border border-[#DDEFF2] bg-gradient-to-br from-teal-50/50 via-white to-blue-50/40 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-[#142B5F] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#0E7C86]" />
                <span>حالة المستوى في المنظومة</span>
              </h3>
              <div className="space-y-2 text-xs font-medium text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>حالة النشر:</span>
                  <span className="font-bold text-[#142B5F]">{formatLabel(activeProfile?.status || major.status)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>اكتمال الحقول:</span>
                  <span className="font-bold text-emerald-700">{formatLabel(activeProfile?.completenessStatus || major.completenessStatus)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>كتل المحتوى:</span>
                  <span className="font-bold text-slate-700">{sections.length} كتلة</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>تاريخ التحديث:</span>
                  <span className="font-bold text-slate-700">
                    {major.updatedAt ? new Date(major.updatedAt).toLocaleDateString('ar-SA') : 'حديثاً'}
                  </span>
                </div>
              </div>

              {!isPublished ? (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmModal({
                      isOpen: true,
                      type: 'publish',
                      title: 'الموافقة على نشر التخصص',
                      message: `هل توافق على نشر تخصص «${activeProfile?.displayName || major.displayName}» في الصفحة العامة؟`,
                      confirmLabel: 'نعم، أوافق على النشر',
                      confirmVariant: 'emerald',
                    })
                  }
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0E7C86] hover:bg-[#142B5F] py-3 text-xs font-black text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-[#F2CD78]" />
                  <span>نشر التخصص للعامة</span>
                </button>
              ) : (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <span className="text-xs font-black text-emerald-800 flex items-center justify-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>منشور ومتاح للطلاب</span>
                  </span>
                </div>
              )}
            </div>

            {(major.officialSourceUrl || major.sourceUrl) && (
              <a
                href={major.officialSourceUrl || major.sourceUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#142B5F] hover:bg-[#0E7C86] px-4 text-xs sm:text-sm font-bold text-white transition shadow-xs"
              >
                <ExternalLink className="h-4 w-4 text-[#F2CD78]" />
                <span>فتح المصدر الرسمي</span>
              </a>
            )}

            {publicMajorUrl && (
              <a
                href={publicMajorUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs sm:text-sm font-bold text-slate-800 transition shadow-xs"
              >
                <Globe className="h-4 w-4 text-[#0E7C86]" />
                <span>فتح الصفحة العامة</span>
              </a>
            )}
          </aside>
        </section>
      )}

      {/* Tab 2: Detailed Content Sections */}
      {activeTab === 'content' && (
        <section className="space-y-6">
          {/* Header Card with Level Info & Section Counts */}
          <div className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#0E7C86]" />
                  <h2 className="text-base font-black text-[#142B5F]">
                    أقسام ومحتوى مستوى «{formatLabel(activeDegreeLevel)}» — {activeProfile?.code}
                  </h2>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {canonicalGroups.length} قسماً رئيسياً معتمداً من ملفات المصدر تضم {sections.length} كتلة محتوى تفصيلية كاملة.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {dirtyBlockKeys.size > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveAllDirtyBlocks}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-black text-white shadow-xs cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>حفظ جميع التعديلات ({dirtyBlockKeys.size})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => activeProfile && loadProfileData(major.id, activeProfile.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
                  title="إعادة تحميل المحتوى من قاعدة البيانات"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#0E7C86]" />
                  <span>تحديث</span>
                </button>
              </div>
            </div>

            {/* Status & Unsaved indicator bar */}
            {dirtyBlockKeys.size > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs font-bold text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    هناك <strong>{dirtyBlockKeys.size}</strong> كتل محتوى معدلة لم يتم حفظها بعد. انقر على «حفظ التعديلات» لتثبيتها في قاعدة البيانات.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => activeProfile && loadProfileData(major.id, activeProfile.id)}
                  className="text-amber-800 underline hover:text-amber-950 font-bold"
                >
                  تجاهل وإلغاء التعديلات
                </button>
              </div>
            )}
          </div>

          {loadingSections ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-[#DDEFF2] bg-white p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" />
              <p className="text-xs font-bold text-slate-500">جاري تحميل أقسام المحتوى للمستوى النشط...</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="rounded-3xl bg-teal-50/40 border border-teal-200 p-8 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-[#0E7C86] mx-auto opacity-60" />
              <h3 className="text-sm font-bold text-[#142B5F]">لا توجد كتل محتوى مسجلة لهذا المستوى بعد</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                يمكنك التحقق من ملفات الاستيراد أو إضافة محتوى جديد لمستوى {formatLabel(activeDegreeLevel)}.
              </p>
            </div>
          ) : (
            /* Canonical Main Sections Display */
            <div className="space-y-5">
              {canonicalGroups.map((group) => {
                const hasBlocks = group.blocks.length > 0;
                return (
                  <article
                    key={group.number}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:border-[#0E7C86]/40"
                  >
                    {/* Main Section Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#FAF7F0]/60 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#142B5F] text-xs font-black text-white shrink-0">
                          {group.number}
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-[#142B5F]">
                          {group.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                          {group.blocks.length} {group.blocks.length === 1 ? 'كتلة' : 'كتل'}
                        </span>
                      </div>
                    </div>

                    {/* Section Body: Blocks */}
                    <div className="divide-y divide-slate-100 p-6 space-y-4">
                      {!hasBlocks ? (
                        <p className="text-xs text-slate-400 italic">لا توجد كتل محتوى لهذا القسم</p>
                      ) : (
                        group.blocks.map((block) => {
                          const isEditing = editingBlockKey === block.sectionKey;
                          const isDirty = dirtyBlockKeys.has(block.sectionKey);
                          const isSavingThis = savingBlockKey === block.sectionKey;
                          const currentDraft = editedBlocks[block.sectionKey] || {
                            title: block.title || '',
                            content: block.content || '',
                            reviewStatus: block.reviewStatus || 'NEEDS_REVIEW',
                          };
                          const isSubBlock = Boolean(block.metadata?.sourceLevel && block.metadata.sourceLevel > 2);

                          return (
                            <div key={block.id ?? block.sectionKey} className={`pt-4 first:pt-0 ${isSubBlock ? 'pr-4 border-r-2 border-[#0E7C86]/30' : ''}`}>
                              {/* Block Sub-header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                                <div className="flex items-center gap-2">
                                  {isSubBlock && (
                                    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-[#0E7C86] border border-teal-200">
                                      كتلة فرعية
                                    </span>
                                  )}
                                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                                    {block.title || block.sectionKey}
                                  </h4>
                                  <span className="font-mono text-[10px] text-slate-400">
                                    ({block.sectionKey})
                                  </span>
                                  {isDirty && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                                      معدّل غير محفوظ
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge value={block.reviewStatus} />

                                  {!isEditing ? (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditBlock(block.sectionKey)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 transition cursor-pointer"
                                    >
                                      <Edit3 className="h-3 w-3 text-[#0E7C86]" />
                                      <span>تعديل</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveBlock(block.sectionKey)}
                                        disabled={isSavingThis}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#0E7C86] hover:bg-[#142B5F] px-2.5 py-1 text-xs font-bold text-white shadow-xs cursor-pointer"
                                      >
                                        {isSavingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        <span>حفظ</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelEditBlock(block.sectionKey)}
                                        disabled={isSavingThis}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 cursor-pointer"
                                      >
                                        <X className="h-3 w-3" />
                                        <span>إلغاء</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* View Mode vs Edit Mode */}
                              {!isEditing ? (
                                <div className="mt-2 rounded-2xl bg-[#FAF7F0]/30 p-4 border border-slate-100">
                                  <FormattedContent text={block.content} />
                                </div>
                              ) : (
                                <div className="mt-2 rounded-2xl border border-[#0E7C86]/40 bg-teal-50/20 p-4 space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                      عنوان القسم / الكتلة
                                    </label>
                                    <input
                                      type="text"
                                      value={currentDraft.title}
                                      onChange={(e) => handleBlockChange(block.sectionKey, 'title', e.target.value)}
                                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0E7C86] focus:ring-1 focus:ring-[#0E7C86]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                      حالة مراجعة المحتوى
                                    </label>
                                    <select
                                      value={currentDraft.reviewStatus}
                                      onChange={(e) => handleBlockChange(block.sectionKey, 'reviewStatus', e.target.value)}
                                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#0E7C86]"
                                    >
                                      <option value="NEEDS_REVIEW">بحاجة لمراجعة (NEEDS_REVIEW)</option>
                                      <option value="COMPLETE">مكتمل وجاهز للمراجعة (COMPLETE)</option>
                                      <option value="INCOMPLETE">غير مكتمل (INCOMPLETE)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-[11px] font-bold text-slate-600">
                                        نص المحتوى (يدعم تنسيق Markdown والجداول والقوائم)
                                      </label>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {currentDraft.content.length} حرف · {currentDraft.content.split('\n').length} سطر
                                      </span>
                                    </div>
                                    <textarea
                                      rows={8}
                                      value={currentDraft.content}
                                      onChange={(e) => handleBlockChange(block.sectionKey, 'content', e.target.value)}
                                      className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/20"
                                    />
                                  </div>

                                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => handleCancelEditBlock(block.sectionKey)}
                                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                                    >
                                      إلغاء التعديل
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveBlock(block.sectionKey)}
                                      disabled={isSavingThis}
                                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E7C86] hover:bg-[#142B5F] px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                                    >
                                      {isSavingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                      <span>حفظ هذا القسم</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </article>
                );
              })}

              {/* Any Unassigned / Extra Blocks */}
              {unassignedBlocks.length > 0 && (
                <article className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xs">
                  <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex items-center justify-between">
                    <h3 className="text-sm font-black text-amber-900">
                      أقسام إضافية مسجلة ({unassignedBlocks.length})
                    </h3>
                  </div>
                  <div className="p-6 divide-y divide-slate-100">
                    {unassignedBlocks.map(block => (
                      <div key={block.id ?? block.sectionKey} className="py-3">
                        <h4 className="text-xs font-bold text-slate-900">{block.title || block.sectionKey}</h4>
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs">
                          <FormattedContent text={block.content} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )}
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Taxonomy and Degree Level Profiles */}
      {activeTab === 'taxonomy' && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-[#142B5F] flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#0E7C86]" />
              <span>ملفات الدرجات العلمية المرتبطة بالجذر</span>
            </h2>
            <div className="grid gap-3">
              {profiles.length === 0 ? (
                <div className="rounded-2xl bg-[#FAF7F0] p-4 text-xs font-bold text-slate-600">
                  الدرجة الأساسية: <strong className="text-[#142B5F]">{formatLabel(major.degreeLevel)}</strong>
                </div>
              ) : (
                profiles.map((profile) => (
                  <div key={profile.id ?? profile.code} className="rounded-2xl border border-slate-200 bg-[#FAF7F0]/50 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm text-[#142B5F]">{profile.displayName || major.displayName}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {formatLabel(profile.level)} · الرمز: {profile.code || '—'} · {profile.collegeContext || major.collegeOrFaculty || 'سياق عام'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectLevel(profile)}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-[#FAF7F0] px-3 py-1.5 text-xs font-bold text-[#0E7C86] transition"
                    >
                      فتح هذا المستوى
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-[#142B5F] flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-[#0E7C86]" />
              <span>خرائط التصنيف المعياري</span>
            </h2>
            <ReviewedGraphEditor key={major.id} ownerId={major.id} ownerStatus={major.status ?? ''} domain="MAJOR" profiles={profiles} onSaved={loadMajorAndProfiles} />
            <div className="grid gap-3">
              {mappings.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold">لا توجد خرائط تصنيف مخصصة بعد.</p>
              ) : (
                mappings.map((mapping) => (
                  <div key={mapping.id ?? mapping.taxonomyNodeId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <span className="font-bold text-[#142B5F]">{mapping.taxonomyNodeId}</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-slate-600">{mapping.relationshipType}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: Relations and Aliases */}
      {activeTab === 'relations' && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-[#142B5F] flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-[#0E7C86]" />
              <span>الأسماء البديلة والمرادفات</span>
            </h2>
            {aliases.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold">لا توجد أسماء بديلة مسجلة.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {aliases.map((alias) => (
                  <span key={alias.id ?? alias.alias} className="rounded-xl border border-slate-200 bg-[#FAF7F0] px-3 py-1.5 text-xs font-bold text-slate-800">
                    {alias.alias} {alias.locale ? `(${alias.locale})` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-[#142B5F] flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[#0E7C86]" />
              <span>علاقات التكافؤ والتكامل</span>
            </h2>
            {relationships.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold">لا توجد علاقات تكافؤ مسجلة.</p>
            ) : (
              <div className="grid gap-2">
                {relationships.map((rel) => (
                  <div key={rel.id ?? rel.targetMajorId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs flex justify-between">
                    <span>{rel.targetMajorId}</span>
                    <Badge value={rel.relationshipType} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'versions' && <MajorGovernanceWorkspace majorId={major.id} profileId={activeProfile?.id} onSaved={loadMajorAndProfiles}/> }

      {/* Tab 5: Versions and Sources */}
      {activeTab === 'versions' && (
        <section className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-[#142B5F] flex items-center gap-2">
                <Link2 className="h-5 w-5 text-[#0E7C86]" />
                <span>سجل الإصدارات والتاريخ لملف المستوى ({activeProfile?.code || '—'})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تاريخ النسخ المستوردة والمحررة محفوظ بالكامل وغير قابل للتعديل التاريخي.
              </p>
            </div>
            <span className="rounded-xl bg-teal-50 px-3 py-1 text-xs font-bold text-[#0E7C86] border border-teal-200">
              {versions.length} نسخة ضمن الصفحة الأولى
            </span>
          </div>

          {versions.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold">لا توجد نسخ مسجلة لهذا المستوى.</p>
          ) : (
            <div className="space-y-3">
              {versions.map((ver, idx) => (
                <div key={ver.id ?? idx} className="rounded-2xl border border-slate-200 bg-[#FAF7F0]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#142B5F] text-xs font-bold text-white">
                        v{ver.versionNumber || (versions.length - idx)}
                      </span>
                      <span className="text-xs font-black text-slate-900 font-mono">
                        معرف النسخة: {ver.id}
                      </span>
                      {idx === 0 && (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                          أحدث نسخة عمل أو نشر
                        </span>
                      )}
                    </div>
                    {ver.sourceFileName && (
                      <p className="mt-1 text-xs text-slate-500">
                        ملف المصدر: {ver.sourceFileName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {ver.importedAt || ver.createdAt ? new Date(ver.importedAt || ver.createdAt || '').toLocaleDateString('ar-SA') : 'حديثاً'}
                    </span>
                    <Badge value={ver.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Basic Metadata Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#142B5F]">تعديل الحقول الأساسية للتخصص</h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  await adminApiClient.request(`/admin/majors/${major.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({displayName:editFormData.displayName,collegeOrFaculty:editFormData.collegeOrFaculty,academicFieldOrDiscipline:editFormData.academicFieldOrDiscipline,officialSourceUrl:editFormData.officialSourceUrl,description:editFormData.description,studentFriendlySummary:editFormData.studentFriendlySummary,reason:window.prompt('سبب تعديل البيانات') || ''}),
                  });
                  setSuccess('تم تحديث البيانات الأساسية بنجاح.');
                  setShowEditModal(false);
                  await loadMajorAndProfiles();
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : 'تعذر تحديث البيانات الأساسية.');
                } finally {
                  setSaving(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم العربي المعروض</label>
                <input
                  type="text"
                  value={editFormData.displayName}
                  onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الإنجليزي المعياري</label>
                <input
                  type="text"
                  readOnly
                  value={editFormData.canonicalName}
                  onChange={(e) => setEditFormData({ ...editFormData, canonicalName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الكلية أو السياق الأكاديمي</label>
                <input
                  type="text"
                  value={editFormData.collegeOrFaculty}
                  onChange={(e) => setEditFormData({ ...editFormData, collegeOrFaculty: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المجال الأكاديمي</label>
                <input
                  type="text"
                  value={editFormData.academicFieldOrDiscipline}
                  onChange={(e) => setEditFormData({ ...editFormData, academicFieldOrDiscipline: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E7C86] hover:bg-[#142B5F] px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>حفظ البيانات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900">{confirmModal.title}</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-[#FAF7F0] p-4 rounded-2xl border border-slate-100">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type) {
                    executeActionWithFlow(
                      confirmModal.type,
                      confirmModal.type === 'publish'
                        ? 'تم نشر التخصص بنجاح وأصبح متاحاً للطلاب في الصفحة العامة.'
                        : 'تم تنفيذ الإجراء بنجاح.'
                    );
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black text-white bg-[#0E7C86] hover:bg-[#142B5F]"
              >
                <Check className="h-4 w-4" />
                <span>{confirmModal.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
