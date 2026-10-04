import React, { useEffect, useState } from 'react';
import {
  FileText,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Search,
  Hash,
  Database,
  Layers,
  Code2,
  Eye,
  Info
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { SafeMarkdownView } from './SafeMarkdownView';

interface ContentBlock {
  id?: string;
  versionId?: string;
  blockKey: string;
  blockType: string;
  title?: string;
  locale?: string;
  content: string;
  sourceSectionPath?: string;
  reviewStatus?: 'NEEDS_REVIEW' | 'MAPPED' | 'IGNORED' | 'APPROVED';
  metadata?: Record<string, unknown>;
}

interface ImportVersion {
  id: string;
  testId: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED' | 'ARCHIVED';
  sourceFileName?: string;
  sourceLocale?: string;
  sourceUri?: string;
  sourceHash?: string;
  importedAt?: string;
  contentBlocks?: ContentBlock[];
  rawContentBlocks?: Array<Record<string, unknown>>;
  metadata?: {
    detectedSections?: Array<{ sectionNumber?: number; title?: string; blockKey?: string }>;
    unmappedSections?: string[];
    sourceCycle?: string;
    sourceKey?: string;
    sourceClassification?: string;
    reviewReason?: string;
    evidenceReference?: string;
    [key: string]: unknown;
  };
}

interface Props {
  testId: string;
  isRtl?: boolean;
  onNamesReviewed?: () => void;
}

export const InternationalTestSourceSectionsViewer: React.FC<Props> = ({ testId, isRtl = true, onNamesReviewed }) => {
  const [versions, setVersions] = useState<ImportVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showRawSourceModal, setShowRawSourceModal] = useState(false);
  const [showReviewNamesModal, setShowReviewNamesModal] = useState(false);
  const [reviewNameAr, setReviewNameAr] = useState('');
  const [reviewNameEn, setReviewNameEn] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewEvidence, setReviewEvidence] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApiClient.getInternationalTestImportVersions<ImportVersion[]>(testId);
      const list = Array.isArray(data) ? data : [];
      setVersions(list);
      if (list.length > 0) {
        setSelectedVersionId(list[0].id);
        // Expand first 3 sections by default
        const initialExpanded: Record<string, boolean> = {};
        const blocks = list[0].contentBlocks || [];
        blocks.slice(0, 3).forEach((b) => {
          initialExpanded[b.blockKey] = true;
        });
        setExpandedSections(initialExpanded);
      }
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر تحميل أقسام ملف المصدر المستورد' : 'Failed to load source import versions.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testId) {
      fetchVersions();
    }
  }, [testId]);

  const activeVersion = versions.find((v) => v.id === selectedVersionId) || versions[0] || null;

  // Separate raw source from unmapped numbered sections
  const allBlocks = activeVersion?.contentBlocks || [];
  const rawSourceBlock = allBlocks.find((b) => b.blockType === 'RAW_SOURCE' || b.blockKey === 'source.raw');
  const sectionBlocks = allBlocks
    .filter((b) => b.blockType === 'UNMAPPED_SOURCE_SECTION' || (b.blockKey !== 'source.raw' && b.blockType !== 'RAW_SOURCE'))
    .sort((a, b) => {
      // Extract section numbers if available
      const numA = extractSectionNumber(a.blockKey, a.title);
      const numB = extractSectionNumber(b.blockKey, b.title);
      return numA - numB;
    });

  const filteredSections = sectionBlocks.filter((section) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (section.title && section.title.toLowerCase().includes(q)) ||
      section.blockKey.toLowerCase().includes(q) ||
      section.content.toLowerCase().includes(q)
    );
  });

  const toggleSection = (blockKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [blockKey]: !prev[blockKey]
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    sectionBlocks.forEach((b) => {
      all[b.blockKey] = true;
    });
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
        <span className="text-sm font-medium text-gray-600">
          {isRtl ? 'جارٍ جلب أقسام ملف المصدر والنسخ المستوردة...' : 'Loading source import sections...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-rose-600" />
        <div className="space-y-2">
          <h4 className="font-bold text-sm">{isRtl ? 'خطأ في جلب بيانات المصدر' : 'Failed to retrieve source versions'}</h4>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchVersions}
            className="px-3 py-1.5 bg-rose-700 text-white text-xs font-semibold rounded-lg hover:bg-rose-800 transition-colors"
          >
            {isRtl ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="p-10 text-center bg-gray-50 border border-gray-200 rounded-xl space-y-3">
        <Layers className="w-12 h-12 text-gray-400 mx-auto" />
        <h4 className="text-base font-bold text-gray-800">
          {isRtl ? 'لا توجد نسخ استيراد مسجلة لهذا الاختبار حتى الآن' : 'No import versions registered for this test yet'}
        </h4>
        <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
          {isRtl
            ? 'تظهر هنا أقسام ملفات المصدر (كالـ Markdown المعتمد) تلقائياً عند إنشاء مسودة استيراد أو تطبيق حزمة استيراد المراجع.'
            : 'Source file sections (such as unified Markdown drafts) will appear here once an import draft is created.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner & Version Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  {isRtl ? 'أقسام ملف المصدر الأصلي المستورد' : 'Imported Source File Sections'}
                </h3>
                <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {sectionBlocks.length} {isRtl ? 'قسماً مرقماً' : 'sections'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {isRtl
                  ? 'عرض ديناميكي لكامل أقسام المصدر بالترتيب مع الجداول والملاحظات وحالة المراجعة'
                  : 'Dynamic view of all source sections with full tables, notes, and review status'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Versions dropdown */}
            {versions.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600">
                  {isRtl ? 'النسخة:' : 'Version:'}
                </label>
                <select
                  value={selectedVersionId || ''}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {isRtl ? `النسخة ${v.versionNumber}` : `Version ${v.versionNumber}`} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeVersion && (
              <button
                type="button"
                onClick={() => {
                  setReviewNameAr('');
                  setReviewNameEn('');
                  setReviewReason(isRtl ? 'اعتماد الأسماء الرسمية من وثيقة المصدر المعتمدة' : 'Confirmed official names from source document');
                  setReviewEvidence(activeVersion.sourceFileName || '');
                  setReviewError(null);
                  setReviewSuccess(null);
                  setShowReviewNamesModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isRtl ? 'مراجعة أسماء المصدر' : 'Review Source Names'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Version Metadata Summary Card */}
        {activeVersion && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-500 block">{isRtl ? 'ملف المصدر' : 'Source File'}</span>
              <span className="font-semibold text-gray-800 font-mono mt-0.5 block truncate" title={activeVersion.sourceFileName || 'N/A'}>
                {activeVersion.sourceFileName || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">{isRtl ? 'حالة النسخة' : 'Version Status'}</span>
              <div className="mt-0.5">
                <StatusBadge status={activeVersion.status} isRtl={isRtl} />
              </div>
            </div>
            <div>
              <span className="text-gray-500 block">{isRtl ? 'بصمة المصدر (Source Hash)' : 'Source Hash'}</span>
              <span className="font-mono text-gray-700 mt-0.5 block truncate text-[11px]" title={activeVersion.sourceHash || 'N/A'}>
                {activeVersion.sourceHash ? `${activeVersion.sourceHash.slice(0, 16)}...` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">{isRtl ? 'تاريخ الاستيراد' : 'Imported At'}</span>
              <span className="text-gray-700 mt-0.5 block font-medium">
                {activeVersion.importedAt ? new Date(activeVersion.importedAt).toLocaleString(isRtl ? 'ar' : 'en') : 'N/A'}
              </span>
            </div>
          </div>
        )}

        {/* Boundary Notice: source.raw is full backup, not counted as extra section */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">
              {isRtl
                ? 'فصل أقسام المحتوى عن الهيكل الإجرائي للامتحان:'
                : 'Content Sections vs Exam Operational Structure:'}
            </p>
            <p className="leading-relaxed text-blue-800">
              {isRtl
                ? 'هذه الأقسام الـ ' +
                  sectionBlocks.length +
                  ' تمثل النص الكامل لمادة المصدر المرقمة وتخضع للمراجعة. كتلة النسخة الخام الكاملة (source.raw) محفوظة كنسخة مطابقة للمصدر ولا تُحسب كقسم إضافي. أقسام الاختبار الإجرائية والمهارات والدرجات تدار بشكل منفصل في تبويباتها المخصصة.'
                : 'These ' +
                  sectionBlocks.length +
                  ' sections represent the full numbered source content subject to editorial review. The full raw source block is preserved independently without being counted as an extra section.'}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Bulk Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isRtl ? 'بحث في العناوين أو نصوص الأقسام...' : 'Search section titles or content...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isRtl ? 'توسيع الكل' : 'Expand All'}
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isRtl ? 'طي الكل' : 'Collapse All'}
          </button>
          {rawSourceBlock && (
            <button
              onClick={() => setShowRawSourceModal(!showRawSourceModal)}
              className="text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              {isRtl ? 'معاينة المصدر الخام' : 'View Raw Source'}
            </button>
          )}
        </div>
      </div>

      {/* Raw Source Full Preview Modal / Box if toggled */}
      {showRawSourceModal && rawSourceBlock && (
        <div className="bg-gray-900 text-gray-100 p-5 rounded-xl border border-gray-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-mono font-bold text-teal-300">source.raw (Full Unaltered Source)</span>
            </div>
            <button
              onClick={() => setShowRawSourceModal(false)}
              className="text-xs text-gray-400 hover:text-white"
            >
              ✕ {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
          <pre className="max-h-96 overflow-y-auto font-mono text-xs leading-relaxed text-gray-200 p-3 bg-black/40 rounded-lg">
            {rawSourceBlock.content}
          </pre>
        </div>
      )}

      {/* Ordered Sections List */}
      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <div className="p-8 bg-white border border-gray-200 rounded-xl text-center text-sm text-gray-500">
            {isRtl ? 'لا توجد أقسام تطابق البحث الحالي.' : 'No sections match the current query.'}
          </div>
        ) : (
          filteredSections.map((section, idx) => {
            const isExpanded = !!expandedSections[section.blockKey];
            const sectionNum = extractSectionNumber(section.blockKey, section.title, idx + 1);

            return (
              <div
                key={section.blockKey || idx}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:border-gray-300"
              >
                {/* Section Header */}
                <div
                  onClick={() => toggleSection(section.blockKey)}
                  className="p-4 bg-white hover:bg-gray-50/80 cursor-pointer flex items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center gap-3 flex-wrap flex-1">
                    <span className="w-7 h-7 rounded-lg bg-teal-700 text-white text-xs font-bold font-mono flex items-center justify-center shadow-xs">
                      {sectionNum}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">
                      {section.title || section.blockKey}
                    </h4>
                    <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
                      {section.blockKey}
                    </span>
                    <ReviewBadge status={section.reviewStatus || 'NEEDS_REVIEW'} isRtl={isRtl} />
                  </div>

                  <div className="flex items-center gap-3 text-gray-400">
                    <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                      {section.content.length} {isRtl ? 'حرف' : 'chars'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </div>
                </div>

                {/* Section Content Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-gray-100 bg-white">
                    <SafeMarkdownView content={section.content} className="prose prose-sm max-w-none text-gray-800" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Review Source Names Modal */}
      {showReviewNamesModal && activeVersion && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-100" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-gray-900">
                  {isRtl ? 'مراجعة واعتماد أسماء الاختبار من المصدر' : 'Review & Confirm Test Names from Source'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewNamesModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
              <div>
                <span className="text-gray-500">{isRtl ? 'النسخة المعتمدة: ' : 'Target Version: '}</span>
                <span className="font-semibold text-gray-800 font-mono">
                  {isRtl ? `النسخة ${activeVersion.versionNumber}` : `Version ${activeVersion.versionNumber}`} ({activeVersion.id})
                </span>
              </div>
              <div>
                <span className="text-gray-500">{isRtl ? 'بصمة المصدر: ' : 'Source Hash: '}</span>
                <span className="font-mono text-gray-700 text-[11px] truncate block" title={activeVersion.sourceHash}>
                  {activeVersion.sourceHash || 'N/A'}
                </span>
              </div>
            </div>

            {reviewError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {reviewSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reviewNameAr.trim() || !reviewNameEn.trim()) {
                  setReviewError(isRtl ? 'الاسمان العربي والإنجليزي مطلوبان' : 'Both Arabic and English names are required');
                  return;
                }
                if (!reviewReason.trim() || !reviewEvidence.trim()) {
                  setReviewError(isRtl ? 'سبب المراجعة ومرجع الدليل مطلوبان' : 'Review reason and evidence reference are required');
                  return;
                }
                setReviewSubmitting(true);
                setReviewError(null);
                setReviewSuccess(null);
                try {
                  await adminApiClient.reviewInternationalTestSourceNames(testId, {
                    versionId: activeVersion.id,
                    sourceHash: activeVersion.sourceHash,
                    localizedNameAr: reviewNameAr.trim(),
                    localizedNameEn: reviewNameEn.trim(),
                    reviewReason: reviewReason.trim(),
                    evidenceReference: reviewEvidence.trim(),
                  });
                  setReviewSuccess(isRtl ? 'تم حفظ واعتماد أسماء الاختبار بنجاح' : 'Test source names confirmed and saved successfully');
                  onNamesReviewed?.();
                  setTimeout(() => {
                    setShowReviewNamesModal(false);
                  }, 1200);
                } catch (err: any) {
                  setReviewError(err.message || (isRtl ? 'فشل حفظ الأسماء المعتمدة' : 'Failed to save reviewed names'));
                } finally {
                  setReviewSubmitting(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {isRtl ? 'الاسم العربي المعتمد من المصدر (localizedNameAr):' : 'Arabic Localized Name (localizedNameAr):'}
                </label>
                <input
                  type="text"
                  required
                  value={reviewNameAr}
                  onChange={(e) => setReviewNameAr(e.target.value)}
                  placeholder={isRtl ? 'مثال: اختبار الآيلتس الدولي للغة الإنجليزية' : 'e.g. Arabic localized name'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {isRtl ? 'الاسم الإنجليزي المعتمد من المصدر (localizedNameEn):' : 'English Localized Name (localizedNameEn):'}
                </label>
                <input
                  type="text"
                  required
                  value={reviewNameEn}
                  onChange={(e) => setReviewNameEn(e.target.value)}
                  placeholder={isRtl ? 'مثال: IELTS' : 'e.g. IELTS'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {isRtl ? 'سبب المراجعة (Review Reason):' : 'Review Reason:'}
                </label>
                <input
                  type="text"
                  required
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {isRtl ? 'مرجع الدليل المصدري (Evidence Reference):' : 'Evidence Reference:'}
                </label>
                <input
                  type="text"
                  required
                  value={reviewEvidence}
                  onChange={(e) => setReviewEvidence(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReviewNamesModal(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-sm"
                >
                  {reviewSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isRtl ? 'اعتماد الأسماء وحفظها' : 'Save Reviewed Names'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function extractSectionNumber(blockKey: string, title?: string, fallbackIndex = 1): number {
  if (title) {
    const match = /^##?\s*(\d+)[\.\-ـ]/.exec(title.trim());
    if (match) return parseInt(match[1], 10);
    const matchAlt = /^(\d+)[\.\-ـ]/.exec(title.trim());
    if (matchAlt) return parseInt(matchAlt[1], 10);
  }
  const keyMatch = /sec-(\d+)/.exec(blockKey);
  if (keyMatch) return parseInt(keyMatch[1], 10);
  const unmappedMatch = /unmapped\.(\d+)/.exec(blockKey);
  if (unmappedMatch) return parseInt(unmappedMatch[1], 10);
  return fallbackIndex;
}

function StatusBadge({ status, isRtl }: { status: string; isRtl: boolean }) {
  switch (status) {
    case 'PUBLISHED':
      return <span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-[11px]">{isRtl ? 'منشور' : 'PUBLISHED'}</span>;
    case 'DRAFT':
      return <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]">{isRtl ? 'مسودة استيراد' : 'DRAFT'}</span>;
    case 'SUPERSEDED':
      return <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded text-[11px]">{isRtl ? 'مستبدل' : 'SUPERSEDED'}</span>;
    case 'ARCHIVED':
      return <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[11px]">{isRtl ? 'مؤرشف' : 'ARCHIVED'}</span>;
    default:
      return <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded text-[11px]">{status}</span>;
  }
}

function ReviewBadge({ status, isRtl }: { status: string; isRtl: boolean }) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {isRtl ? 'معتمد' : 'APPROVED'}
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold">
          <Clock className="w-3 h-3 text-amber-600" />
          {isRtl ? 'بانتظار المراجعة' : 'NEEDS_REVIEW'}
        </span>
      );
    case 'MAPPED':
      return (
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-semibold">
          <Database className="w-3 h-3 text-blue-600" />
          {isRtl ? 'تمت المطابقة' : 'MAPPED'}
        </span>
      );
    case 'IGNORED':
      return (
        <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-semibold">
          {isRtl ? 'مستبعد' : 'IGNORED'}
        </span>
      );
    default:
      return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px]">{status}</span>;
  }
}
