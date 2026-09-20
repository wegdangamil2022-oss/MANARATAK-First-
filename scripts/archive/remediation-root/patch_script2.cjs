const fs = require('fs');

let content = fs.readFileSync('apps/web/src/features/admin-preview/AdminUniversityDetailPage.tsx', 'utf-8');

// 1. Add DEMO_RECORD updates
content = content.replace(
  "internationalScholarships: [],",
  `internationalScholarships: [],
  
  // Phase 4 fields
  annualTuitionFees: '',
  hasMedicineBachelor: true,
  medicineBachelorTuition: '',
  hasEngineeringTuition: true,
  engineeringTuition: [],
  graduateTuition: '',
  tuitionCurrency: '',
  tuitionUrl: '',
  
  housingAvailable: null,
  housingInternationalEligibility: null,
  housingCost: '',
  housingCurrency: '',
  
  livingCost: '',
  livingCostCurrency: '',
  livingCostNote: '',
  
  generalRequiredDocuments: [],
  graduateRequiredDocuments: [],
  requiredDocumentsUrl: '',`
);

// 2. Add PHASE_4_SECTIONS
const phase4SectionsCode = `
const PHASE_4_SECTIONS = [
  { section: 'التعريف', fields: [
    { key: 'referenceId', label: 'معرف الجامعة المرجعي', type: 'readonly-text' },
  ]},
  { section: 'الرسوم الدراسية', fields: [
    { key: 'annualTuitionFees', label: 'الرسوم الدراسية للعام', type: 'number' },
    { key: 'medicineBachelorTuition', label: 'رسوم بكالوريوس الطب، إن وجد', type: 'medicine-tuition' },
    { key: 'engineeringTuition', label: 'رسوم بكالوريوس التخصصات الهندسية حسب الكلية', type: 'engineering-tuition' },
    { key: 'graduateTuition', label: 'رسوم الدراسات العليا', type: 'number' },
    { key: 'tuitionCurrency', label: 'العملة', type: 'select', options: ['QAR', 'USD', 'EUR', 'GBP', 'SAR', 'AED'] },
    { key: 'tuitionUrl', label: 'رابط الرسوم الدراسية', type: 'url' },
  ]},
  { section: 'السكن الجامعي', fields: [
    { key: 'housingAvailable', label: 'هل السكن الجامعي متاح؟', type: 'yes-no' },
    { key: 'housingInternationalEligibility', label: 'هل الطلاب الدوليون مؤهلون للسكن؟', type: 'yes-no', dependsOn: { key: 'housingAvailable', value: true } },
    { key: 'housingCost', label: 'تكلفة السكن النموذجية', type: 'number', dependsOn: { key: 'housingAvailable', value: true } },
    { key: 'housingCurrency', label: 'عملة تكلفة السكن', type: 'select', options: ['QAR', 'USD', 'EUR', 'GBP', 'SAR', 'AED'], dependsOn: { key: 'housingAvailable', value: true } },
  ]},
  { section: 'تكاليف المعيشة', fields: [
    { key: 'livingCost', label: 'متوسط تكلفة المعيشة الشهرية', type: 'number' },
    { key: 'livingCostCurrency', label: 'العملة', type: 'select', options: ['QAR', 'USD', 'EUR', 'GBP', 'SAR', 'AED'] },
    { key: 'livingCostNote', label: 'ملاحظة اختلاف التكاليف', type: 'textarea' },
  ]},
  { section: 'الوثائق المطلوبة', fields: [
    { key: 'generalRequiredDocuments', label: 'الوثائق العامة المطلوبة', type: 'tags' },
    { key: 'graduateRequiredDocuments', label: 'المتطلبات الإضافية للدراسات العليا', type: 'tags' },
    { key: 'requiredDocumentsUrl', label: 'رابط الوثائق المطلوبة الرسمي', type: 'url' },
  ]}
];
`;

content = content.replace("const TagInput = ({", phase4SectionsCode + "\n\nconst TagInput = ({");

// 3. Subcomponents (MedicineTuitionInput and EngineeringTuitionInput)
const subcomponentsCode = `
const MedicineTuitionInput = ({ value, hasMedicine, onChangeValue, onChangeHasMedicine, disabled = false }: any) => {
  return (
    <div className={\`flex flex-col gap-2 \${disabled ? 'opacity-50 pointer-events-none' : ''}\`}>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input 
          type="checkbox" 
          checked={!hasMedicine} 
          onChange={(e) => onChangeHasMedicine(!e.target.checked)} 
          className="rounded border-slate-300 text-[#0F4B3A] focus:ring-[#0F4B3A]"
        />
        لا يوجد بكالوريوس طب
      </label>
      <input 
        type="number" 
        placeholder="رسوم بكالوريوس الطب" 
        value={value || ''} 
        onChange={(e) => onChangeValue(e.target.value)}
        disabled={!hasMedicine || disabled}
        className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
};

const EngineeringTuitionInput = ({ value = [], hasEngineering, onChangeValue, onChangeHasEngineering, disabled = false }: any) => {
  const addEntry = () => {
    onChangeValue([...value, { college: '', fee: '' }]);
  };
  
  const updateEntry = (index: number, key: string, val: string) => {
    const newEntries = [...value];
    newEntries[index][key] = val;
    onChangeValue(newEntries);
  };
  
  const removeEntry = (index: number) => {
    const newEntries = [...value];
    newEntries.splice(index, 1);
    onChangeValue(newEntries);
  };
  
  return (
    <div className={\`flex flex-col gap-3 \${disabled ? 'opacity-50 pointer-events-none' : ''}\`}>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input 
          type="checkbox" 
          checked={!hasEngineering} 
          onChange={(e) => onChangeHasEngineering(!e.target.checked)} 
          className="rounded border-slate-300 text-[#0F4B3A] focus:ring-[#0F4B3A]"
        />
        لا توجد تخصصات هندسية
      </label>
      
      {hasEngineering && (
        <div className="flex flex-col gap-3">
          {value.map((entry: any, idx: number) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
              <input 
                type="text" 
                placeholder="اسم الكلية" 
                value={entry.college} 
                onChange={(e) => updateEntry(idx, 'college', e.target.value)}
                className="w-full md:w-1/2 p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900"
              />
              <input 
                type="number" 
                placeholder="قيمة الرسوم" 
                value={entry.fee} 
                onChange={(e) => updateEntry(idx, 'fee', e.target.value)}
                className="w-full md:w-1/2 p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0F4B3A] focus:border-[#0F4B3A] focus:outline-none text-sm text-slate-900"
              />
              <button onClick={() => removeEntry(idx)} className="mt-2 md:mt-2 text-rose-500 hover:text-rose-700 shrink-0 self-end md:self-auto p-1 bg-white border border-rose-200 rounded-md transition-colors shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={addEntry} className="self-start text-sm font-bold text-[#0F4B3A] hover:text-[#0a3327] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm transition-colors">
            + إضافة كلية
          </button>
        </div>
      )}
    </div>
  );
};
`;

content = content.replace("export function AdminUniversityDetailPage() {", subcomponentsCode + "\n\nexport function AdminUniversityDetailPage() {");

// 4. Update state types
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'phase0' | 'phase1' | 'phase3'>('phase0');",
  "const [activeTab, setActiveTab] = useState<'phase0' | 'phase1' | 'phase3' | 'phase4'>('phase0');"
);

// 5. Completion Calculation
const phase4CalcCode = `
  const calculatePhase4Completion = () => {
    let total = 17;
    let completed = 0;
    
    // 1
    if (data.referenceId) completed++;
    
    // 2-7
    if (data.annualTuitionFees !== '' && data.annualTuitionFees !== null) completed++;
    
    if (data.hasMedicineBachelor === false) {
      completed++;
    } else {
      if (data.medicineBachelorTuition !== '' && data.medicineBachelorTuition !== null) completed++;
    }

    if (data.hasEngineeringTuition === false) {
      completed++;
    } else {
      if (data.engineeringTuition?.length > 0 && data.engineeringTuition.some((e: any) => e.college || e.fee)) completed++;
    }
    
    if (data.graduateTuition !== '' && data.graduateTuition !== null) completed++;
    if (data.tuitionCurrency) completed++;
    if (data.tuitionUrl) completed++;
    
    // 8-11
    if (data.housingAvailable === true || data.housingAvailable === false) completed++;
    
    if (data.housingAvailable === false) {
      completed += 3;
    } else {
      if (data.housingInternationalEligibility === true || data.housingInternationalEligibility === false) completed++;
      if (data.housingCost !== '' && data.housingCost !== null) completed++;
      if (data.housingCurrency) completed++;
    }
    
    // 12-14
    if (data.livingCost !== '' && data.livingCost !== null) completed++;
    if (data.livingCostCurrency) completed++;
    if (data.livingCostNote) completed++;
    
    // 15-17
    if (data.generalRequiredDocuments?.length > 0) completed++;
    if (data.graduateRequiredDocuments?.length > 0) completed++;
    if (data.requiredDocumentsUrl) completed++;
    
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
  const phase4Stats = calculatePhase4Completion();
`;

content = content.replace(
  /const phase0Stats = calculateCompletion\(PHASE_0_FIELDS\);\s*const phase1Stats = calculateCompletion\(PHASE_1_FIELDS\);\s*const phase3Stats = calculatePhase3Completion\(\);/,
  phase4CalcCode
);

// 6. Update Custom Render
const renderMedicineEngCode = `
      if (field.type === 'medicine-tuition') {
        if (data.hasMedicineBachelor === false) return <span className="text-slate-400 text-sm italic">لا يوجد بكالوريوس طب</span>;
        if (!val) return <span className="text-slate-400 text-sm italic">غير متوفر</span>;
        return <span className="text-slate-900 text-sm font-medium">{val} {data.tuitionCurrency}</span>;
      }

      if (field.type === 'engineering-tuition') {
        if (data.hasEngineeringTuition === false) return <span className="text-slate-400 text-sm italic">لا توجد تخصصات هندسية</span>;
        if (!val || val.length === 0 || (val.length === 1 && !val[0].college && !val[0].fee)) return <span className="text-slate-400 text-sm italic">غير متوفر</span>;
        return (
          <div className="flex flex-col gap-2">
            {val.map((entry: any, idx: number) => (
              entry.college || entry.fee ? (
                <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-sm font-bold text-slate-800">{entry.college || '-'}</span>
                  <span className="text-sm font-medium text-slate-600">{entry.fee ? \`\${entry.fee} \${data.tuitionCurrency || ''}\` : '-'}</span>
                </div>
              ) : null
            ))}
          </div>
        );
      }
      
      // Handle numeric with currency display
      if (field.type === 'number' && (field.key === 'housingCost' || field.key === 'annualTuitionFees' || field.key === 'graduateTuition' || field.key === 'livingCost')) {
         if (!val) return <span className="text-slate-400 text-sm italic">غير متوفر</span>;
         let currency = '';
         if (field.key.includes('housing')) currency = data.housingCurrency || '';
         else if (field.key.includes('living')) currency = data.livingCostCurrency || '';
         else currency = data.tuitionCurrency || '';
         return <span className="text-slate-900 text-sm font-medium">{val} {currency}</span>;
      }
`;

content = content.replace("if (field.type === 'yes-no') {", renderMedicineEngCode + "\n      if (field.type === 'yes-no') {");


const editMedicineEngCode = `
    if (field.type === 'medicine-tuition') {
      return (
        <MedicineTuitionInput 
          value={val} 
          hasMedicine={data.hasMedicineBachelor}
          onChangeValue={onChange}
          onChangeHasMedicine={(has: boolean) => setData((prev: any) => ({ ...prev, hasMedicineBachelor: has }))}
          disabled={isDependsDisabled} 
        />
      );
    }
    
    if (field.type === 'engineering-tuition') {
      return (
        <EngineeringTuitionInput 
          value={val} 
          hasEngineering={data.hasEngineeringTuition}
          onChangeValue={onChange}
          onChangeHasEngineering={(has: boolean) => setData((prev: any) => ({ ...prev, hasEngineeringTuition: has }))}
          disabled={isDependsDisabled} 
        />
      );
    }
`;

content = content.replace("if (field.type === 'readonly-text') {", editMedicineEngCode + "\n    if (field.type === 'readonly-text') {");


// 7. currentStats update
content = content.replace(
  "const currentStats = activeTab === 'phase0' ? phase0Stats : activeTab === 'phase1' ? phase1Stats : phase3Stats;",
  "const currentStats = activeTab === 'phase0' ? phase0Stats : activeTab === 'phase1' ? phase1Stats : activeTab === 'phase3' ? phase3Stats : phase4Stats;"
);


// 8. Tab button update
const tab4Code = `          <button
            onClick={() => setActiveTab('phase4')}
            className={\`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors \${
              activeTab === 'phase4' ? 'border-[#0F4B3A] text-[#0F4B3A]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }\`}
          >
            <span className="font-bold text-sm">المرحلة الرابعة: الرسوم والسكن والوثائق</span>
            <span className={\`text-[10px] px-1.5 py-0.5 rounded font-bold border \${getStatusColor(phase4Stats.status)}\`}>
              {phase4Stats.status}
            </span>
          </button>
        </div>`;

content = content.replace("</div>\n\n        {/* Completion Summary */}", tab4Code + "\n\n        {/* Completion Summary */}");


// 9. Summary title & renderSections
content = content.replace(
  "{activeTab === 'phase0' ? 'الاستيراد الأساسي' : activeTab === 'phase1' ? 'المرحلة الأولى: الهوية والموقع والمصادر الرسمية' : 'المرحلة الثالثة: الدراسة والقبول واللغة والمنح'}",
  "{activeTab === 'phase0' ? 'الاستيراد الأساسي' : activeTab === 'phase1' ? 'المرحلة الأولى: الهوية والموقع والمصادر الرسمية' : activeTab === 'phase3' ? 'المرحلة الثالثة: الدراسة والقبول واللغة والمنح' : 'المرحلة الرابعة: الرسوم والسكن والوثائق'}"
);

content = content.replace(
  "{activeTab === 'phase0' ? renderSections(PHASE_0_FIELDS) : activeTab === 'phase1' ? renderSections(PHASE_1_FIELDS) : renderSections(PHASE_3_SECTIONS)}",
  "{activeTab === 'phase0' ? renderSections(PHASE_0_FIELDS) : activeTab === 'phase1' ? renderSections(PHASE_1_FIELDS) : activeTab === 'phase3' ? renderSections(PHASE_3_SECTIONS) : renderSections(PHASE_4_SECTIONS)}"
);


const yesNoReplaceCode = `
      if (field.type === 'yes-no') {
        if (val === true) return <span className="text-slate-900 text-sm font-medium">نعم</span>;
        if (val === false) {
           if (field.key === 'housingAvailable') return <span className="text-slate-400 text-sm italic">لا يتوفر سكن جامعي</span>;
           return <span className="text-slate-900 text-sm font-medium">لا</span>;
        }
        return <span className="text-slate-400 text-sm italic">غير متوفر</span>;
      }`;

content = content.replace(
  /if \(field\.type === 'yes-no'\) \{\s*if \(val === true\) return <span className="text-slate-900 text-sm font-medium">نعم<\/span>;\s*if \(val === false\) return <span className="text-slate-900 text-sm font-medium">لا<\/span>;\s*return <span className="text-slate-400 text-sm italic">غير متوفر<\/span>;\s*\}/m,
  yesNoReplaceCode
);

fs.writeFileSync('apps/web/src/features/admin-preview/AdminUniversityDetailPage.tsx', content);

