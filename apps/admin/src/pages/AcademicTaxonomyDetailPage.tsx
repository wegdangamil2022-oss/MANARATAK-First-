import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import {
  AcademicTaxonomyDeterministicKey,
  iscedFBaselineEdges,
  iscedFBaselineNodes,
} from '@manaratak/domain';
import { useTranslation } from '../i18n/I18nProvider';
import {
  Loader2,
  ArrowLeft,
  Network,
  Box,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Globe,
  Tag,
  Activity,
  CheckCircle,
  XCircle,
  BookOpen,
} from 'lucide-react';

interface AcademicTaxonomyNode {
  nodeId: string;
  nodeType: string;
  standardType?: string;
  standardCode?: string;
  canonicalCode: string;
  canonicalName: string;
  description?: string;
  status: string;
  localizedNames?: Record<string, string>;
}

interface AliasDto {
  aliasId: string;
  nodeId: string;
  alias: string;
  locale?: string;
}

interface MappingDto {
  mappingId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceStandard: string;
  targetStandard: string;
  strength: string;
  confidence?: number;
  notes?: string;
  targetNode?: {
    canonicalName: string;
    canonicalCode: string;
  };
}

interface MappedMajorDto {
  id: string;
  relationshipType: string;
  major?: {
    id: string;
    canonicalName: string;
  };
  profile?: {
    id: string;
    displayName: string;
    level: string;
  };
}

interface ValidationReport {
  isValid: boolean;
  issues: Array<{
    code: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
    details?: any;
  }>;
}

export function AcademicTaxonomyDetailPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const localReadOnly = import.meta.env.VITE_LOCAL_ADMIN_READ_ONLY === 'true';

  const [node, setNode] = useState<AcademicTaxonomyNode | null>(null);
  const [children, setChildren] = useState<AcademicTaxonomyNode[]>([]);
  const [parents, setParents] = useState<AcademicTaxonomyNode[]>([]);
  const [aliases, setAliases] = useState<AliasDto[]>([]);
  const [mappings, setMappings] = useState<MappingDto[]>([]);
  const [mappedMajors, setMappedMajors] = useState<MappedMajorDto[]>([]);
  const [allNodes, setAllNodes] = useState<AcademicTaxonomyNode[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // --- Modal & Action States ---
  const [showEditNodeModal, setShowEditNodeModal] = useState(false);
  const [savingNode, setSavingNode] = useState(false);
  const [nodeFormError, setNodeFormError] = useState<string | null>(null);
  const [nodeFormData, setNodeFormData] = useState({
    canonicalName: '',
    description: '',
    status: '',
    standardType: '',
    standardCode: '',
    nameAr: '',
    nameEn: '',
  });

  // --- Edges State ---
  const [showAddEdgeModal, setShowAddEdgeModal] = useState<'parent' | 'child' | null>(null);
  const [selectedEdgeNodeId, setSelectedEdgeNodeId] = useState('');
  const [isPrimaryEdge, setIsPrimaryEdge] = useState(true);
  const [savingEdge, setSavingEdge] = useState(false);
  const [edgeError, setEdgeError] = useState<string | null>(null);

  // --- Aliases State ---
  const [newAliasText, setNewAliasText] = useState('');
  const [newAliasLocale, setNewAliasLocale] = useState('ar');
  const [savingAlias, setSavingAlias] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);

  // --- Mappings State ---
  const [showAddMappingModal, setShowAddMappingModal] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingFormData, setMappingFormData] = useState({
    targetNodeId: '',
    sourceStandard: 'CUSTOM_NATIONAL',
    targetStandard: 'ISCED',
    strength: 'EXACT',
    confidence: 1.0,
    notes: '',
  });

  // --- Validation State ---
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [runningValidation, setRunningValidation] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      if (localReadOnly) {
        const previewNodes: AcademicTaxonomyNode[] = iscedFBaselineNodes.map((item) => ({
          ...item,
          nodeId: AcademicTaxonomyDeterministicKey.create(item),
        }));
        const previewNode = previewNodes.find((item) => item.nodeId === nodeId);
        if (!previewNode) throw new Error('Academic taxonomy node not found');
        const byId = new Map(previewNodes.map((item) => [item.nodeId, item]));
        setNode(previewNode);
        setChildren(iscedFBaselineEdges.flatMap((edge) => edge.parent === nodeId && byId.has(edge.child) ? [byId.get(edge.child)!] : []));
        setParents(iscedFBaselineEdges.flatMap((edge) => edge.child === nodeId && byId.has(edge.parent) ? [byId.get(edge.parent)!] : []));
        setAliases([]);
        setMappings([]);
        setMappedMajors([]);
        setAllNodes(previewNodes);
        setNodeFormData({
          canonicalName: previewNode.canonicalName,
          description: previewNode.description || '',
          status: previewNode.status,
          standardType: previewNode.standardType || 'CUSTOM_NATIONAL',
          standardCode: previewNode.standardCode || '',
          nameAr: previewNode.localizedNames?.ar || '',
          nameEn: previewNode.localizedNames?.en || '',
        });
        return;
      }
      const basePath = localReadOnly ? '/academic-taxonomy' : '/admin/academic-taxonomy';
      const [nodeRes, childrenRes, parentsRes] = await Promise.all([
        adminApiClient.request<AcademicTaxonomyNode>(`${basePath}/nodes/${nodeId}`),
        adminApiClient.request<{ data: AcademicTaxonomyNode[] }>(`${basePath}/nodes/${nodeId}/children`),
        adminApiClient.request<{ data: AcademicTaxonomyNode[] }>(`${basePath}/nodes/${nodeId}/parents`),
      ]);
      const [aliasesRes, mappingsRes, majorsRes, allNodesRes] = localReadOnly
        ? [
            { data: [] as AliasDto[] },
            { data: [] as MappingDto[] },
            { data: [] as MappedMajorDto[] },
            { data: [] as AcademicTaxonomyNode[] },
          ]
        : await Promise.all([
            adminApiClient.request<{ data: AliasDto[] }>(`${basePath}/nodes/${nodeId}/aliases`),
            adminApiClient.request<{ data: MappingDto[] }>(`${basePath}/nodes/${nodeId}/mappings`),
            adminApiClient.request<{ data: MappedMajorDto[] }>(`${basePath}/nodes/${nodeId}/mapped-majors`),
            adminApiClient.request<{ data: AcademicTaxonomyNode[] }>(`${basePath}/nodes?page=1&pageSize=100`),
          ]);

      setNode(nodeRes);
      setChildren(childrenRes.data || []);
      setParents(parentsRes.data || []);
      setAliases(aliasesRes.data || []);
      setMappings(mappingsRes.data || []);
      setMappedMajors(majorsRes.data || []);
      setAllNodes(allNodesRes.data || []);

      // Pre-populate edit form
      setNodeFormData({
        canonicalName: nodeRes.canonicalName,
        description: nodeRes.description || '',
        status: nodeRes.status,
        standardType: nodeRes.standardType || 'CUSTOM_NATIONAL',
        standardCode: nodeRes.standardCode || '',
        nameAr: nodeRes.localizedNames?.ar || '',
        nameEn: nodeRes.localizedNames?.en || '',
      });
    } catch (err) {
      console.error(err);
      setError(isAr 
        ? 'تعذر تحميل بيانات العقدة من واجهة البيانات.' 
        : 'Unable to load node data from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nodeId) {
      fetchDetails();
    }
  }, [nodeId]);

  // --- Run Validate Node ---
  const handleRunValidation = async () => {
    if (!node) return;
    setRunningValidation(true);
    setValidationError(null);
    try {
      const report = await adminApiClient.request<ValidationReport>('/admin/academic-taxonomy/nodes/validate', {
        method: 'POST',
        body: JSON.stringify({
          nodeType: node.nodeType,
          canonicalCode: node.canonicalCode,
          canonicalName: node.canonicalName,
          status: node.status,
          standardType: node.standardType || 'CUSTOM_NATIONAL',
          standardCode: node.standardCode || undefined,
          localizedNames: node.localizedNames,
          description: node.description,
        }),
      });
      setValidationReport(report);
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || (isAr ? 'تعذر تشغيل التحقق.' : 'Unable to run validation.'));
    } finally {
      setRunningValidation(false);
    }
  };

  // --- Edit Node Submit ---
  const handleEditNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!node) return;
    setSavingNode(true);
    setNodeFormError(null);

    const localizedNames: Record<string, string> = {};
    if (nodeFormData.nameAr) localizedNames.ar = nodeFormData.nameAr;
    if (nodeFormData.nameEn) localizedNames.en = nodeFormData.nameEn;

    try {
      const payload = {
        nodeType: node.nodeType,
        canonicalCode: node.canonicalCode, // Key is kept immutable in editing
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

      setShowEditNodeModal(false);
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      setNodeFormError(err.message || (isAr ? 'تعذر تحديث العقدة الأكاديمية.' : 'Unable to update academic node.'));
    } finally {
      setSavingNode(false);
    }
  };

  // --- Add Edge Submit ---
  const handleAddEdgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!node || !selectedEdgeNodeId) return;
    setSavingEdge(true);
    setEdgeError(null);

    const parentNodeId = showAddEdgeModal === 'parent' ? selectedEdgeNodeId : node.nodeId;
    const childNodeId = showAddEdgeModal === 'child' ? selectedEdgeNodeId : node.nodeId;

    try {
      await adminApiClient.request('/admin/academic-taxonomy/edges', {
        method: 'POST',
        body: JSON.stringify({
          parentNodeId,
          childNodeId,
          isPrimary: isPrimaryEdge,
        }),
      });

      setShowAddEdgeModal(null);
      setSelectedEdgeNodeId('');
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      setEdgeError(err.message || (isAr ? 'فشل إنشاء العلاقة الهرمية.' : 'Failed to create hierarchy edge.'));
    } finally {
      setSavingEdge(false);
    }
  };

  // --- Delete Edge ---
  const handleDeleteEdge = async (otherNodeId: string, direction: 'parent' | 'child') => {
    if (!node) return;
    const isConfirm = window.confirm(
      isAr 
        ? 'هل أنت متأكد من حذف هذه العلاقة الهرمية؟' 
        : 'Are you sure you want to delete this hierarchical connection?'
    );
    if (!isConfirm) return;

    const parentNodeId = direction === 'parent' ? otherNodeId : node.nodeId;
    const childNodeId = direction === 'child' ? otherNodeId : node.nodeId;

    try {
      await adminApiClient.request(`/admin/academic-taxonomy/edges/by-nodes?parentNodeId=${parentNodeId}&childNodeId=${childNodeId}`, {
        method: 'DELETE',
      });
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.message || (isAr ? 'فشل حذف العلاقة.' : 'Failed to delete relationship.'));
    }
  };

  // --- Add Alias Submit ---
  const handleAddAliasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!node || !newAliasText.trim()) return;
    setSavingAlias(true);
    setAliasError(null);

    try {
      await adminApiClient.request('/admin/academic-taxonomy/aliases', {
        method: 'POST',
        body: JSON.stringify({
          nodeId: node.nodeId,
          alias: newAliasText.trim(),
          locale: newAliasLocale,
        }),
      });

      setNewAliasText('');
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      setAliasError(err.message || (isAr ? 'فشل إضافة المرادف الأكاديمي.' : 'Failed to add academic alias.'));
    } finally {
      setSavingAlias(false);
    }
  };

  // --- Delete Alias ---
  const handleDeleteAlias = async (aliasId: string) => {
    const isConfirm = window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المرادف؟' : 'Are you sure you want to delete this alias?');
    if (!isConfirm) return;

    try {
      await adminApiClient.request(`/admin/academic-taxonomy/aliases/${aliasId}`, {
        method: 'DELETE',
      });
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.message || (isAr ? 'تعذر حذف المرادف.' : 'Failed to delete alias.'));
    }
  };

  // --- Add Standard Mapping Submit ---
  const handleAddMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!node || !mappingFormData.targetNodeId) return;
    setSavingMapping(true);
    setMappingError(null);

    try {
      await adminApiClient.request('/admin/academic-taxonomy/mappings', {
        method: 'POST',
        body: JSON.stringify({
          sourceNodeId: node.nodeId,
          targetNodeId: mappingFormData.targetNodeId,
          sourceStandard: mappingFormData.sourceStandard,
          targetStandard: mappingFormData.targetStandard,
          strength: mappingFormData.strength,
          confidence: Number(mappingFormData.confidence),
          notes: mappingFormData.notes.trim() || undefined,
        }),
      });

      setShowAddMappingModal(false);
      setMappingFormData({
        targetNodeId: '',
        sourceStandard: 'CUSTOM_NATIONAL',
        targetStandard: 'ISCED',
        strength: 'EXACT',
        confidence: 1.0,
        notes: '',
      });
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      setMappingError(err.message || (isAr ? 'فشل ربط المعيار.' : 'Failed to add standard mapping.'));
    } finally {
      setSavingMapping(false);
    }
  };

  // --- Delete Mapping ---
  const handleDeleteMapping = async (mappingId: string) => {
    const isConfirm = window.confirm(isAr ? 'هل تريد حذف هذا الربط المعياري؟' : 'Do you want to delete this standard mapping?');
    if (!isConfirm) return;

    try {
      await adminApiClient.request(`/admin/academic-taxonomy/mappings/${mappingId}`, {
        method: 'DELETE',
      });
      fetchDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.message || (isAr ? 'تعذر حذف الربط المعياري.' : 'Failed to delete standard mapping.'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <Link to="/academic-taxonomy" className="text-sm font-bold text-slate-700 hover:underline mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> 
          {isAr ? 'العودة إلى التصنيف الأكاديمي' : 'Back to Academic Taxonomy'}
        </Link>
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 text-center font-bold text-sm">
          {error || (isAr ? 'لم يتم العثور على عقدة التصنيف المطلوبة.' : 'Required taxonomy node not found.')}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: isAr ? 'نظرة عامة والبيانات' : 'Overview & Metadata' },
    { id: 'hierarchy', label: isAr ? 'الهيكل العلاقات' : 'Hierarchy / Edges' },
    { id: 'aliases', label: isAr ? 'المرادفات' : 'Aliases' },
    { id: 'mappings', label: isAr ? 'الربط بالمعايير العالمية' : 'Standard Mappings' },
    { id: 'majors', label: isAr ? 'التخصصات المرتبطة' : 'Mapped Majors' },
    { id: 'validation', label: isAr ? 'فحص التحقق والنزاهة' : 'Validation Report' }
  ];

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

  // Filter nodes that are not the current node to prevent self-loop edges
  const potentialEdgeNodes = allNodes.filter(n => n.nodeId !== node.nodeId);

  return (
    <div className={`max-w-5xl mx-auto space-y-6 pb-12 px-4 ${isAr ? 'rtl text-right' : 'ltr text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-4">
        <Link to="/academic-taxonomy" className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600 flex items-center justify-center border border-slate-200">
          <ArrowLeft className={`h-4 w-4 ${isAr ? 'rotate-180' : ''}`} />
        </Link>
        <div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">{isAr ? 'التصنيف الأكاديمي والدرجات' : 'Academic Taxonomy'}</span>
          <h1 className="text-xs font-bold text-slate-500 leading-none">{node.canonicalCode}</h1>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
              {node.canonicalCode}
            </span>
            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
              {translateNodeType(node.nodeType)}
            </span>
            {node.standardType && (
              <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {node.standardType}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight">{node.canonicalName}</h1>
          <p className="text-slate-400 text-xs font-bold">
            {isAr ? 'الحالة الحالية للنظام:' : 'Current system status:'}{' '}
            <span className="text-emerald-400 font-extrabold">{translateStatus(node.status)}</span>
          </p>
        </div>

        <button
          onClick={() => setShowEditNodeModal(true)}
          className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-200"
        >
          <Edit2 className="h-3.5 w-3.5" />
          {isAr ? 'تعديل بيانات العقدة' : 'Edit Node Details'}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto scrollbar-none pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id 
                ? 'border-emerald-600 text-emerald-800' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        
        {/* PANEL: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? 'الاسم المعتمد الرئيسي' : 'Canonical Name'}</h3>
                <div className="text-sm font-bold text-slate-950">{node.canonicalName}</div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? 'الرمز المعتمد' : 'Canonical Code'}</h3>
                <div className="text-sm font-mono font-bold text-slate-900">{node.canonicalCode}</div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? 'نوع العقدة' : 'Node Type'}</h3>
                <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200/60">
                  {translateNodeType(node.nodeType)}
                </span>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? 'الحالة' : 'Status'}</h3>
                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                  node.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                  node.status === 'DRAFT' ? 'bg-slate-50 text-slate-600 border border-slate-200' :
                  node.status === 'READY_TO_REVIEW' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {translateStatus(node.status)}
                </span>
              </div>
              {node.standardType && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? 'نوع المعيار المرجعي' : 'Standard Type'}</h3>
                  <div className="text-sm font-semibold text-slate-900">{node.standardType}</div>
                </div>
              )}
              {node.standardCode && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isAr ? 'رمز المعيار المرجعي' : 'Standard Code'}</h3>
                  <div className="text-sm font-mono font-bold text-slate-900">{node.standardCode}</div>
                </div>
              )}
            </div>

            {node.description && (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{isAr ? 'الوصف والتفاصيل' : 'Description'}</h3>
                <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl leading-relaxed border border-slate-100">{node.description}</p>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{isAr ? 'الترجمات والأسماء المحلية (localizedNames)' : 'Localized Translations'}</h3>
              {node.localizedNames && Object.keys(node.localizedNames).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(node.localizedNames).map(([locale, name]) => (
                    <div key={locale} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">{locale}</span>
                        <span className="text-xs font-bold text-slate-900">{name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-medium bg-slate-50/50 p-4 rounded-xl border border-dashed">
                  {isAr ? 'لم يتم تعريف أي ترجمات بديلة.' : 'No localized translations defined.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL: HIERARCHY / EDGES */}
        {activeTab === 'hierarchy' && (
          <div className="space-y-8">
            {/* Parents Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Network className="h-4 w-4 text-slate-400" />
                  {isAr ? 'الآباء (Parent Connections)' : 'Parents'}
                </h3>
                <button
                  onClick={() => setShowAddEdgeModal('parent')}
                  className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  {isAr ? 'ربط عقدة أب' : 'Add Parent'}
                </button>
              </div>

              {parents.length === 0 ? (
                <div className="text-slate-500 text-xs bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                  {isAr ? 'لا يوجد أي عقد أب مرتبطة بها.' : 'No parent connections exist.'}
                </div>
              ) : (
                <div className="grid gap-3">
                  {parents.map(parent => (
                    <div key={parent.nodeId} className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <Box className="h-4 w-4 text-slate-400" />
                        <div>
                          <Link to={`/academic-taxonomy/${parent.nodeId}`} className="font-bold text-slate-950 text-xs hover:underline">
                            {parent.canonicalName}
                          </Link>
                          <div className="text-[10px] text-slate-500 font-mono">{parent.canonicalCode}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {translateNodeType(parent.nodeType)}
                        </span>
                        <button
                          onClick={() => handleDeleteEdge(parent.nodeId, 'parent')}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Children Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Network className="h-4 w-4 text-slate-400" />
                  {isAr ? 'الأبناء (Child Connections)' : 'Children'}
                </h3>
                <button
                  onClick={() => setShowAddEdgeModal('child')}
                  className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  {isAr ? 'ربط عقدة ابن' : 'Add Child'}
                </button>
              </div>

              {children.length === 0 ? (
                <div className="text-slate-500 text-xs bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                  {isAr ? 'لا يوجد أي عقد أبناء مرتبطة بها.' : 'No child connections exist.'}
                </div>
              ) : (
                <div className="grid gap-3">
                  {children.map(child => (
                    <div key={child.nodeId} className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <Box className="h-4 w-4 text-slate-400" />
                        <div>
                          <Link to={`/academic-taxonomy/${child.nodeId}`} className="font-bold text-slate-950 text-xs hover:underline">
                            {child.canonicalName}
                          </Link>
                          <div className="text-[10px] text-slate-500 font-mono">{child.canonicalCode}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {translateNodeType(child.nodeType)}
                        </span>
                        <button
                          onClick={() => handleDeleteEdge(child.nodeId, 'child')}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL: ALIASES */}
        {activeTab === 'aliases' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-slate-400" />
              {isAr ? 'مرادفات ومسميات بديلة (Aliases)' : 'Aliases'}
            </h3>

            {/* Quick Add Alias */}
            <form onSubmit={handleAddAliasSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {isAr ? 'المرادف / المسمى البديل' : 'Alias Text'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: علم الحاسوب والتقنية' : 'e.g. CS & Technologies'}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={newAliasText}
                  onChange={(e) => setNewAliasText(e.target.value)}
                />
              </div>

              <div className="w-full sm:w-32">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {isAr ? 'اللغة / الكود' : 'Locale'}
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:outline-none"
                  value={newAliasLocale}
                  onChange={(e) => setNewAliasLocale(e.target.value)}
                >
                  <option value="ar">{isAr ? 'العربية' : 'Arabic'}</option>
                  <option value="en">English</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingAlias}
                className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0"
              >
                {savingAlias ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {isAr ? 'إضافة مرادف' : 'Add Alias'}
              </button>
            </form>

            {aliasError && (
              <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                {aliasError}
              </div>
            )}

            {/* List */}
            {aliases.length === 0 ? (
              <div className="text-slate-500 text-xs bg-slate-50/50 p-6 rounded-xl border border-dashed text-center">
                {isAr ? 'لم يتم إضافة مرادفات لهذه العقدة الأكاديمية حتى الآن.' : 'No aliases registered for this node.'}
              </div>
            ) : (
              <div className="grid gap-3">
                {aliases.map(alias => (
                  <div key={alias.aliasId} className="flex justify-between items-center bg-white p-3 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <span className="font-bold text-slate-900 text-xs">{alias.alias}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {alias.locale}
                      </span>
                      <button
                        onClick={() => handleDeleteAlias(alias.aliasId)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PANEL: MAPPINGS */}
        {activeTab === 'mappings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="h-4 w-4 text-slate-400" />
                {isAr ? 'الربط بالمعايير العالمية (Standard Mappings)' : 'Standard Mappings'}
              </h3>
              <button
                onClick={() => setShowAddMappingModal(true)}
                className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                {isAr ? 'إنشاء ربط معياري' : 'Add Mapping'}
              </button>
            </div>

            {mappings.length === 0 ? (
              <div className="text-slate-500 text-xs bg-slate-50 p-6 rounded-xl border border-dashed text-center">
                {isAr ? 'لا يوجد روابط معايير مسجلة.' : 'No standard mappings registered for this node.'}
              </div>
            ) : (
              <div className="grid gap-4">
                {mappings.map(map => (
                  <div key={map.mappingId} className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {map.sourceStandard} ➔ {map.targetStandard}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {map.strength}
                        </span>
                        {map.confidence !== undefined && (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            {isAr ? 'ثقة:' : 'Confidence:'} {Math.round(map.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {isAr ? 'الهدف المربوط به:' : 'Target Node:'}{' '}
                        {map.targetNode ? `${map.targetNode.canonicalName} (${map.targetNode.canonicalCode})` : map.targetNodeId}
                      </div>
                      {map.notes && (
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          {isAr ? 'ملاحظات:' : 'Notes:'} {map.notes}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteMapping(map.mappingId)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl transition-all border border-transparent hover:border-red-100 self-end sm:self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PANEL: RELATED MAJORS */}
        {activeTab === 'majors' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              {isAr ? 'التخصصات الجامعية المربوطة بهذه العقدة' : 'Mapped College Majors'}
            </h3>

            {mappedMajors.length === 0 ? (
              <div className="text-slate-500 text-xs bg-slate-50 p-6 rounded-xl border border-dashed text-center">
                {isAr ? 'لم يربط أي تخصص علمي أو بروفايل مستوى بهذه العقدة بعد.' : 'No college majors or profile levels are mapped to this node yet.'}
              </div>
            ) : (
              <div className="grid gap-3">
                {mappedMajors.map(mapping => (
                  <div key={mapping.id} className="bg-white p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                        {mapping.relationshipType}
                      </span>
                      <div className="text-xs font-bold text-slate-900">
                        {mapping.major?.canonicalName || (isAr ? 'تخصص رئيسي' : 'Major')}
                      </div>
                      {mapping.profile && (
                        <div className="text-[10px] text-slate-500 font-medium">
                          {mapping.profile.displayName} ({mapping.profile.level})
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PANEL: VALIDATION */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                {isAr ? 'فحص جودة ونزاهة العقدة' : 'Node Integrity & Validation'}
              </h3>
              <button
                onClick={handleRunValidation}
                disabled={runningValidation}
                className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold text-[10px] px-3 py-2 rounded-lg flex items-center gap-1"
              >
                {runningValidation ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {isAr ? 'تشغيل فحص النزاهة' : 'Run Quality Checks'}
              </button>
            </div>

            {validationError && (
              <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                {validationError}
              </div>
            )}

            {!validationReport && !runningValidation && (
              <div className="text-slate-500 text-xs bg-slate-50 p-6 rounded-xl border border-dashed text-center">
                {isAr 
                  ? 'انقر على الزر بالأعلى لتشغيل فحص النزاهة والتحقق من صحة العقدة الأكاديمية (مثل كود ISCED، العلاقات المزدوجة، وغيرها).' 
                  : 'Click the button above to run real-time schema validation (including ISCED compliance, circular dependency checks, and metadata integrity).'}
              </div>
            )}

            {validationReport && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
                  validationReport.isValid 
                    ? 'bg-green-50/50 text-green-900 border-green-200' 
                    : 'bg-red-50/50 text-red-900 border-red-200'
                }`}>
                  {validationReport.isValid ? (
                    <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-xs">
                      {isAr ? 'حالة التقييم:' : 'Check Status:'}{' '}
                      {validationReport.isValid ? (isAr ? 'سليم ومتوافق' : 'PASSED') : (isAr ? 'يوجد ثغرات أو تحذيرات' : 'ISSUES DETECTED')}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {isAr 
                        ? `تم العثور على عدد ${validationReport.issues.length} ملاحظة.` 
                        : `Identified ${validationReport.issues.length} report signals.`}
                    </p>
                  </div>
                </div>

                {validationReport.issues.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                    {validationReport.issues.map((issue, idx) => (
                      <div key={idx} className="p-4 flex gap-3 text-xs items-start bg-white hover:bg-slate-50/50 transition-all">
                        <AlertTriangle className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${
                          issue.severity === 'ERROR' ? 'text-red-500' :
                          issue.severity === 'WARNING' ? 'text-amber-500' :
                          'text-blue-500'
                        }`} />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              issue.severity === 'ERROR' ? 'bg-red-50 text-red-700' :
                              issue.severity === 'WARNING' ? 'bg-amber-50 text-amber-750' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 font-bold">{issue.code}</span>
                          </div>
                          <p className="font-bold text-slate-900">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL: EDIT TAXONOMY NODE --- */}
      {showEditNodeModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-950">
                {isAr ? 'تعديل بيانات عقدة التصنيف الأكاديمي' : 'Edit Academic Taxonomy Node'}
              </h2>
              <button
                onClick={() => setShowEditNodeModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <XCircle className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleEditNodeSubmit} className="p-6 space-y-4">
              {nodeFormError && (
                <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {nodeFormError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    {isAr ? 'نوع العقدة (غير قابل للتعديل)' : 'Node Type (Locked)'}
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-100 text-slate-500 cursor-not-allowed"
                    value={translateNodeType(node.nodeType)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                    {isAr ? 'الرمز المعتمد (غير قابل للتعديل)' : 'Canonical Code (Locked)'}
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-slate-100 text-slate-500 cursor-not-allowed"
                    value={node.canonicalCode}
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
                    <option value="CUSTOM_NATIONAL">CUSTOM_NATIONAL</option>
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
                  {isAr ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={nodeFormData.description}
                  onChange={(e) => setNodeFormData(d => ({ ...d, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditNodeModal(false)}
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
                  {isAr ? 'تحديث البيانات' : 'Update Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD parent/child EDGE --- */}
      {showAddEdgeModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-950">
                {showAddEdgeModal === 'parent' 
                  ? (isAr ? 'ربط عقدة أب جديدة' : 'Add New Parent Node')
                  : (isAr ? 'ربط عقدة ابن جديدة' : 'Add New Child Node')
                }
              </h2>
              <button
                onClick={() => setShowAddEdgeModal(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <XCircle className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddEdgeSubmit} className="p-6 space-y-4">
              {edgeError && (
                <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {edgeError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'اختر عقدة للربط بها' : 'Select Target Node'} *
                </label>
                <select
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={selectedEdgeNodeId}
                  onChange={(e) => setSelectedEdgeNodeId(e.target.value)}
                >
                  <option value="">{isAr ? '-- اختر العقدة من القائمة --' : '-- Select from list --'}</option>
                  {potentialEdgeNodes.map(n => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.canonicalName} ({n.canonicalCode} - {translateNodeType(n.nodeType)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryEdgeChk"
                  className="h-4 w-4 text-slate-900 border-slate-200 rounded-md focus:ring-[#0E7C86]"
                  checked={isPrimaryEdge}
                  onChange={(e) => setIsPrimaryEdge(e.target.checked)}
                />
                <label htmlFor="primaryEdgeChk" className="text-xs font-semibold text-slate-700">
                  {isAr ? 'علاقة رئيسية هرمية (isPrimary)' : 'Primary Hierarchy Connection (isPrimary)'}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEdgeModal(null)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingEdge}
                  className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2"
                >
                  {savingEdge ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isAr ? 'إنشاء العلاقة' : 'Create Edge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD STANDARD MAPPING --- */}
      {showAddMappingModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-950">
                {isAr ? 'إضافة ربط معيار عالمي جديد' : 'Add Standard Mapping Connection'}
              </h2>
              <button
                onClick={() => setShowAddMappingModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <XCircle className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddMappingSubmit} className="p-6 space-y-4">
              {mappingError && (
                <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {mappingError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'عقدة الهدف المراد ربطها' : 'Target Taxonomy Node'} *
                </label>
                <select
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={mappingFormData.targetNodeId}
                  onChange={(e) => setMappingFormData(d => ({ ...d, targetNodeId: e.target.value }))}
                >
                  <option value="">{isAr ? '-- اختر العقدة من القائمة --' : '-- Select target node --'}</option>
                  {potentialEdgeNodes.map(n => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.canonicalName} ({n.canonicalCode} - {translateNodeType(n.nodeType)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'معيار المصدر' : 'Source Standard'}
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={mappingFormData.sourceStandard}
                    onChange={(e) => setMappingFormData(d => ({ ...d, sourceStandard: e.target.value }))}
                  >
                    <option value="CUSTOM_NATIONAL">CUSTOM_NATIONAL</option>
                    <option value="ISCED">ISCED</option>
                    <option value="CIP">CIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'معيار الهدف' : 'Target Standard'}
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={mappingFormData.targetStandard}
                    onChange={(e) => setMappingFormData(d => ({ ...d, targetStandard: e.target.value }))}
                  >
                    <option value="ISCED">ISCED</option>
                    <option value="CIP">CIP</option>
                    <option value="CUSTOM_NATIONAL">CUSTOM_NATIONAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'درجة مطابقة القوة (Strength)' : 'Strength'}
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={mappingFormData.strength}
                    onChange={(e) => setMappingFormData(d => ({ ...d, strength: e.target.value }))}
                  >
                    <option value="EXACT">EXACT</option>
                    <option value="BROAD">BROAD</option>
                    <option value="NARROW">NARROW</option>
                    <option value="RELATED">RELATED</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isAr ? 'معدل الثقة (Confidence 0.0 - 1.0)' : 'Confidence (0.0 - 1.0)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                    value={mappingFormData.confidence}
                    onChange={(e) => setMappingFormData(d => ({ ...d, confidence: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'ملاحظات الربط' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'ملاحظات إضافية بخصوص الربط...' : 'Add context/reasons for mapping...'}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]"
                  value={mappingFormData.notes}
                  onChange={(e) => setMappingFormData(d => ({ ...d, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMappingModal(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingMapping}
                  className="bg-[#142B5F] hover:bg-[#0E7C86] text-white font-bold px-5 py-2 rounded-xl text-xs transition-all flex items-center gap-2"
                >
                  {savingMapping ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isAr ? 'إضافة الربط' : 'Add Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
