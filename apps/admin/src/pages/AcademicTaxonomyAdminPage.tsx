import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { Loader2, Search, Filter, Plus, Edit, X } from 'lucide-react';
import { AcademicTaxonomyDeterministicKey, iscedFBaselineNodes } from '@manaratak/domain';

interface AcademicTaxonomyNode {
  nodeId: string;
  nodeType: string;
  standardType?: string;
  canonicalCode: string;
  canonicalName: string;
  status: string;
  description?: string;
  localizedNames?: Record<string, string>;
}

interface DegreeLevel {
  id: string;
  canonicalCode: string;
  nameEn: string;
  nameAr: string;
  displayRank: number;
  status: string;
}

export function AcademicTaxonomyAdminPage() {
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const localReadOnly = import.meta.env.VITE_LOCAL_ADMIN_READ_ONLY === 'true';

  const [activeMainTab, setActiveMainTab] = useState<'taxonomy' | 'degrees'>('taxonomy');

  // --- Taxonomy Node State ---
  const [nodes, setNodes] = useState<AcademicTaxonomyNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [nodesError, setNodesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const pageSize = 50;
  const [filters, setFilters] = useState({
    nodeType: 'all',
    standardType: 'all',
    status: 'all',
  });

  // --- Degree Levels State ---
  const [degreeLevels, setDegreeLevels] = useState<DegreeLevel[]>([]);
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [degreesError, setDegreesError] = useState<string | null>(null);

  // --- Modals State ---
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [savingNode, setSavingNode] = useState(false);
  const [nodeFormError, setNodeFormError] = useState<string | null>(null);
  const [nodeFormData, setNodeFormData] = useState({
    nodeType: 'ACADEMIC_FIELD',
    canonicalCode: '',
    canonicalName: '',
    description: '',
    status: 'DRAFT',
    standardType: 'CUSTOM_NATIONAL',
    standardCode: '',
    nameAr: '',
    nameEn: '',
  });

  const [editingDegree, setEditingDegree] = useState<DegreeLevel | null>(null);
  const [savingDegree, setSavingDegree] = useState(false);
  const [degreeFormError, setDegreeFormError] = useState<string | null>(null);
  const [degreeFormData, setDegreeFormData] = useState({
    nameEn: '',
    nameAr: '',
    displayRank: 0,
    status: 'ACTIVE',
  });

  // --- Fetch Taxonomy Nodes ---
  const fetchNodes = async () => {
    setLoadingNodes(true);
    setNodesError(null);
    try {
      if (localReadOnly) {
        const query = searchQuery.trim().toLocaleLowerCase();
        const previewNodes = iscedFBaselineNodes
          .filter((node) => filters.nodeType === 'all' || node.nodeType === filters.nodeType)
          .filter((node) => filters.standardType === 'all' || node.standardType === filters.standardType)
          .filter((node) => filters.status === 'all' || node.status === filters.status)
          .filter((node) => !query || node.canonicalCode.toLocaleLowerCase().includes(query) || node.canonicalName.toLocaleLowerCase().includes(query))
          .map((node) => ({
            ...node,
            nodeId: AcademicTaxonomyDeterministicKey.create(node),
          }));
        const start = (page - 1) * pageSize;
        setNodes(previewNodes.slice(start, start + pageSize));
        setHasNextPage(previewNodes.length > start + pageSize);
        return;
      }
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (searchQuery) params.append('q', searchQuery);
      if (filters.nodeType !== 'all') params.append('nodeType', filters.nodeType);
      if (filters.standardType !== 'all') params.append('standardType', filters.standardType);
      if (filters.status !== 'all') params.append('status', filters.status);

      // Using the authorized admin endpoint
      const endpoint = `${localReadOnly ? '/academic-taxonomy' : '/admin/academic-taxonomy'}/nodes?${params.toString()}`;
      const response = await adminApiClient.request<{ data: AcademicTaxonomyNode[] }>(endpoint);
      const received = response.data || [];
      setNodes(received);
      setHasNextPage(received.length === pageSize);
    } catch (err) {
      console.error(err);
      setNodesError(isAr 
        ? 'تعذر تحميل التصنيف الأكاديمي من واجهة البيانات.' 
        : 'Unable to load academic taxonomy from the API.');
    } finally {
      setLoadingNodes(false);
    }
  };

  // --- Fetch Degree Levels ---
  const fetchDegreeLevels = async () => {
    setLoadingDegrees(true);
    setDegreesError(null);
    if (localReadOnly) {
      setDegreeLevels([]);
      setDegreesError(isAr
        ? 'الدرجات العلمية متاحة من لوحة الإدارة بعد الاتصال بقاعدة البيانات.'
        : 'Degree levels are available in the admin console after the database is connected.');
      setLoadingDegrees(false);
      return;
    }
    try {
      const response = await adminApiClient.request<{ data: DegreeLevel[] }>('/admin/academic-taxonomy/degree-levels');
      setDegreeLevels(response.data || []);
    } catch (err) {
      console.error(err);
      setDegreesError(isAr
        ? 'تعذر تحميل الدرجات الأكاديمية.'
        : 'Unable to load degree levels.');
    } finally {
      setLoadingDegrees(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'taxonomy') {
      fetchNodes();
    } else {
      fetchDegreeLevels();
    }
  }, [activeMainTab, filters, searchQuery, page]);

  // --- Handle Add Node Submit ---
  const handleAddNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNode(true);
    setNodeFormError(null);

    const localizedNames: Record<string, string> = {};
    if (nodeFormData.nameAr) localizedNames.ar = nodeFormData.nameAr;
    if (nodeFormData.nameEn) localizedNames.en = nodeFormData.nameEn;

    try {
      const payload = {
        nodeType: nodeFormData.nodeType,
        canonicalCode: nodeFormData.canonicalCode.toUpperCase().trim(),
        canonicalName: nodeFormData.canonicalName.trim(),
        description: nodeFormData.description.trim() || undefined,
        status: nodeFormData.status,
        standardType: nodeFormData.standardType || undefined,
        standardCode: nodeFormData.standardCode.trim() || undefined,
        localizedNames: Object.keys(localizedNames).length > 0 ? localizedNames : undefined,
      };

      await adminApiClient.request('/admin/academic-taxonomy/nodes', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setShowAddNodeModal(false);
      // Reset form
      setNodeFormData({
        nodeType: 'ACADEMIC_FIELD',
        canonicalCode: '',
        canonicalName: '',
        description: '',
        status: 'DRAFT',
        standardType: 'CUSTOM_NATIONAL',
        standardCode: '',
        nameAr: '',
        nameEn: '',
      });
      fetchNodes();
    } catch (err: any) {
      console.error(err);
      setNodeFormError(err.message || (isAr ? 'حدث خطأ أثناء حفظ العقدة.' : 'An error occurred while saving the node.'));
    } finally {
      setSavingNode(false);
    }
  };

  // --- Handle Edit Degree Submit ---
  const handleEditDegreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDegree) return;
    setSavingDegree(true);
    setDegreeFormError(null);

    try {
      await adminApiClient.request(`/admin/academic-taxonomy/degree-levels/${editingDegree.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nameEn: degreeFormData.nameEn.trim(),
          nameAr: degreeFormData.nameAr.trim(),
          displayRank: Number(degreeFormData.displayRank),
          status: degreeFormData.status,
        }),
      });

      setEditingDegree(null);
      fetchDegreeLevels();
    } catch (err: any) {
      console.error(err);
      setDegreeFormError(err.message || (isAr ? 'حدث خطأ أثناء تحديث الدرجة العلمية.' : 'An error occurred while updating the degree level.'));
    } finally {
      setSavingDegree(false);
    }
  };

  const openEditDegreeModal = (degree: DegreeLevel) => {
    setEditingDegree(degree);
    setDegreeFormData({
      nameEn: degree.nameEn,
      nameAr: degree.nameAr,
      displayRank: degree.displayRank,
      status: degree.status,
    });
  };

  const translateNodeType = (type: string) => {
    if (!isAr) return type.replace('_', ' ');
    switch (type) {
      case 'ACADEMIC_FIELD': return 'مجال أكاديمي';
      case 'DISCIPLINE': return 'فرع أكاديمي';
      case 'PROGRAM_AREA': return 'مجال برنامج';
      case 'SPECIALIZATION_CATEGORY': return 'فئة تخصص';
      case 'STANDARD_CLASSIFICATION': return 'تصنيف معياري';
      default: return type;
    }
  };

  const translateStatus = (status: string) => {
    if (!isAr) return status;
    switch (status) {
      case 'DRAFT': return 'مسودة';
      case 'READY_TO_REVIEW': return 'جاهز للمراجعة';
      case 'ACTIVE': return 'نشط';
      case 'ARCHIVED': return 'مؤرشف';
      default: return status;
    }
  };

  return (
    <div className={`max-w-7xl mx-auto space-y-6 pb-12 ${isAr ? 'rtl text-right' : 'ltr text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isAr ? 'التصنيف الأكاديمي والدرجات العلمية' : 'Academic Taxonomy & Degree Levels'}
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {isAr 
              ? 'بوابة حوكمة وإدارة شجرة التصنيف الأكاديمي، المعايير والدرجات العلمية.' 
              : 'Governance portal for managing academic taxonomy, reference standards, and degree levels.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeMainTab === 'taxonomy' && !localReadOnly && (
            <button
              onClick={() => setShowAddNodeModal(true)}
              className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs"
            >
              <Plus className="h-4 w-4" />
              {isAr ? 'إضافة عقدة تصنيف جديدة' : 'Add Taxonomy Node'}
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit gap-1 border border-slate-200">
        <button
          onClick={() => setActiveMainTab('taxonomy')}
          className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeMainTab === 'taxonomy'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isAr ? 'التصنيف الأكاديمي' : 'Academic Taxonomy'}
        </button>
        <button
          onClick={() => setActiveMainTab('degrees')}
          className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeMainTab === 'degrees'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isAr ? 'الدرجات العلمية (Reference)' : 'Degree Levels (Reference)'}
        </button>
      </div>

      {/* --- TAB CONTENT: TAXONOMY --- */}
      {activeMainTab === 'taxonomy' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={isAr ? 'البحث عن طريق الرمز أو الاسم المعتمد...' : 'Search by canonical code or name...'}
                  className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E7C86] text-xs font-medium`}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  className="border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86] text-xs font-bold"
                  value={filters.nodeType}
                  onChange={(e) => { setFilters(f => ({ ...f, nodeType: e.target.value })); setPage(1); }}
                >
                  <option value="all">{isAr ? 'جميع أنواع العقد' : 'All Node Types'}</option>
                  <option value="ACADEMIC_FIELD">{isAr ? 'مجال أكاديمي' : 'Academic Field'}</option>
                  <option value="DISCIPLINE">{isAr ? 'فرع أكاديمي' : 'Discipline'}</option>
                  <option value="PROGRAM_AREA">{isAr ? 'مجال برنامج' : 'Program Area'}</option>
                  <option value="SPECIALIZATION_CATEGORY">{isAr ? 'فئة تخصص' : 'Specialization Category'}</option>
                  <option value="STANDARD_CLASSIFICATION">{isAr ? 'تصنيف معياري' : 'Standard Classification'}</option>
                </select>
                <select
                  className="border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86] text-xs font-bold"
                  value={filters.standardType}
                  onChange={(e) => { setFilters(f => ({ ...f, standardType: e.target.value })); setPage(1); }}
                >
                  <option value="all">{isAr ? 'جميع المعايير' : 'All Standards'}</option>
                  <option value="ISCED">ISCED</option>
                  <option value="CIP">CIP</option>
                  <option value="CUSTOM_NATIONAL">{isAr ? 'معيار وطني مخصص' : 'CUSTOM_NATIONAL'}</option>
                </select>
                <select
                  className="border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86] text-xs font-bold"
                  value={filters.status}
                  onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                >
                  <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="DRAFT">{isAr ? 'مسودة' : 'DRAFT'}</option>
                  <option value="READY_TO_REVIEW">{isAr ? 'جاهز للمراجعة' : 'READY_TO_REVIEW'}</option>
                  <option value="ACTIVE">{isAr ? 'نشط' : 'ACTIVE'}</option>
                  <option value="ARCHIVED">{isAr ? 'مؤرشف' : 'ARCHIVED'}</option>
                </select>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({ nodeType: 'all', standardType: 'all', status: 'all' });
                    setPage(1);
                  }}
                  className="text-slate-500 hover:text-slate-800 font-bold text-xs px-2.5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {isAr ? 'إعادة تعيين' : 'Reset'}
                </button>
              </div>
            </div>
          </div>

          {/* List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {nodesError && (
              <div className="p-8 text-center text-red-600 bg-red-50/50 border-b border-red-100 font-medium text-sm">
                {nodesError}
              </div>
            )}
            
            {loadingNodes ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : nodes.length === 0 ? (
              <div className="p-16 text-center text-slate-500 font-medium text-xs">
                {isAr ? 'لا توجد عناصر تصنيف أكاديمي مطابقة للبحث.' : 'No academic taxonomy nodes match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الاسم المعتمد' : 'Canonical Name'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الرمز المعتمد' : 'Canonical Code'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'نوع العقدة' : 'Node Type'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'المعيار' : 'Standard'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-left' : 'text-right'}`}>{isAr ? 'الإجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {nodes.map(node => (
                      <tr key={node.nodeId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{node.canonicalName}</td>
                        <td className="px-6 py-4 font-mono text-slate-600">{node.canonicalCode}</td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            {translateNodeType(node.nodeType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono">
                          {node.standardType ? node.standardType : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            node.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                            node.status === 'DRAFT' ? 'bg-slate-50 text-slate-600 border border-slate-200' :
                            node.status === 'READY_TO_REVIEW' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {translateStatus(node.status)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${isAr ? 'text-left' : 'text-right'}`}>
                          <Link
                            to={`/academic-taxonomy/${node.nodeId}`}
                            className="text-[#142B5F] hover:text-[#0E7C86] font-bold bg-[#DDEFF2]/45 hover:bg-[#DDEFF2]/75 border border-[#0E7C86]/15 px-3 py-1.5 rounded-lg transition-all"
                          >
                            {isAr ? 'إدارة وتفاصيل' : 'Manage & Details'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loadingNodes && !nodesError && nodes.length > 0 && (page > 1 || hasNextPage) ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">
              <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">{isAr ? 'السابق' : 'Previous'}</button>
              <span>{isAr ? `الصفحة ${page}` : `Page ${page}`}</span>
              <button disabled={!hasNextPage} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#0E7C86]/20 px-3 py-2 text-[#142B5F] disabled:opacity-40">{isAr ? 'التالي' : 'Next'}</button>
            </div>
          ) : null}
        </div>
      )}

      {/* --- TAB CONTENT: DEGREE LEVELS --- */}
      {activeMainTab === 'degrees' && (
        <div className="space-y-6">
          <div className="bg-amber-50/60 text-amber-900 p-4 rounded-2xl border border-amber-200/70 text-xs font-semibold leading-relaxed flex items-start gap-3">
            <span className="bg-amber-100 text-amber-800 rounded-lg p-1.5 font-black shrink-0 text-[10px]">REF</span>
            <div>
              {isAr
                ? 'ملاحظة: حوكمة الدرجات العلمية (Degree Levels) مصممة لتكون بيانات مرجعية مقيدة لحماية سلامة النظام. يمكنك تعديل أسماء الدرجات والترتيب والحالة، ولكن لا يمكن تعديل الرموز المعتمدة لضمان استقرار الربط.'
                : 'Note: Degree Level governance is strictly regulated to protect system references. You can modify display names, sorting ranks, and status, but canonical codes are locked to ensure binding integrity.'}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {degreesError && (
              <div className="p-8 text-center text-red-600 bg-red-50/50 border-b border-red-100 font-medium text-sm">
                {degreesError}
              </div>
            )}

            {loadingDegrees ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : degreeLevels.length === 0 ? (
              <div className="p-16 text-center text-slate-500 font-medium text-xs">
                {isAr ? 'لا توجد درجات علمية معرفة في النظام.' : 'No degree levels defined in the system.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الرمز المعتمد' : 'Canonical Code'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الاسم الإنجليزي' : 'English Name'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الاسم العربي' : 'Arabic Name'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'ترتيب العرض' : 'Display Rank'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-right' : 'text-left'}`}>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={`px-6 py-4 ${isAr ? 'text-left' : 'text-right'}`}>{isAr ? 'الإجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {degreeLevels.map(degree => (
                      <tr key={degree.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{degree.canonicalCode}</td>
                        <td className="px-6 py-4">{degree.nameEn}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{degree.nameAr}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{degree.displayRank}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            degree.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {translateStatus(degree.status)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 ${isAr ? 'text-left' : 'text-right'}`}>
                          <button
                            onClick={() => openEditDegreeModal(degree)}
                            disabled={localReadOnly}
                            className="text-slate-700 hover:text-slate-900 font-bold bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-[11px] inline-flex"
                          >
                            <Edit className="h-3 w-3" />
                            {isAr ? 'تعديل الدرجة' : 'Edit Degree'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: ADD TAXONOMY NODE --- */}
      {showAddNodeModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-950">
                {isAr ? 'إضافة عقدة تصنيف أكاديمي جديدة' : 'Add New Academic Taxonomy Node'}
              </h2>
              <button
                onClick={() => setShowAddNodeModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddNodeSubmit} className="p-6 space-y-4">
              {nodeFormError && (
                <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {nodeFormError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'نوع العقدة' : 'Node Type'} *
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={nodeFormData.nodeType}
                    onChange={(e) => setNodeFormData(d => ({ ...d, nodeType: e.target.value }))}
                  >
                    <option value="ACADEMIC_FIELD">{isAr ? 'مجال أكاديمي' : 'Academic Field'}</option>
                    <option value="DISCIPLINE">{isAr ? 'فرع أكاديمي' : 'Discipline'}</option>
                    <option value="PROGRAM_AREA">{isAr ? 'مجال برنامج' : 'Program Area'}</option>
                    <option value="SPECIALIZATION_CATEGORY">{isAr ? 'فئة تخصص' : 'Specialization Category'}</option>
                    <option value="STANDARD_CLASSIFICATION">{isAr ? 'تصنيف معياري' : 'Standard Classification'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'الرمز المعتمد' : 'Canonical Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ISC-0111"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={nodeFormData.canonicalCode}
                    onChange={(e) => setNodeFormData(d => ({ ...d, canonicalCode: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'الاسم المعتمد (الرئيسي)' : 'Canonical Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Education"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={nodeFormData.canonicalName}
                  onChange={(e) => setNodeFormData(d => ({ ...d, canonicalName: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'الاسم بالعربية' : 'Arabic Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="الترجمة العربية"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={nodeFormData.nameAr}
                    onChange={(e) => setNodeFormData(d => ({ ...d, nameAr: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'الاسم بالإنجليزية' : 'English Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="English Translation"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={nodeFormData.nameEn}
                    onChange={(e) => setNodeFormData(d => ({ ...d, nameEn: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'نوع المعيار' : 'Standard Type'}
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={nodeFormData.standardType}
                    onChange={(e) => setNodeFormData(d => ({ ...d, standardType: e.target.value }))}
                  >
                    <option value="CUSTOM_NATIONAL">{isAr ? 'وطني مخصص' : 'CUSTOM_NATIONAL'}</option>
                    <option value="ISCED">ISCED</option>
                    <option value="CIP">CIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'الرمز المعياري' : 'Standard Code'}
                  </label>
                  <input
                    type="text"
                    placeholder="0111"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={nodeFormData.standardCode}
                    onChange={(e) => setNodeFormData(d => ({ ...d, standardCode: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'الحالة' : 'Status'}
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={nodeFormData.status}
                    onChange={(e) => setNodeFormData(d => ({ ...d, status: e.target.value }))}
                  >
                    <option value="DRAFT">{isAr ? 'مسودة' : 'DRAFT'}</option>
                    <option value="READY_TO_REVIEW">{isAr ? 'جاهز للمراجعة' : 'READY_TO_REVIEW'}</option>
                    <option value="ACTIVE">{isAr ? 'نشط' : 'ACTIVE'}</option>
                    <option value="ARCHIVED">{isAr ? 'مؤرشف' : 'ARCHIVED'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'وصف العقدة' : 'Node Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'أدخل تفاصيل ووصف هذا المستوى...' : 'Enter node details/descriptions...'}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={nodeFormData.description}
                  onChange={(e) => setNodeFormData(d => ({ ...d, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNodeModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingNode}
                  className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2"
                >
                  {savingNode ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isAr ? 'حفظ العقدة' : 'Save Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT DEGREE LEVEL --- */}
      {editingDegree && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-950">
                {isAr ? 'تعديل بيانات الدرجة العلمية المرجعية' : 'Edit Reference Degree Level'}
              </h2>
              <button
                onClick={() => setEditingDegree(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditDegreeSubmit} className="p-6 space-y-4">
              {degreeFormError && (
                <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {degreeFormError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  {isAr ? 'الرمز المعتمد (غير قابل للتعديل)' : 'Canonical Code (Locked)'}
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
                  value={editingDegree.canonicalCode}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'الاسم بالإنجليزي' : 'English Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bachelor"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={degreeFormData.nameEn}
                  onChange={(e) => setDegreeFormData(d => ({ ...d, nameEn: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'الاسم بالعربي' : 'Arabic Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بكالوريوس"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={degreeFormData.nameAr}
                  onChange={(e) => setDegreeFormData(d => ({ ...d, nameAr: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'ترتيب العرض' : 'Display Rank'} *
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={degreeFormData.displayRank}
                    onChange={(e) => setDegreeFormData(d => ({ ...d, displayRank: Number(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'الحالة' : 'Status'}
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={degreeFormData.status}
                    onChange={(e) => setDegreeFormData(d => ({ ...d, status: e.target.value }))}
                  >
                    <option value="ACTIVE">{isAr ? 'نشط' : 'ACTIVE'}</option>
                    <option value="DRAFT">{isAr ? 'مسودة' : 'DRAFT'}</option>
                    <option value="ARCHIVED">{isAr ? 'مؤرشف' : 'ARCHIVED'}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDegree(null)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingDegree}
                  className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2"
                >
                  {savingDegree ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isAr ? 'تحديث البيانات' : 'Update Degree'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
