const fs = require('fs');

const code = `import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, CheckCircle2, AlertCircle, Edit3, X, 
  Save, Eye, ExternalLink, Info, MapPin, Globe, Building2, BookOpen, Clock, Loader2, Send, Check
} from 'lucide-react';

// Demo Record
const DEMO_RECORD = {
  id: 'demo-qu-0001',
  
  // Phase 0 fields
  referenceId: 'INS-QAT-0001',
  nationalCode: '',
  englishName: 'Qatar University',
  localName: 'جامعة قطر',
  country: 'Qatar',
  iso3: 'QAT',
  city: 'Doha',
  institutionType: 'University',
  ownership: 'Public',
  status: 'PUBLISHED',
  officialWebsite: 'https://www.qu.edu.qa/',
  officialSource: 'https://www.edu.gov.qa/',
  
  // Phase 1 fields
  importRefId: 'INS-QAT-0001',
  importOriginalName: 'Qatar University',
  importCountry: 'Qatar',
  importIso3: 'QAT',
  importCity: 'Doha',
  importInstitutionType: 'University',
  importOwnership: 'Public',
  importWebsite: 'https://www.qu.edu.qa/',
  importSource: '',
  
  verifiedEnglishName: 'Qatar University',
  verifiedLocalName: 'جامعة قطر',
  verifiedAbbreviation: 'QU',
  verifiedInstitutionType: 'University',
  verifiedOwnership: 'Public',
  foundedYear: '1973',
  shortDescription: 'Qatar University is the primary institution of higher education in Qatar.',
  
  continent: 'Asia',
  region: 'Doha Municipality',
  verifiedCity: 'Doha',
  mainCampusAddress: 'University Street, Doha, Qatar',
  mapLink: 'https://maps.google.com/?q=Qatar+University',
  
  verifiedWebsite: 'https://www.qu.edu.qa/',
  websiteStatus: 'Active',
  websiteSource: 'Official',
  applicationPortal: 'https://mybanner.qu.edu.qa/',
  governmentRegistry: '',
  governmentEntityName: 'Ministry of Education and Higher Education',
  universitySystem: '',
  centralAdmission: '',
  trustedDirectory: 'https://www.whed.net/',
  externalId: 'QA-001',
  primarySourceType: 'Government',
  primarySourceLink: 'https://www.edu.gov.qa/',
  
  officialPhone: '+974 4403 3333',
  socialMediaLink: 'https://twitter.com/QatarUniversity',
  
  importContinentFile: 'asia_universities.csv',
  importBatch: 'Batch-2023-11',
  importDate: '2023-11-15',
  lastVerificationDate: '2023-12-01',
  phase1CompletionStatus: 'Complete',
  reviewStatus: 'READY_TO_PUBLISH',
  duplicationStatus: 'Clean',
  dataConfidence: 'High',
  reviewNotes: 'Verified against ministry records. All good.',
};

const PHASE_0_FIELDS = [
  { section: 'الهوية', fields: [
    { key: 'referenceId', label: 'معرف الجامعة المرجعي', type: 'text' },
    { key: 'nationalCode', label: 'الرمز الوطني', type: 'text' },
    { key: 'englishName', label: 'الاسم الرسمي بالإنجليزية', type: 'text' },
    { key: 'localName', label: 'الاسم المحلي', type: 'text' },
  ]},
  { section: 'الموقع', fields: [
    { key: 'country', label: 'الدولة', type: 'text' },
    { key: 'iso3', label: 'رمز الدولة ISO3', type: 'text' },
    { key: 'city', label: 'المدينة', type: 'text' },
  ]},
  { section: 'معلومات المؤسسة', fields: [
    { key: 'institutionType', label: 'نوع المؤسسة', type: 'select', options: ['University', 'College', 'Institute', 'Academy', 'Other'] },
    { key: 'ownership', label: 'الملكية', type: 'select', options: ['Public', 'Private', 'Non-profit', 'Other'] },
    { key: 'status', label: 'الحالة', type: 'select', options: ['PUBLISHED', 'ARCHIVED', 'READY_TO_REVIEW', 'READY_TO_PUBLISH'] },
  ]},
  { section: 'الروابط الرسمية', fields: [
    { key: 'officialWebsite', label: 'الموقع الرسمي', type: 'url' },
    { key: 'officialSource', label: 'المصدر الرسمي', type: 'url' },
  ]}
];

const PHASE_1_FIELDS = [
  { section: 'البيانات الأصلية المستوردة', fields: [
    { key: 'importRefId', label: 'معرف الجامعة المرجعي', type: 'text' },
    { key: 'importOriginalName', label: 'الاسم الأصلي المستورد', type: 'text' },
    { key: 'importCountry', label: 'الدولة', type: 'text' },
    { key: 'importIso3', label: 'رمز الدولة ISO3', type: 'text' },
    { key: 'importCity', label: 'المدينة', type: 'text' },
    { key: 'importInstitutionType', label: 'نوع المؤسسة الأصلي', type: 'text' },
    { key: 'importOwnership', label: 'الملكية الأصلية', type: 'text' },
    { key: 'importWebsite', label: 'رابط الموقع الأصلي', type: 'url' },
    { key: 'importSource', label: 'رابط المصدر الأصلي', type: 'url' },
  ]},
  { section: 'الهوية المتحقق منها', fields: [
    { key: 'verifiedEnglishName', label: 'الاسم الرسمي بالإنجليزية', type: 'text' },
    { key: 'verifiedLocalName', label: 'الاسم الرسمي باللغة المحلية', type: 'text' },
    { key: 'verifiedAbbreviation', label: 'الاختصار الرسمي', type: 'text' },
    { key: 'verifiedInstitutionType', label: 'نوع المؤسسة المتحقق منه', type: 'text' },
    { key: 'verifiedOwnership', label: 'الملكية المتحقق منها', type: 'text' },
    { key: 'foundedYear', label: 'سنة التأسيس', type: 'number' },
    { key: 'shortDescription', label: 'الوصف المختصر', type: 'textarea' },
  ]},
  { section: 'الموقع المتحقق منه', fields: [
    { key: 'continent', label: 'القارة', type: 'select', options: ['Asia', 'Africa', 'Europe', 'North America', 'South America', 'Oceania'] },
    { key: 'region', label: 'الولاية أو المنطقة', type: 'text' },
    { key: 'verifiedCity', label: 'المدينة المتحقق منها', type: 'text' },
    { key: 'mainCampusAddress', label: 'عنوان الحرم الرئيسي', type: 'text' },
    { key: 'mapLink', label: 'رابط الخريطة', type: 'url' },
  ]},
  { section: 'الموقع والمصادر الرسمية', fields: [
    { key: 'verifiedWebsite', label: 'رابط الموقع الرسمي', type: 'url' },
    { key: 'websiteStatus', label: 'حالة الموقع الرسمي', type: 'select', options: ['Active', 'Inactive', 'Redirected'] },
    { key: 'websiteSource', label: 'مصدر الموقع الرسمي', type: 'select', options: ['Official', 'Secondary', 'Manual'] },
    { key: 'applicationPortal', label: 'رابط بوابة التقديم الرسمية', type: 'url' },
    { key: 'governmentRegistry', label: 'رابط السجل الحكومي', type: 'url' },
    { key: 'governmentEntityName', label: 'اسم الجهة الحكومية', type: 'text' },
    { key: 'universitySystem', label: 'رابط نظام الجامعة', type: 'url' },
    { key: 'centralAdmission', label: 'رابط بوابة القبول المركزية', type: 'url' },
    { key: 'trustedDirectory', label: 'رابط دليل دولي موثوق', type: 'url' },
    { key: 'externalId', label: 'المعرف الخارجي للمؤسسة', type: 'text' },
    { key: 'primarySourceType', label: 'نوع المصدر الأساسي', type: 'select', options: ['Government', 'University', 'International', 'Other'] },
    { key: 'primarySourceLink', label: 'رابط المصدر الأساسي', type: 'url' },
  ]},
  { section: 'التواصل الرسمي', fields: [
    { key: 'officialPhone', label: 'الهاتف الرسمي', type: 'text' },
    { key: 'socialMediaLink', label: 'رابط وسيلة التواصل الاجتماعي الرسمية الرئيسية', type: 'url' },
  ]},
  { section: 'معلومات الاستيراد والمراجعة', fields: [
    { key: 'importContinentFile', label: 'ملف القارة المستورد', type: 'text' },
    { key: 'importBatch', label: 'دفعة الاستيراد', type: 'text' },
    { key: 'importDate', label: 'تاريخ الاستيراد', type: 'date' },
    { key: 'lastVerificationDate', label: 'تاريخ آخر تحقق', type: 'date' },
    { key: 'phase1CompletionStatus', label: 'حالة اكتمال المرحلة الأولى', type: 'select', options: ['Complete', 'Incomplete'] },
    { key: 'reviewStatus', label: 'حالة المراجعة', type: 'select', options: ['READY_TO_REVIEW', 'READY_TO_PUBLISH', 'PUBLISHED', 'ARCHIVED'] },
    { key: 'duplicationStatus', label: 'حالة فحص التكرار', type: 'select', options: ['Clean', 'Duplicate', 'Possible Duplicate'] },
    { key: 'dataConfidence', label: 'درجة الثقة بالبيانات', type: 'select', options: ['High', 'Medium', 'Low'] },
    { key: 'reviewNotes', label: 'ملاحظات المراجعة', type: 'textarea' },
  ]},
];

export function AdminUniversityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(DEMO_RECORD);
  const [editData, setEditData] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'phase0' | 'phase1'>('phase0');
  const [isEditing, setIsEditing] = useState(false);
  
  // Dialog states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');

  // Fallback if not demo record
  useEffect(() => {
    if (id !== 'demo-qu-0001') {
      // For demo purposes, we will just use the demo record if they somehow navigated here with another ID,
      // but in real app we would fetch. We assume all navigations here are for the demo.
      setData({...DEMO_RECORD, id: id || 'demo-qu-0001'});
    }
  }, [id]);

  const handleEditClick = () => {
    setEditData({ ...data });
    setIsEditing(true);
  };

  const handleCancelEditClick = () => {
    setConfirmTitle('إلغاء التعديلات');
    setConfirmMessage('هل أنت متأكد من إلغاء كافة التعديلات غير المحفوظة؟');
    setConfirmAction(() => () => {
      setIsEditing(false);
      setEditData(null);
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const handleSaveClick = () => {
    setConfirmTitle('حفظ التعديلات');
    setConfirmMessage('هل أنت متأكد من حفظ التعديلات على بيانات هذه الجامعة؟');
    setConfirmAction(() => () => {
      setData({ ...editData });
      setIsEditing(false);
      setEditData(null);
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const handlePublishClick = () => {
    setConfirmTitle('نشر الجامعة');
    setConfirmMessage('هل أنت متأكد من نشر هذه الجامعة لتصبح مرئية في المنصة؟');
    setConfirmAction(() => () => {
      setData({ ...data, status: 'PUBLISHED' });
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const handleUnpublishClick = () => {
    setConfirmTitle('إلغاء النشر');
    setConfirmMessage('هل أنت متأكد من إلغاء نشر هذه الجامعة؟ سيتم إخفاؤها من المنصة العامة.');
    setConfirmAction(() => () => {
      setData({ ...data, status: 'ARCHIVED' });
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const handleReviewClick = () => {
    setConfirmTitle('إرسال للمراجعة');
    setConfirmMessage('هل أنت متأكد من إرسال هذه الجامعة للمراجعة؟');
    setConfirmAction(() => () => {
      setData({ ...data, reviewStatus: 'READY_TO_REVIEW' });
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const handleApproveClick = () => {
    setConfirmTitle('اعتماد');
    setConfirmMessage('هل أنت متأكد من اعتماد هذه الجامعة؟ ستكون جاهزة للنشر.');
    setConfirmAction(() => () => {
      setData({ ...data, reviewStatus: 'READY_TO_PUBLISH' });
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const calculateCompletion = (sections: any[]) => {
    let total = 0;
    let completed = 0;
    sections.forEach(sec => {
      sec.fields.forEach((f: any) => {
        total++;
        if (data[f.key] && data[f.key].toString().trim() !== '') {
          completed++;
        }
      });
    });
    return {
      completed,
      total,
      missing: total - completed,
      status: completed === total ? 'مكتملة' : completed > 0 ? 'تحتاج مراجعة' : 'غير مكتملة'
    };
  };

  const phase0Stats = calculateCompletion(PHASE_0_FIELDS);
  const phase1Stats = calculateCompletion(PHASE_1_FIELDS);

  const getStatusColor = (status: string) => {
    if (status === 'مكتملة') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'تحتاج مراجعة') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const renderField = (field: any, val: any, onChange: (val: any) => void) => {
    if (!isEditing) {
      return (
        <div className="flex flex-col h-full justify-center min-h-[42px]">
          {val ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-900 text-sm font-medium break-all">{val}</span>
              {field.type === 'url' && (
                <a href={val} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 shrink-0" title="فتح الرابط">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-sm italic">غير متوفر</span>
          )}
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={val || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900 bg-white"
        >
          <option value="">اختيار...</option>
          {field.options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={val || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900"
        />
      );
    }

    return (
      <input
        type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={val || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900"
      />
    );
  };

  const renderSections = (sections: any[]) => {
    return sections.map((sec, i) => (
      <div key={i} className="mb-8 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm">{sec.section}</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            {sec.fields.map((field: any) => {
              const val = isEditing ? editData[field.key] : data[field.key];
              return (
                <div key={field.key} className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1.5">{field.label}</label>
                  {renderField(field, val, (newVal) => setEditData({...editData, [field.key]: newVal}))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ));
  };

  const currentStats = activeTab === 'phase0' ? phase0Stats : phase1Stats;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f8fa] text-slate-900 font-sans pb-20">
      
      {/* Header Sticky Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-start gap-4">
              <button 
                onClick={() => navigate('/admin/universities')}
                className="mt-1 p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                title="العودة إلى الجامعات"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-black text-slate-900">{data.englishName}</h1>
                  <span className="text-sm font-bold text-slate-500 border-r border-slate-300 pr-3">{data.localName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5"/> {data.referenceId}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {data.country}، {data.city}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5"/> {data.status === 'PUBLISHED' ? 'منشورة' : 'غير منشورة'}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="flex items-center gap-1 text-blue-600"><Info className="w-3.5 h-3.5"/> {data.reviewStatus === 'READY_TO_PUBLISH' ? 'جاهزة للاعتماد' : 'بانتظار المراجعة'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isEditing ? (
                <>
                  <button onClick={handleReviewClick} className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200">
                    إرسال للمراجعة
                  </button>
                  <button onClick={handleApproveClick} className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200">
                    اعتماد
                  </button>
                  {data.status === 'PUBLISHED' ? (
                    <button onClick={handleUnpublishClick} className="px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors border border-amber-200">
                      إلغاء النشر
                    </button>
                  ) : (
                    <button onClick={handlePublishClick} className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200">
                      نشر
                    </button>
                  )}
                  <button onClick={handleEditClick} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#0F4B3A] hover:bg-[#0a3327] rounded-md transition-colors shadow-sm">
                    <Edit3 className="w-4 h-4" />
                    تعديل
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleCancelEditClick} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors">
                    <X className="w-4 h-4" />
                    إلغاء
                  </button>
                  <button onClick={handleSaveClick} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm">
                    <Save className="w-4 h-4" />
                    حفظ التعديلات
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('phase0')}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'phase0' ? 'border-[#0F4B3A] text-[#0F4B3A]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="font-bold text-sm">الاستيراد الأساسي</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getStatusColor(phase0Stats.status)}`}>
              {phase0Stats.status}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('phase1')}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'phase1' ? 'border-[#0F4B3A] text-[#0F4B3A]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="font-bold text-sm">المرحلة الأولى</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getStatusColor(phase1Stats.status)}`}>
              {phase1Stats.status}
            </span>
          </button>
        </div>

        {/* Completion Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {activeTab === 'phase0' ? 'الاستيراد الأساسي' : 'المرحلة الأولى: الهوية والموقع والمصادر الرسمية'}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {currentStats.completed} من {currentStats.total} حقلاً مكتملة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-emerald-600">{currentStats.completed} مكتمل</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-rose-600">{currentStats.missing} ناقص</span>
          </div>
        </div>

        {/* Fields Sections */}
        <div className="space-y-6">
          {activeTab === 'phase0' ? renderSections(PHASE_0_FIELDS) : renderSections(PHASE_1_FIELDS)}
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmTitle}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">{confirmMessage}</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => confirmAction && confirmAction()}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#0F4B3A] hover:bg-[#0a3327] rounded-lg transition-colors shadow-sm"
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
`

fs.writeFileSync('/app/applet/apps/web/src/features/admin-preview/AdminUniversityDetailPage.tsx', code, 'utf8');
