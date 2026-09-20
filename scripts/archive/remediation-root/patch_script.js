const fs = require('fs');

let content = fs.readFileSync('temp.tsx', 'utf-8');

// Add DEMO_RECORD updates
content = content.replace(
  "reviewNotes: 'Verified against ministry records. All good.',",
  `reviewNotes: 'Verified against ministry records. All good.',
  
  // Phase 3 fields
  availableDegrees: [],
  colleges: [],
  instructionLanguages: [],
  studyModes: [],
  officialProgramsDirectory: '',
  importantMajors: [],
  
  acceptsInternationalStudents: null,
  bachelorAdmissionsUrl: '',
  graduateAdmissionsUrl: '',
  internationalAdmissionsUrl: '',
  officialApplicationPortalUrl: '',
  
  hasLanguageRequirements: null,
  requiredLanguages: [],
  acceptedLanguageTests: [],
  languageRequirementsUrl: '',
  
  hasInternationalScholarships: null,
  internationalScholarships: [],`
);

// Add PHASE_3_SECTIONS
const phase3SectionsCode = `
const PHASE_3_SECTIONS = [
  { section: 'التعريف', fields: [
    { key: 'referenceId', label: 'معرف الجامعة المرجعي', type: 'readonly-text' },
  ]},
  { section: 'الدراسة والبرامج', fields: [
    { key: 'availableDegrees', label: 'الدرجات المتاحة', type: 'tags' },
    { key: 'colleges', label: 'الكليات', type: 'tags' },
    { key: 'instructionLanguages', label: 'لغات التدريس', type: 'tags' },
    { key: 'studyModes', label: 'أنماط الدراسة', type: 'tags' },
    { key: 'officialProgramsDirectory', label: 'رابط دليل البرامج الرسمي', type: 'url' },
    { key: 'importantMajors', label: 'أهم التخصصات', type: 'tags', max: 8 },
  ]},
  { section: 'القبول', fields: [
    { key: 'acceptsInternationalStudents', label: 'هل تقبل طلاباً دوليين؟', type: 'yes-no' },
    { key: 'bachelorAdmissionsUrl', label: 'رابط قبول البكالوريوس', type: 'url' },
    { key: 'graduateAdmissionsUrl', label: 'رابط قبول الدراسات العليا', type: 'url' },
    { key: 'internationalAdmissionsUrl', label: 'رابط قبول الطلاب الدوليين', type: 'url', dependsOn: { key: 'acceptsInternationalStudents', value: true } },
    { key: 'officialApplicationPortalUrl', label: 'رابط بوابة التقديم الرسمية', type: 'url' },
  ]},
  { section: 'متطلبات اللغة', fields: [
    { key: 'hasLanguageRequirements', label: 'هل توجد متطلبات لغة؟', type: 'yes-no' },
    { key: 'requiredLanguages', label: 'اللغات المطلوبة', type: 'tags', dependsOn: { key: 'hasLanguageRequirements', value: true } },
    { key: 'acceptedLanguageTests', label: 'اختبارات اللغة المقبولة', type: 'tags', dependsOn: { key: 'hasLanguageRequirements', value: true } },
    { key: 'languageRequirementsUrl', label: 'رابط متطلبات اللغة الرسمي', type: 'url', dependsOn: { key: 'hasLanguageRequirements', value: true } },
  ]},
  { section: 'منح الطلاب الدوليين', fields: [
    { key: 'hasInternationalScholarships', label: 'هل توجد منح للطلاب الدوليين؟', type: 'yes-no' },
    { key: 'internationalScholarships', label: 'تفاصيل أهم المنح للطلاب الدوليين', type: 'scholarships', dependsOn: { key: 'hasInternationalScholarships', value: true } },
  ]}
];
`;

content = content.replace("export function AdminUniversityDetailPage() {", phase3SectionsCode + "\n\nexport function AdminUniversityDetailPage() {");

// Add subcomponents
const subcomponentsCode = `
const TagInput = ({ value = [], onChange, max = Infinity, disabled = false }: any) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && value.length < max && !value.includes(val)) {
        onChange([...(value || []), val]);
        setInputValue('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag: string) => tag !== tagToRemove));
  };

  return (
    <div className={\`flex flex-col gap-2 \${disabled ? 'opacity-50 pointer-events-none' : ''}\`}>
      <div className="flex flex-wrap gap-2">
        {value?.map((tag: string) => (
          <span key={tag} className="flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded-md text-sm">
            {tag}
            <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      {value?.length < max && (
        <input 
          type="text" 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          onKeyDown={handleKeyDown}
          placeholder={value?.length === 0 ? "اضغط Enter لإضافة عنصر" : "أضف المزيد..."}
          className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900"
        />
      )}
    </div>
  );
};

const YesNoControl = ({ value, onChange, disabled = false }: any) => {
  return (
    <div className={\`flex items-center gap-2 \${disabled ? 'opacity-50 pointer-events-none' : ''}\`}>
      <button
        onClick={() => onChange(true)}
        className={\`px-4 py-1.5 text-sm font-bold rounded-md transition-colors border \${value === true ? 'bg-[#0F4B3A] text-white border-[#0F4B3A]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}\`}
      >
        نعم
      </button>
      <button
        onClick={() => onChange(false)}
        className={\`px-4 py-1.5 text-sm font-bold rounded-md transition-colors border \${value === false ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}\`}
      >
        لا
      </button>
    </div>
  );
};

const ScholarshipsInput = ({ value = [], onChange, disabled = false }: any) => {
  const addScholarship = () => {
    onChange([...value, { name: '', url: '' }]);
  };
  
  const updateScholarship = (index: number, key: string, val: string) => {
    const newScholarships = [...value];
    newScholarships[index][key] = val;
    onChange(newScholarships);
  };
  
  const removeScholarship = (index: number) => {
    const newScholarships = [...value];
    newScholarships.splice(index, 1);
    onChange(newScholarships);
  };
  
  return (
    <div className={\`flex flex-col gap-3 \${disabled ? 'opacity-50 pointer-events-none' : ''}\`}>
      {value.map((sch: any, idx: number) => (
        <div key={idx} className="flex flex-col md:flex-row gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
          <input 
            type="text" 
            placeholder="اسم المنحة أو نوعها" 
            value={sch.name} 
            onChange={(e) => updateScholarship(idx, 'name', e.target.value)}
            className="w-full md:w-1/2 p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900"
          />
          <input 
            type="url" 
            placeholder="رابط المنحة الرسمي" 
            value={sch.url} 
            onChange={(e) => updateScholarship(idx, 'url', e.target.value)}
            className="w-full md:w-1/2 p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900"
          />
          <button onClick={() => removeScholarship(idx)} className="mt-2 md:mt-2 text-rose-500 hover:text-rose-700 shrink-0 self-end md:self-auto p-1 bg-white border border-rose-200 rounded-md transition-colors shadow-sm">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button onClick={addScholarship} className="self-start text-sm font-bold text-[#0F4B3A] hover:text-[#0a3327] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm transition-colors">
        + إضافة منحة
      </button>
    </div>
  );
};
`;

content = content.replace("export function AdminUniversityDetailPage() {", subcomponentsCode + "\n\nexport function AdminUniversityDetailPage() {");

// Change activeTab state
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'phase0' | 'phase1'>('phase0');",
  "const [activeTab, setActiveTab] = useState<'phase0' | 'phase1' | 'phase3'>('phase0');"
);

// calculateCompletion
const phase3CalcCode = `
  const calculatePhase3Completion = () => {
    let total = 18;
    let completed = 0;
    
    // 1
    if (data.referenceId) completed++;
    
    // 2-7
    if (data.availableDegrees?.length > 0) completed++;
    if (data.colleges?.length > 0) completed++;
    if (data.instructionLanguages?.length > 0) completed++;
    if (data.studyModes?.length > 0) completed++;
    if (data.officialProgramsDirectory) completed++;
    if (data.importantMajors?.length > 0) completed++;
    
    // 8
    if (data.acceptsInternationalStudents === true || data.acceptsInternationalStudents === false) completed++;
    
    // 9-12
    if (data.bachelorAdmissionsUrl) completed++;
    if (data.graduateAdmissionsUrl) completed++;
    if (data.officialApplicationPortalUrl) completed++;
    
    if (data.acceptsInternationalStudents === false) {
      completed++; 
    } else {
      if (data.internationalAdmissionsUrl) completed++;
    }
    
    // 13
    if (data.hasLanguageRequirements === true || data.hasLanguageRequirements === false) completed++;
    
    // 14-16
    if (data.hasLanguageRequirements === false) {
      completed += 3;
    } else {
      if (data.requiredLanguages?.length > 0) completed++;
      if (data.acceptedLanguageTests?.length > 0) completed++;
      if (data.languageRequirementsUrl) completed++;
    }
    
    // 17
    if (data.hasInternationalScholarships === true || data.hasInternationalScholarships === false) completed++;
    
    // 18
    if (data.hasInternationalScholarships === false) {
      completed++;
    } else {
      if (data.internationalScholarships?.length > 0 && data.internationalScholarships.some((s: any) => s.name || s.url)) completed++;
    }

    return {
      completed,
      total,
      missing: total - completed,
      status: completed === total ? 'مكتملة' : completed > 0 ? 'تحتاج مراجعة' : 'غير مكتملة'
    };
  };

  const phase0Stats = calculateCompletion(PHASE_0_FIELDS);
  const phase1Stats = calculateCompletion(PHASE_1_FIELDS);
  const phase3Stats = calculatePhase3Completion();
`;

content = content.replace(
  /const phase0Stats = calculateCompletion\(PHASE_0_FIELDS\);\s*const phase1Stats = calculateCompletion\(PHASE_1_FIELDS\);/,
  phase3CalcCode
);

const renderFieldStart = `  const renderField = (field: any, val: any, onChange: (val: any) => void) => {
    const isDependsDisabled = field.dependsOn && data[field.dependsOn.key] !== field.dependsOn.value;
    
    if (!isEditing) {
      if (isDependsDisabled) return <span className="text-slate-400 text-sm italic">غير منطبق</span>;
      
      if (field.type === 'yes-no') {
        if (val === true) return <span className="text-slate-900 text-sm font-medium">نعم</span>;
        if (val === false) return <span className="text-slate-900 text-sm font-medium">لا</span>;
        return <span className="text-slate-400 text-sm italic">غير متوفر</span>;
      }
      
      if (field.type === 'tags') {
        if (!val || val.length === 0) return <span className="text-slate-400 text-sm italic">غير متوفر</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {val.map((tag: string) => (
              <span key={tag} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-xs font-bold">
                {tag}
              </span>
            ))}
          </div>
        );
      }
      
      if (field.type === 'scholarships') {
        if (!val || val.length === 0 || (val.length === 1 && !val[0].name && !val[0].url)) {
          if (data.hasInternationalScholarships === false) {
             return <span className="text-slate-400 text-sm italic">لا توجد منح للطلاب الدوليين</span>;
          }
          return <span className="text-slate-400 text-sm italic">غير متوفر</span>;
        }
        return (
          <div className="flex flex-col gap-2">
            {val.map((sch: any, idx: number) => (
              sch.name || sch.url ? (
                <div key={idx} className="flex flex-col bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  {sch.name && <span className="text-sm font-bold text-slate-800 mb-1">{sch.name}</span>}
                  {sch.url && (
                    <a href={sch.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {sch.url}
                    </a>
                  )}
                </div>
              ) : null
            ))}
          </div>
        );
      }

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

    if (field.type === 'readonly-text') {
      return (
        <div className="w-full p-2 border border-slate-200 bg-slate-50 rounded-md text-sm text-slate-500 font-medium">
          {val || 'غير متوفر'}
        </div>
      );
    }
    
    if (field.type === 'yes-no') {
      return <YesNoControl value={val} onChange={onChange} disabled={isDependsDisabled} />;
    }
    
    if (field.type === 'tags') {
      return <TagInput value={val} onChange={onChange} max={field.max} disabled={isDependsDisabled} />;
    }
    
    if (field.type === 'scholarships') {
      return <ScholarshipsInput value={val} onChange={onChange} disabled={isDependsDisabled} />;
    }

    if (field.type === 'select') {
      return (
        <select
          value={val || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDependsDisabled}
          className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-400"
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
          disabled={isDependsDisabled}
          rows={3}
          className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
        />
      );
    }

    return (
      <input
        type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={val || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDependsDisabled}
        className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
      />
    );`;

// Regex replacement for renderField
content = content.replace(/const renderField = [\s\S]*?className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-\[#0F4B3A\] focus:border-\[#0F4B3A\] focus:outline-none text-sm text-slate-900"\s*\/>\s*\);\s*};/m, renderFieldStart);

// currentStats
content = content.replace(
  "const currentStats = activeTab === 'phase0' ? phase0Stats : phase1Stats;",
  "const currentStats = activeTab === 'phase0' ? phase0Stats : activeTab === 'phase1' ? phase1Stats : phase3Stats;"
);

// tabs UI
const tabCode = `          <button
            onClick={() => setActiveTab('phase3')}
            className={\`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors \${
              activeTab === 'phase3' ? 'border-[#0F4B3A] text-[#0F4B3A]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }\`}
          >
            <span className="font-bold text-sm">المرحلة الثالثة: الدراسة والقبول واللغة والمنح</span>
            <span className={\`text-[10px] px-1.5 py-0.5 rounded font-bold border \${getStatusColor(phase3Stats.status)}\`}>
              {phase3Stats.status}
            </span>
          </button>
        </div>`;

content = content.replace("</div>\n\n        {/* Completion Summary */}", tabCode + "\n\n        {/* Completion Summary */}");

// Summary title
content = content.replace(
  "{activeTab === 'phase0' ? 'الاستيراد الأساسي' : 'المرحلة الأولى: الهوية والموقع والمصادر الرسمية'}",
  "{activeTab === 'phase0' ? 'الاستيراد الأساسي' : activeTab === 'phase1' ? 'المرحلة الأولى: الهوية والموقع والمصادر الرسمية' : 'المرحلة الثالثة: الدراسة والقبول واللغة والمنح'}"
);

// Render Sections
content = content.replace(
  "{activeTab === 'phase0' ? renderSections(PHASE_0_FIELDS) : renderSections(PHASE_1_FIELDS)}",
  "{activeTab === 'phase0' ? renderSections(PHASE_0_FIELDS) : activeTab === 'phase1' ? renderSections(PHASE_1_FIELDS) : renderSections(PHASE_3_SECTIONS)}"
);

fs.writeFileSync('temp.tsx', content);

