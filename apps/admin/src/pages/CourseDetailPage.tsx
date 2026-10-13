import {useCourseNavigationGuard} from './useCourseNavigationGuard';
import {rebaseCourseDraft,chooseCourseConflict,editableCourseFields,courseEditorPatchPayload,type CourseFieldConflict} from './courseEditorState';
import {CourseAdmissionsPanel} from '../components/CourseAdmissionsPanel';
import {CourseSourceApprovalPanel} from '../components/CourseSourceApprovalPanel';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApiClient, setCourseReviewReason } from '../api/client';
import {
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Layers,
  Loader2,
  Plus,
  Save,
  XCircle,
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import { AssessmentReviewPanel } from '../components/AssessmentReviewPanel';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { AssetPicker } from '../components/AssetPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';

interface CourseDetail {
  version: number;
  updatedAt?:string;
  id: string;
  displayName: string;
  status: string;
  completenessStatus: string;
  accessType: string;
  originType: string;
  directCourseUrl: string;
  platformName?: string;
  providerName?: string;
  learningLanguage?: string;
  studyDuration?: string;
  certificateAvailable?: boolean;
  category?: string;
  thumbnailAssetId?: string;
  optionalFields?: Record<string, unknown>;
  difficultyLevel?: string;
  courseContent?: string;
  description?: string;
  instructor?: string;
  learningOutcomes?: string[];
  prerequisites?: string[];
  targetAudience?: string[];
  acquiredSkills?: string[];
}

interface CourseModule {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  status: string;
}

interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  summary?: string | null;
  lessonType: string;
  position: number;
  contentText?: string | null;
  estimatedDurationMinutes?: number | null;
  status: string;
}

interface LessonAsset {
  id: string;
  lessonId: string;
  assetId: string;
  assetType: string;
  title?: string | null;
  position: number;
}

interface CourseQuiz {
  id: string;
  title: string;
  moduleId?: string | null;
  lessonId?: string | null;
  position: number;
  passingScore?: number | null;
  status: string;
}

interface CourseQuestion {
  id: string;
  quizId?: string | null;
  questionType: string;
  prompt: string;
  position: number;
  points: number;
}

interface CourseRelationshipReview {
  courseId: string;
  source: {
    shortCourseTopicsRaw?: string | null;
    learningLanguageRaw?: string | null;
    learningLanguageReferenceId?: string | null;
    learningLanguageResolutionState: string;
  };
  taxonomyLinks: Array<{
    id: string;
    taxonomyNodeId: string;
    sourceTerm: string;
    relationshipType: string;
    reviewState: string;
  }>;
  majorProjections: Array<{
    id: string;
    majorId: string;
    relationshipType: string;
    projectionState: string;
  }>;
  closure: {
    languageCanonical: boolean;
    approvedTaxonomyLinks: number;
    approvedMajorProjections: number;
    reviewRequired: boolean;
  };
}

interface CurriculumSnapshot {
  modules: CourseModule[];
  lessons: CourseLesson[];
  assets: LessonAsset[];
  quizzes: CourseQuiz[];
  questionBanks: unknown[];
  questions: CourseQuestion[];
}

export function CourseDetailPage() {
  const { t , dir} = useTranslation();
 const levelLabel=(value:string)=>{const key=({'مبتدئ':'course13_level_beginner','متوسط':'course13_level_intermediate','متقدم':'course13_level_advanced','جميع المستويات':'course13_level_all','غير محدد رسميًا':'course13_level_unknown'} as const)[value as 'مبتدئ'];return key?t(key):value;};
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reviewReason,setReviewReason]=useState('');
  useEffect(()=>{
    if(!id) return;
    setCourseReviewReason(id,reviewReason);
    return ()=>setCourseReviewReason(id,'');
  },[id,reviewReason]);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [snapshot, setSnapshot] = useState<CurriculumSnapshot | null>(null);
  const [relationships, setRelationships] = useState<CourseRelationshipReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CourseDetail>>({});
  const [readiness, setReadiness] = useState<{
    ready: boolean;
    percentage: number;
    checks: Array<{ key: string; label: string; state: string; message?: string }>;
  } | null>(null);
  const [financialClearance, setFinancialClearance] = useState(false);
  const [policyData, setPolicyData] = useState<Record<string, unknown> | null>(null);
  const [savedForm, setSavedForm] = useState('');
  const [draftVersion,setDraftVersion]=useState<number|null>(null);
  const [conflict,setConflict]=useState<{latest:CourseDetail;draft:Record<string,unknown>;fields:CourseFieldConflict[];chosen:Record<string,boolean>}|null>(null);
  const [editorOpen,setEditorOpen]=useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [moduleDraft, setModuleDraft] = useState({ title: '', description: '', position: 1 });
  const [lessonDraft, setLessonDraft] = useState({
    moduleId: '',
    title: '',
    lessonType: 'VIDEO',
    position: 1,
    estimatedDurationMinutes: '',
    summary: '',
    contentText: '',
  });
  const [assetDraft, setAssetDraft] = useState({
    lessonId: '',
    assetId: '',
    assetType: 'VIDEO',
    title: '',
    position: 1,
  });
  const courseAssetMimePrefix: Record<string, string | undefined> = {
    VIDEO: 'video/',
    IMAGE: 'image/',
    PDF: 'application/pdf',
    DOCUMENT: 'application/',
    AUDIO: 'audio/',
    SUBTITLE: 'text/',
    OTHER: undefined,
  };
  const [quizDraft, setQuizDraft] = useState({
    assessmentType: 'QUIZ',
    moduleId: '',
    lessonId: '',
    title: '',
    position: 1,
    passingScore: '70',
  });
  const [questionDraft, setQuestionDraft] = useState({
    quizId: '',
    questionType: 'MULTIPLE_CHOICE',
    prompt: '',
    choices: '["Option A","Option B"]',
    correctAnswer: '"Option A"',
    position: 1,
    points: 1,
  });

  const hasUnsavedChanges = !!savedForm && (JSON.stringify(formData)!==savedForm || !!editingLesson || (!!moduleDraft.title||!!moduleDraft.description) || (!!lessonDraft.title||!!lessonDraft.summary||!!lessonDraft.contentText||!!lessonDraft.estimatedDurationMinutes) || !!assetDraft.assetId || !!quizDraft.title || !!questionDraft.prompt || financialClearance!==(policyData?.requiresFinancialClearance===true));
  useCourseNavigationGuard(hasUnsavedChanges,()=>window.confirm(t('course13_copy_000')));
  useEffect(()=>{if(!hasUnsavedChanges)return;const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};const navigateAway=(event:MouseEvent)=>{const anchor=(event.target as Element|null)?.closest?.('a[href]');if(anchor && !window.confirm(t('course13_copy_000'))){event.preventDefault();event.stopPropagation();}};window.addEventListener('beforeunload',unload);document.addEventListener('click',navigateAway,true);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigateAway,true);};},[hasUnsavedChanges]);

  const isExternalLinkedCourse = course?.originType === 'EXTERNAL_LINKED_COURSE';

  const lessonsByModule = useMemo(() => {
    const grouped: Record<string, CourseLesson[]> = {};
    for (const lesson of snapshot?.lessons || []) {
      grouped[lesson.moduleId] = grouped[lesson.moduleId] || [];
      grouped[lesson.moduleId].push(lesson);
    }
    return grouped;
  }, [snapshot]);

  const assetsByLesson = useMemo(() => {
    const grouped: Record<string, LessonAsset[]> = {};
    for (const asset of snapshot?.assets || []) {
      grouped[asset.lessonId] = grouped[asset.lessonId] || [];
      grouped[asset.lessonId].push(asset);
    }
    return grouped;
  }, [snapshot]);

  const questionsByQuiz = useMemo(() => {
    const grouped: Record<string, CourseQuestion[]> = {};
    for (const question of snapshot?.questions || []) {
      if (!question.quizId) continue;
      grouped[question.quizId] = grouped[question.quizId] || [];
      grouped[question.quizId].push(question);
    }
    return grouped;
  }, [snapshot]);

  const fetchCourse = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const courseResponse = await adminApiClient.request<CourseDetail>(`/admin/courses/${id}`);
      const optional = courseResponse.optionalFields ?? {};
      for (const key of ['description', 'courseContent', 'instructor'] as const)
        if (typeof optional[key] === 'string') courseResponse[key] = optional[key];
      for (const key of [
        'learningOutcomes',
        'acquiredSkills',
        'prerequisites',
        'targetAudience',
      ] as const)
        if (Array.isArray(optional[key]))
          courseResponse[key] = optional[key].filter(
            (value): value is string => typeof value === 'string',
          );
      setCourse(courseResponse);
      adminApiClient
        .request<CourseRelationshipReview>(`/admin/courses/${id}/relationships`)
        .then(setRelationships)
        .catch(() => setRelationships(null));
      const editable=editableCourseFields(courseResponse as unknown as Record<string,unknown>) as Partial<CourseDetail>;
      setFormData(editable);
      setSavedForm(JSON.stringify(editable));setDraftVersion(courseResponse.version);

      if (courseResponse.originType !== 'EXTERNAL_LINKED_COURSE' && editorOpen) {
        const curriculumResponse = await adminApiClient.request<CurriculumSnapshot>(
          `/admin/courses/${id}/curriculum`,
        );
        setSnapshot(curriculumResponse);
        adminApiClient
          .request<typeof readiness>(`/admin/courses/${id}/readiness`)
          .then(setReadiness)
          .catch(() => setReadiness(null));
        adminApiClient
          .request<Record<string, unknown> | null>(`/admin/courses/${id}/enrollment-policy`)
          .then((policy) => {
            setPolicyData(policy);
            setFinancialClearance(policy?.requiresFinancialClearance === true);
          })
          .catch(() => setPolicyData(null));
        setModuleDraft((value) => ({ ...value, position: curriculumResponse.modules.length + 1 }));
      } else {
        setSnapshot(null);
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const refreshCurriculum = async () => {
    if (!id || isExternalLinkedCourse) return;
    const curriculumResponse = await adminApiClient.request<CurriculumSnapshot>(
      `/admin/courses/${id}/curriculum`,
    );
    setSnapshot(curriculumResponse);
    const policy=await adminApiClient.request<Record<string,unknown>|null>(`/admin/courses/${id}/enrollment-policy`);
    const pendingFinancial=financialClearance!==(policyData?.requiresFinancialClearance===true);
    setPolicyData(policy);if(!pendingFinancial)setFinancialClearance(policy?.requiresFinancialClearance===true);
    setModuleDraft(value=>({...value,position:curriculumResponse.modules.length+1}));
    const latest=await adminApiClient.request<CourseDetail>(`/admin/courses/${id}`);
    setCourse(latest);
    if(JSON.stringify(formData)===savedForm){const clean=editableCourseFields(latest as unknown as Record<string,unknown>) as Partial<CourseDetail>;setFormData(clean);setSavedForm(JSON.stringify(clean));setDraftVersion(latest.version);}
    setReadiness(await adminApiClient.request<typeof readiness>(`/admin/courses/${id}/readiness`));
  };

  const recoverConflict=async()=>{if(!id||saving)return;setSaving(true);try{const latest=await adminApiClient.request<CourseDetail>(`/admin/courses/${id}`);const result=rebaseCourseDraft(JSON.parse(savedForm),formData as Record<string,unknown>,editableCourseFields(latest as unknown as Record<string,unknown>));setConflict({latest,draft:result.draft,fields:result.conflicts,chosen:{}});}catch(cause){setError(cause instanceof Error?cause.message:'COURSE_CONFLICT_RECOVERY_FAILED');}finally{setSaving(false);}};
  useEffect(()=>{if(editorOpen&&course&&course.originType!=='EXTERNAL_LINKED_COURSE')void refreshCurriculum().catch(cause=>setError(String(cause)));},[editorOpen,course?.id]);
  const handleSaveCourse = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { directCourseUrl: _sourceOwnedUrl, ...editableFields } = formData;
      const saved=await adminApiClient.request<CourseDetail&{_owner?:{version:number}}>(`/admin/courses/${id}`, {
        method: 'PATCH',
        headers:{'If-Match':`"${draftVersion??course?.version}"`},
        body: JSON.stringify(courseEditorPatchPayload(formData as Record<string,unknown>,isExternalLinkedCourse,JSON.parse(savedForm))),
      });
      setCourse(await adminApiClient.request<CourseDetail>(`/admin/courses/${id}`));
      setSavedForm(JSON.stringify(formData));setDraftVersion(saved._owner?.version??saved.version);
      setReadiness(null);
      if(!isExternalLinkedCourse) setReadiness(await adminApiClient.request<typeof readiness>(`/admin/courses/${id}/readiness`));
      setSuccessMsg(t('course13_copy_001'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (endpoint: string, actionName: string) => {
    if (!id) return;
    if (
      JSON.stringify(formData) !== savedForm ||
      editingLesson ||
      moduleDraft.title ||
      lessonDraft.title ||
      assetDraft.assetId ||
      quizDraft.title ||
      questionDraft.prompt ||
      financialClearance !== (policyData?.requiresFinancialClearance === true)
    ) {
      setError(t('course13_copy_002'));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApiClient.request(`/admin/courses/${id}/${endpoint}`, { method: 'POST' });
      if(await fetchCourse()) setSuccessMsg(t('course13_action_success')+': '+actionName);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const mutateCurriculum = async (operation: () => Promise<void>) => {
    if (saving) return;
    if(JSON.stringify(formData)!==savedForm){setError(t('course13_save_metadata_first'));return;}
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await operation();
      setSuccessMsg(t('course13_copy_003'));
    } catch (error) {
      setError(error instanceof Error ? error.message : t('course13_copy_004'));
    } finally {
      setSaving(false);
    }
  };
  const manageStructure = async (kind: 'modules'|'lessons', rowId: string, action: 'edit'|'delete'|'up'|'down', parentId?: string) => {
    if (!id || !snapshot || saving || course?.status === 'PUBLISHED' || course?.status === 'ARCHIVED') return;
    if (JSON.stringify(formData) !== savedForm || editingLesson) {setError(t('course13_copy_005')); return;}
    const rows = kind === 'modules' ? snapshot.modules : (lessonsByModule[parentId ?? ''] ?? []);
    const ordered = [...rows].sort((a,b) => a.position-b.position || a.id.localeCompare(b.id));
    const index = ordered.findIndex(row => row.id === rowId);
    await mutateCurriculum(async () => {
      if (action === 'edit') {
        const title = window.prompt(t('course13_copy_006'), ordered[index]?.title);
        if (!title?.trim()) return;
        const description = window.prompt(t('course13_copy_007'), (ordered[index] as CourseModule)?.description ?? '');
        if (description === null) return;
        await adminApiClient.request(`/admin/courses/${id}/modules/${rowId}`, {method: 'PATCH', body: JSON.stringify({title: title.trim(), description})});
      } else if (action === 'delete') {
        if (!window.confirm(t('course13_copy_008'))) return;
        await adminApiClient.request(`/admin/courses/${id}/${kind}/${rowId}`, {method: 'DELETE'});
      } else {
        const target = index + (action === 'up' ? -1 : 1);
        if (index < 0 || target < 0 || target >= ordered.length) return;
        [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
        const endpoint = kind === 'modules' ? `modules/reorder` : `modules/${parentId}/lessons/reorder`;
        await adminApiClient.request(`/admin/courses/${id}/${endpoint}`, {method: 'PUT', body: JSON.stringify({positions: ordered.map((row, position) => ({id: row.id, position: position+1}))})});
      }
      await refreshCurriculum();
    });
  };
  const saveLesson = async () => {
    if (!id || !editingLesson) return;
    await adminApiClient.request(`/admin/courses/${id}/lessons/${editingLesson.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: editingLesson.title,
        summary: editingLesson.summary,
        contentText: editingLesson.contentText,
        lessonType: editingLesson.lessonType,
        estimatedDurationMinutes: editingLesson.estimatedDurationMinutes,
      }),
    });
    await refreshCurriculum();
    setEditingLesson(null);
  };

  const createModule = async () => {
    if (!id) return;
    await adminApiClient.request(`/admin/courses/${id}/modules`, {
      method: 'POST',
      body: JSON.stringify(moduleDraft),
    });
    setModuleDraft({ title: '', description: '', position: (snapshot?.modules.length || 0) + 2 });
    await refreshCurriculum();
  };

  const createLesson = async () => {
    if (!id || !lessonDraft.moduleId) return;
    await adminApiClient.request(`/admin/courses/${id}/modules/${lessonDraft.moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify({
        ...lessonDraft,
        estimatedDurationMinutes: lessonDraft.estimatedDurationMinutes
          ? Number(lessonDraft.estimatedDurationMinutes)
          : undefined,
      }),
    });
    setLessonDraft({
      moduleId: lessonDraft.moduleId,
      title: '',
      lessonType: 'VIDEO',
      position: lessonDraft.position + 1,
      estimatedDurationMinutes: '',
      summary: '',
      contentText: '',
    });
    await refreshCurriculum();
  };

  const attachAsset = async () => {
    if (!id || !assetDraft.lessonId) return;
    await adminApiClient.request(`/admin/courses/${id}/lessons/${assetDraft.lessonId}/assets`, {
      method: 'POST',
      body: JSON.stringify(assetDraft),
    });
    setAssetDraft({
      lessonId: assetDraft.lessonId,
      assetId: '',
      assetType: 'VIDEO',
      title: '',
      position: assetDraft.position + 1,
    });
    await refreshCurriculum();
  };

  const createQuiz = async () => {
    if (!id) return;
    await adminApiClient.request(`/admin/courses/${id}/quizzes`, {
      method: 'POST',
      body: JSON.stringify({
        ...quizDraft,
        moduleId: quizDraft.moduleId || undefined,
        lessonId: quizDraft.lessonId || undefined,
        passingScore: quizDraft.passingScore ? Number(quizDraft.passingScore) : undefined,
      }),
    });
    setQuizDraft({
      assessmentType: quizDraft.assessmentType,
      moduleId: quizDraft.moduleId,
      lessonId: quizDraft.lessonId,
      title: '',
      position: quizDraft.position + 1,
      passingScore: '70',
    });
    await refreshCurriculum();
  };

  const createQuestion = async () => {
    if (!id || !questionDraft.quizId) return;
    const manual = ['ESSAY', 'SHORT_ANSWER'].includes(questionDraft.questionType);
    const choices = !manual && questionDraft.choices ? JSON.parse(questionDraft.choices) : undefined;
    const correctAnswer = !manual && questionDraft.correctAnswer
      ? JSON.parse(questionDraft.correctAnswer)
      : undefined;
    await adminApiClient.request(`/admin/courses/${id}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        ...questionDraft,
        choices,
        correctAnswer,
      }),
    });
    setQuestionDraft({ ...questionDraft, prompt: '', position: questionDraft.position + 1 });
    await refreshCurriculum();
  };

  const refreshRelationships = async () => {
    if (!id) return;
    setRelationships(
      await adminApiClient.request<CourseRelationshipReview>(`/admin/courses/${id}/relationships`),
    );
  };

  const analyzeRelationships = async () => {
    if (!id) return;
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApiClient.request(`/admin/courses/${id}/relationships/analyze`, {
        method: 'POST',
      });
      await refreshRelationships();
      setSuccessMsg(t('course13_copy_009'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const approveLanguage = async (languageReferenceId: string | null) => {
    if (!id || !languageReferenceId) return;
    setSaving(true);
    setError(null);
    try {
      await adminApiClient.request(`/admin/courses/${id}/relationships/language`, {
        method: 'POST',
        body: JSON.stringify({ languageReferenceId }),
      });
      await refreshRelationships();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const reviewTaxonomy = async (linkId: string, decision: 'approve' | 'reject') => {
    if (!id) return;
    await adminApiClient.request(
      `/admin/courses/${id}/relationships/taxonomy/${linkId}/${decision}`,
      { method: 'POST' },
    );
    await refreshRelationships();
  };

  const projectMajors = async () => {
    if (!id) return;
    await adminApiClient.request(`/admin/courses/${id}/relationships/majors/project`, {
      method: 'POST',
    });
    await refreshRelationships();
  };

  const reviewMajorProjection = async (projectionId: string, decision: 'approve' | 'reject') => {
    if (!id) return;
    await adminApiClient.request(
      `/admin/courses/${id}/relationships/majors/${projectionId}/${decision}`,
      { method: 'POST' },
    );
    await refreshRelationships();
  };

  if (loading && !course) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!course) {
    return <div className="text-red-500">{t('failed_to_load_course_details')}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <p className="text-xs">{t('course13_copy_010')}{course.version} · {course.updatedAt??''}</p>
      <p role="note">{t('course13_copy_011')}</p>
      {typeof course.optionalFields?.titleEn==='string'&&<input readOnly dir="ltr" value={course.optionalFields.titleEn} aria-label={t('course13_translation_readonly')}/>}
      {!!policyData?.eligibilityRules&&Object.keys(policyData.eligibilityRules as object).length>0&&<p role="alert">{t('course13_eligibility_disabled')}<button onClick={()=>setPolicyData({...policyData,eligibilityRules:null})}>{t('course13_eligibility_clear')}</button></p>}
      {error?.includes('[409]')&&<button disabled={saving} onClick={()=>void recoverConflict()}>{t('course13_copy_012')}</button>}
      {conflict&&<section className="rounded border p-4 space-y-2"><h2>{t('course13_copy_013')}</h2><p>{t('course13_copy_014')}{conflict.latest.version}</p>{conflict.fields.map(field=>{const key=field.path.join('.');return <div key={key}><strong>{key}</strong><pre className="whitespace-pre-wrap">{JSON.stringify({original:field.base,yourChange:field.local,serverChange:field.server},null,2)}</pre>{(['local','server'] as const).map(choice=><button key={choice} onClick={()=>setConflict({...conflict,draft:chooseCourseConflict(conflict.draft,field.path,choice==='local'?field.local:field.server),chosen:{...conflict.chosen,[key]:true}})}>{choice==='local'?t('course13_copy_015'):t('course13_copy_016')}</button>)}</div>;})}<button disabled={conflict.fields.some(field=>!conflict.chosen[field.path.join('.')])} onClick={()=>{setCourse(conflict.latest);setDraftVersion(conflict.latest.version);setFormData(conflict.draft as Partial<CourseDetail>);setSavedForm(JSON.stringify(editableCourseFields(conflict.latest as unknown as Record<string,unknown>)));setConflict(null);setReadiness(null);setError(null);}}>{t('course13_copy_017')}</button><button onClick={()=>setConflict(null)}>{t('course13_copy_018')}</button></section>}
      {hasUnsavedChanges && <p role="status">{t('course13_copy_019')}</p>}
      <div className="block text-sm font-semibold">{t('course13_copy_020')}{course && course.originType!=='EXTERNAL_LINKED_COURSE' && id && <CourseAdmissionsPanel id={id} version={course.version}/>}
        {course?.originType === 'EXTERNAL_LINKED_COURSE' && id && <CourseSourceApprovalPanel id={id} version={course.version}/> }
        <label className="block text-xs">{t('course13_copy_021')}<select value={String(formData.optionalFields?.withdrawalAccessPolicy ?? '')} onChange={event=>setFormData({...formData,optionalFields:{...formData.optionalFields,withdrawalAccessPolicy:event.target.value}})} disabled={course?.status==='PUBLISHED'}><option value="">{t('course13_copy_022')}</option><option value="REVOKE">{t('course13_copy_023')}</option><option value="HONOR_ENROLLED_VERSION">{t('course13_copy_024')}</option></select></label>
        <input value={reviewReason} onChange={event=>setReviewReason(event.target.value)} maxLength={2000}
          placeholder={t('course13_copy_025')} className="mt-2 w-full rounded-lg border p-3" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => {if(!hasUnsavedChanges || window.confirm(t('course13_copy_000'))) navigate('/courses');}}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> {t('back_to_courses')}
        </button>
        <div className="flex flex-wrap gap-2">
          {course.status !== 'READY_TO_REVIEW' && course.status !== 'PUBLISHED' && (
            <button
              disabled={saving}
              onClick={() => handleAction('mark-ready', 'Mark Ready')}
              className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
            >
              {t('mark_ready')}
            </button>
          )}
          {course.completenessStatus === 'COMPLETE' && course.status === 'READY_TO_REVIEW' && (
            <button
              disabled={saving}
              onClick={() => handleAction('mark-publishable', 'Ready to Publish')}
              className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded shadow-sm hover:bg-blue-100"
            >
              {t('ready_to_publish')}
            </button>
          )}
          {course.status === 'READY_TO_PUBLISH' && (
            <button
              disabled={saving}
              onClick={() => handleAction('publish', 'Publish')}
              className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded shadow-sm hover:bg-green-700"
            >
              {t('publish')}
            </button>
          )}
          {course.status === 'PUBLISHED' && (
            <button
              disabled={saving}
              onClick={() => handleAction('unpublish', 'Unpublish')}
              className="px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 rounded shadow-sm hover:bg-yellow-200"
            >
              {t('unpublish')}
            </button>
          )}
        </div>
      </div>

      {course.status === 'PUBLISHED' && (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-900" dir={dir}>
          {t('course13_copy_026')}</p>
      )}
      {course.originType !== 'EXTERNAL_LINKED_COURSE' && <details onToggle={event=>{if(event.currentTarget.open)setEditorOpen(true);}}><summary>{t('course13_copy_027')}</summary>{editorOpen&&<AssessmentReviewPanel courseId={course.id} />}</details>}
      <details onToggle={event=>{if(event.currentTarget.open)setEditorOpen(true);}}><summary>{t('course13_copy_028')}</summary>
      {editorOpen&&<>
      {editingLesson && (
        <section className="rounded-2xl border bg-white p-5 space-y-3" dir={dir}>
          <h3 className="font-black text-[#142B5F]">{t('course13_copy_029')}</h3>
          <input
            disabled={saving || course?.status === 'PUBLISHED'}
            value={editingLesson.title}
            onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
            className="w-full rounded border p-2"
          />
          <textarea
            disabled={saving || course?.status === 'PUBLISHED'}
            rows={2}
            placeholder={t('course13_copy_030')}
            value={editingLesson.summary ?? ''}
            onChange={(e) => setEditingLesson({ ...editingLesson, summary: e.target.value })}
            className="w-full rounded border p-2"
          />
          <textarea
            disabled={saving || course?.status === 'PUBLISHED'}
            rows={10}
            placeholder={t('course13_copy_031')}
            value={editingLesson.contentText ?? ''}
            onChange={(e) => setEditingLesson({ ...editingLesson, contentText: e.target.value })}
            className="w-full rounded border p-2"
          />
          <button
            disabled={saving || !editingLesson.title.trim()}
            onClick={() => void mutateCurriculum(saveLesson)}
            className="rounded bg-[#0E7C86] text-white px-4 py-2"
          >
            {t('course13_copy_032')}</button>
          <button disabled={saving} onClick={() => setEditingLesson(null)} className="mx-3">
            {t('course13_copy_033')}</button>
        </section>
      )}
      {error && (
        <div className="p-4 bg-red-50 flex items-start gap-3 rounded text-red-800 text-sm border border-red-200">
          <XCircle className="h-5 w-5 shrink-0" /> <p>{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 flex items-start gap-3 rounded text-green-800 text-sm border border-green-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> <p>{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{course.displayName}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-gray-100">{course.status}</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">{course.originType}</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">{course.accessType}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-700">{t('course_name')}</label>
            <input
              disabled={saving || course?.status === 'PUBLISHED'}
              value={formData.displayName || ''}
              onChange={(event) => setFormData({ ...formData, displayName: event.target.value })}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <label className="block text-xs font-medium text-gray-700">{t('direct_url')}</label>
            <input
              value={formData.directCourseUrl || ''}
              readOnly={isExternalLinkedCourse}
              onChange={(event) =>
                setFormData({ ...formData, directCourseUrl: event.target.value })
              }
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm read-only:bg-gray-50 read-only:text-gray-500"
            />
            {isExternalLinkedCourse && (
              <p className="text-xs text-gray-500">
                {t('course13_copy_034')}</p>
            )}
            <label className="block text-xs font-medium text-gray-700">
              {t('learning_language')}
            </label>
            <input
              disabled={saving || course?.status === 'PUBLISHED'}
              value={formData.learningLanguage || ''}
              onChange={(event) =>
                setFormData({ ...formData, learningLanguage: event.target.value })
              }
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <label className="block text-xs font-medium text-gray-700">{t('duration')}</label>
            <input
              disabled={saving || course?.status === 'PUBLISHED'}
              value={formData.studyDuration || ''}
              onChange={(event) => setFormData({ ...formData, studyDuration: event.target.value })}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <label className="block text-xs font-medium text-gray-700">{t('category')}</label>
            <input
              disabled={saving || course?.status === 'PUBLISHED'}
              value={formData.category || ''}
              onChange={(event) => setFormData({ ...formData, category: event.target.value })}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            {!isExternalLinkedCourse && (
              <div className="space-y-3" dir={dir}>
                <label className="block text-xs font-medium">{t('course13_copy_035')}</label>
                <select
                  disabled={saving || course.status === 'PUBLISHED'}
                  value={formData.difficultyLevel ?? ''}
                  onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                  className="w-full rounded border p-2"
                >
                  <option value="">{t('course13_copy_036')}</option>
                  <option value="BEGINNER">{t('course13_copy_037')}</option>
                  <option value="INTERMEDIATE">{t('course13_copy_038')}</option>
                  <option value="ADVANCED">{t('course13_copy_039')}</option>
                  <option value="ALL_LEVELS">{t('course13_copy_040')}</option>
                </select>
                <label className="block text-xs font-medium">{t('course13_copy_041')}</label>
                <select
                  disabled={saving || course.status === 'PUBLISHED'}
                  value={formData.accessType}
                  onChange={(e) => setFormData({ ...formData, accessType: e.target.value })}
                  className="w-full rounded border p-2"
                >
                  <option value="FREE_STUDY">{t('course13_copy_042')}</option>
                  <option value="FREE_STUDY_AND_CERTIFICATE">{t('course13_copy_043')}</option>
                  <option value="FREE_CERTIFICATE">{t('course13_copy_044')}</option>
                  <option value="PAID">{t('course13_copy_045')}</option>
                </select>
                <fieldset disabled={saving || course.status === 'PUBLISHED'}>
                  <AssetPicker
                    label={t('course13_copy_046')}
                    purpose="COURSE_THUMBNAIL"
                    mimeTypePrefix="image/"
                    value={formData.thumbnailAssetId}
                    onChange={(assetId) => setFormData({ ...formData, thumbnailAssetId: assetId })}
                  />
                </fieldset>
                <label className="block text-xs font-medium">{t('course13_copy_047')}</label>
                <textarea
                  disabled={saving || course?.status === 'PUBLISHED'}
                  rows={3}
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded border p-2"
                />
                <label className="block text-xs font-medium">{t('course13_copy_048')}</label>
                <textarea
                  disabled={saving || course?.status === 'PUBLISHED'}
                  rows={6}
                  value={formData.courseContent ?? ''}
                  onChange={(e) => setFormData({ ...formData, courseContent: e.target.value })}
                  className="w-full rounded border p-2"
                />
                {[
                  { key: 'prerequisites' as const, label: t('course13_copy_049') },
                  { key: 'targetAudience' as const, label: t('course13_copy_050') },
                ].map((field) => (
                  <label key={field.key} className="block text-xs font-medium">
                    {field.label}
                    <textarea
                      disabled={saving || course.status === 'PUBLISHED'}
                      value={(formData[field.key] ?? []).join('\n')}
                      onChange={(event) =>
                        setFormData({ ...formData, [field.key]: event.target.value.split('\n') })
                      }
                      className="w-full rounded border p-2 mt-2"
                    />
                  </label>
                ))}
                <label className="block text-xs font-medium">{t('course13_copy_051')}</label>
                <input
                  disabled={saving || course?.status === 'PUBLISHED'}
                  value={formData.instructor ?? ''}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  className="w-full rounded border p-2"
                />
                <label className="block text-xs font-medium">{t('course13_copy_052')}</label>
                <textarea
                  disabled={saving || course?.status === 'PUBLISHED'}
                  value={(formData.learningOutcomes ?? []).join('\n')}
                  onChange={(e) =>
                    setFormData({ ...formData, learningOutcomes: e.target.value.split('\n') })
                  }
                  className="w-full rounded border p-2"
                />
                <label className="block text-xs font-medium">{t('course13_copy_053')}</label>
                <textarea
                  disabled={saving || course?.status === 'PUBLISHED'}
                  value={(formData.acquiredSkills ?? []).join('\n')}
                  onChange={(e) =>
                    setFormData({ ...formData, acquiredSkills: e.target.value.split('\n') })
                  }
                  className="w-full rounded border p-2"
                />
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    disabled={saving || course.status === 'PUBLISHED'}
                    checked={formData.certificateAvailable ?? false}
                    onChange={(e) =>
                      setFormData({ ...formData, certificateAvailable: e.target.checked })
                    }
                  />
                  {t('course13_copy_054')}</label>
              </div>
            )}
            <button
              onClick={handleSaveCourse}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{' '}
              {t('save_metadata')}
            </button>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          {!isExternalLinkedCourse && (
            <section className="rounded-xl border bg-white p-5 space-y-3" dir={dir}>
              <h3 className="font-bold text-[#142B5F]">{t('course13_copy_055')}</h3>
              <button
                disabled={saving}
                className="text-[#0E7C86] font-bold"
                onClick={() =>
                  void mutateCurriculum(async () => {
                    setReadiness(await adminApiClient.request(`/admin/courses/${id}/readiness`));
                  })
                }
              >
                {t('course13_copy_056')}</button>
              {readiness && (
                <div>
                  <p>{readiness.ready ? t('course13_copy_057') : `${t('course13_completion_label')} ${readiness.percentage}%`}</p>
                  <ul>
                    {readiness.checks
                      .filter((check) => check.state === 'INCOMPLETE')
                      .map((check) => (
                        <li key={check.key} className="text-sm text-amber-800">
                          {check.label}: {check.message}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={financialClearance}
                  onChange={(e) => setFinancialClearance(e.target.checked)}
                />
                {t('course13_copy_058')}</label>
              <button
                disabled={saving}
                className="rounded bg-[#0E7C86] text-white px-4 py-2"
                onClick={() =>
                  void mutateCurriculum(async () => {
                    const saved = await adminApiClient.request<Record<string, unknown>>(
                      `/admin/courses/${id}/enrollment-policy`,
                      {
                        method: 'PUT',
                        body: JSON.stringify({
                          ...policyData,
                          requiresFinancialClearance: financialClearance,
                        }),
                      },
                    );
                    setPolicyData(saved);
                    setFinancialClearance(saved.requiresFinancialClearance === true);
                  })
                }
              >
                {t('course13_copy_059')}</button>
            </section>
          )}

          {isExternalLinkedCourse ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-900">{t('external_linked_course')}</h3>
              <p className="text-sm text-amber-800 mt-2">
                {t('this_course_redirects_learners_to_an_external_prov')}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold">{t('curriculum_builder')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <input
                    disabled={saving || course?.status === 'PUBLISHED'}
                    placeholder={t('module_title')}
                    value={moduleDraft.title}
                    onChange={(event) =>
                      setModuleDraft({ ...moduleDraft, title: event.target.value })
                    }
                    className="md:col-span-2 rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    disabled={saving || course?.status === 'PUBLISHED'}
                    placeholder={t('description')}
                    value={moduleDraft.description}
                    onChange={(event) =>
                      setModuleDraft({ ...moduleDraft, description: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => void mutateCurriculum(createModule)}
                    disabled={saving || !moduleDraft.title}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> {t('add_module')}
                  </button>
                </div>

                <div className="space-y-4">
                  {(snapshot?.modules || []).map((module) => (
                    <div
                      key={module.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {module.position}. {module.title}
                          </h4>
                          <p className="text-xs text-gray-500">{module.status}</p><div className="flex gap-2">{(['edit','delete','up','down'] as const).map(action => <button key={action} type="button" aria-label={`${action}: ${module.title}`} disabled={saving || course?.status === 'PUBLISHED' || course?.status === 'ARCHIVED'} onClick={() => void manageStructure('modules', module.id, action)}>{({edit:t('course13_copy_060'),delete:t('course13_copy_061'),up:'↑',down:'↓'})[action]}</button>)}</div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {(lessonsByModule[module.id] || []).map((lesson) => (
                          <div
                            key={lesson.id}
                            className="bg-white border border-gray-200 rounded px-3 py-2"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span>
                                {lesson.position}. {lesson.title}
                              </span>
                              <span className="text-xs text-gray-500">{lesson.lessonType}</span>{(['delete','up','down'] as const).map(action => <button key={action} type="button" aria-label={`${action}: ${lesson.title}`} disabled={saving || course?.status === 'PUBLISHED' || course?.status === 'ARCHIVED'} onClick={() => void manageStructure('lessons',lesson.id,action,module.id)}>{({delete:t('course13_copy_061'),up:'↑',down:'↓'})[action]}</button>)}
                              <button
                                disabled={saving}
                                onClick={() => setEditingLesson({ ...lesson })}
                                className="text-[#0E7C86] font-bold"
                              >
                                {t('course13_copy_062')}</button>
                            </div>
                            {(assetsByLesson[lesson.id] || []).length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {t('assets')}
                                {(assetsByLesson[lesson.id] || [])
                                  .map((asset) => asset.assetId)
                                  .join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <h3 className="font-semibold mb-4">{t('add_lesson')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <select
                    disabled={saving || course?.status === 'PUBLISHED'}
                    value={lessonDraft.moduleId}
                    onChange={(event) =>
                      setLessonDraft({ ...lessonDraft, moduleId: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">{t('choose_module')}</option>
                    {snapshot?.modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                  <input
                    disabled={saving || course?.status === 'PUBLISHED'}
                    placeholder={t('lesson_title')}
                    value={lessonDraft.title}
                    onChange={(event) =>
                      setLessonDraft({ ...lessonDraft, title: event.target.value })
                    }
                    className="md:col-span-2 rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    disabled={saving || course?.status === 'PUBLISHED'}
                    value={lessonDraft.lessonType}
                    onChange={(event) =>
                      setLessonDraft({ ...lessonDraft, lessonType: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="VIDEO">{t('video')}</option>
                    <option value="ARTICLE">{t('article')}</option>
                    <option value="FILE">{t('file')}</option>
                    <option value="QUIZ">{t('quiz')}</option>
                    <option value="MIXED">{t('mixed')}</option>
                  </select>
                  <textarea
                    disabled={saving || course?.status === 'PUBLISHED'}
                    rows={2}
                    placeholder={t('course13_copy_030')}
                    value={lessonDraft.summary}
                    onChange={(event) =>
                      setLessonDraft({ ...lessonDraft, summary: event.target.value })
                    }
                    className="w-full rounded border p-3 text-sm mb-2"
                  />
                  <textarea
                    disabled={saving || course?.status === 'PUBLISHED'}
                    rows={8}
                    placeholder={t('course13_copy_063')}
                    value={lessonDraft.contentText}
                    onChange={(event) =>
                      setLessonDraft({ ...lessonDraft, contentText: event.target.value })
                    }
                    className="w-full rounded border p-3 text-sm mb-2"
                  />
                  <button
                    onClick={() => void mutateCurriculum(createLesson)}
                    disabled={!lessonDraft.moduleId || !lessonDraft.title}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> {t('add_lesson_1')}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <h3 className="font-semibold mb-4">{t('attach_lesson_asset')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <select
                    disabled={saving || course?.status === 'PUBLISHED'}
                    value={assetDraft.lessonId}
                    onChange={(event) =>
                      setAssetDraft({ ...assetDraft, lessonId: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">{t('choose_lesson')}</option>
                    {snapshot?.lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                  <div className="md:col-span-2">
                    <AssetPicker
                      label={t('eap_assetid')}
                      purpose={`COURSE_LESSON_MEDIA:${assetDraft.assetType}`}
                      mimeTypePrefix={courseAssetMimePrefix[assetDraft.assetType]}
                      value={assetDraft.assetId}
                      onChange={(assetId) => setAssetDraft({ ...assetDraft, assetId })}
                    />
                  </div>
                  <select
                    disabled={saving || course?.status === 'PUBLISHED'}
                    value={assetDraft.assetType}
                    onChange={(event) =>
                      setAssetDraft({ ...assetDraft, assetType: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="VIDEO">{t('video')}</option>
                    <option value="IMAGE">{t('image')}</option>
                    <option value="PDF">{t('pdf')}</option>
                    <option value="DOCUMENT">{t('document')}</option>
                    <option value="AUDIO">{t('audio')}</option>
                    <option value="SUBTITLE">{t('subtitle')}</option>
                  </select>
                  <button
                    onClick={() => void mutateCurriculum(attachAsset)}
                    disabled={!assetDraft.lessonId || !assetDraft.assetId}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> {t('attach')}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t('only_phase_05_eap_handles_are_accepted_raw_urls_ar')}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileQuestion className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold">{t('assessments')}</h3>
                </div>
                <label className="block mb-3">{t('course13_copy_064')}<select className="mx-2 rounded border p-2" disabled={saving || course.status === 'PUBLISHED'} value={quizDraft.assessmentType}
                    onChange={event => setQuizDraft({...quizDraft, assessmentType: event.target.value})}>
                    <option value="QUIZ">{t('course13_copy_065')}</option><option value="ASSIGNMENT">{t('course13_copy_066')}</option>
                  </select>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                  <input
                    disabled={saving || course?.status === 'PUBLISHED'}
                    placeholder={t('quiz_title')}
                    aria-label={t('course13_copy_067')}
                    value={quizDraft.title}
                    onChange={(event) => setQuizDraft({ ...quizDraft, title: event.target.value })}
                    className="md:col-span-2 rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    disabled={saving || course?.status === 'PUBLISHED'}
                    value={quizDraft.moduleId}
                    onChange={(event) =>
                      setQuizDraft({ ...quizDraft, moduleId: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">{t('course_level_quiz')}</option>
                    {snapshot?.modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                  <input
                    disabled={saving || course?.status === 'PUBLISHED'}
                    placeholder={t('passing')}
                    value={quizDraft.passingScore}
                    onChange={(event) =>
                      setQuizDraft({ ...quizDraft, passingScore: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => void mutateCurriculum(createQuiz)}
                    disabled={saving || !quizDraft.title}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> {t('add_quiz')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <select
                    disabled={saving || course?.status === 'PUBLISHED'}
                    value={questionDraft.quizId}
                    onChange={(event) =>
                      setQuestionDraft({ ...questionDraft, quizId: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">{t('choose_quiz')}</option>
                    {snapshot?.quizzes.map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </option>
                    ))}
                  </select>
                  <input
                    disabled={saving || course?.status === 'PUBLISHED'}
                    placeholder={t('question_prompt')}
                    value={questionDraft.prompt}
                    onChange={(event) =>
                      setQuestionDraft({ ...questionDraft, prompt: event.target.value })
                    }
                    className="md:col-span-3 rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    disabled={saving || course?.status === 'PUBLISHED'}
                    value={questionDraft.questionType}
                    onChange={(event) =>
                      setQuestionDraft({ ...questionDraft, questionType: event.target.value })
                    }
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="MULTIPLE_CHOICE">{t('multiple_choice')}</option>
                    <option value="TRUE_FALSE">{t('true_false')}</option>
                    <option value="SHORT_ANSWER">{t('short_answer')}</option>
                    <option value="ESSAY">{t('essay')}</option>
                  </select>
                  <button
                    onClick={() => void mutateCurriculum(createQuestion)}
                    disabled={saving || !questionDraft.quizId || !questionDraft.prompt}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> {t('add_question')}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {(snapshot?.quizzes || []).map((quiz) => (
                    <div key={quiz.id} className="border border-gray-200 rounded p-3">
                      <div className="text-sm font-medium">{quiz.title}</div>
                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                        {(questionsByQuiz[quiz.id] || []).map((question) => (
                          <div key={question.id}>
                            {question.position}. {question.prompt}
                          </div>
                        ))}
                        {(questionsByQuiz[quiz.id] || []).length === 0 && (
                          <div>{t('no_questions_yet')}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{t('course13_copy_068')}</h3>
            <p className="text-xs text-gray-500">
              {t('course13_copy_069')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={analyzeRelationships}
              disabled={saving}
              className="rounded border px-3 py-2 text-xs font-semibold"
            >
              {t('course13_copy_070')}</button>
            <button
              onClick={projectMajors}
              disabled={
                saving ||
                !relationships?.taxonomyLinks.some((item) => item.reviewState === 'APPROVED')
              }
              className="rounded border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {t('course13_copy_071')}</button>
          </div>
        </div>
        {relationships ? (
          <>
            <div className="grid gap-3 md:grid-cols-4 text-xs">
              <div className="rounded bg-gray-50 p-3">
                {t('course13_copy_072')}<strong>{relationships.source.learningLanguageResolutionState}</strong>
              </div>
              <div className="rounded bg-gray-50 p-3">
                {t('course13_copy_073')}<strong>{relationships.closure.approvedTaxonomyLinks}</strong>
              </div>
              <div className="rounded bg-gray-50 p-3">
                {t('course13_copy_074')}<strong>{relationships.closure.approvedMajorProjections}</strong>
              </div>
              <div
                className={`rounded p-3 ${relationships.closure.reviewRequired ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}
              >
                {relationships.closure.reviewRequired ? 'Review required' : 'Relationships closed'}
              </div>
            </div>
            <CanonicalPicker
              label={`Canonical learning language${relationships.source.learningLanguageRaw ? ` · source: ${relationships.source.learningLanguageRaw}` : ''}`}
              value={relationships.source.learningLanguageReferenceId}
              onChange={(next) => approveLanguage(next)}
              load={() => canonicalPickerApi.languages()}
              reloadKey="course-languages"
              optional
            />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">{t('course13_copy_075')}</h4>
              {relationships.taxonomyLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-xs"
                >
                  <span>
                    <strong>{link.sourceTerm}</strong> → {link.taxonomyNodeId} ·{' '}
                    {link.relationshipType} · {link.reviewState}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={link.reviewState === 'APPROVED'}
                      onClick={() => reviewTaxonomy(link.id, 'approve')}
                      className="text-green-700 disabled:opacity-40"
                    >
                      {t('course13_copy_076')}</button>
                    <button
                      disabled={link.reviewState === 'REJECTED'}
                      onClick={() => reviewTaxonomy(link.id, 'reject')}
                      className="text-red-700 disabled:opacity-40"
                    >
                      {t('course13_copy_077')}</button>
                  </div>
                </div>
              ))}
              {relationships.taxonomyLinks.length === 0 ? (
                <p className="text-xs text-gray-500">{t('course13_copy_078')}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">{t('course13_copy_079')}</h4>
              {relationships.majorProjections.map((projection) => (
                <div
                  key={projection.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-xs"
                >
                  <span>
                    {t('course13_copy_080')}{projection.majorId} · {projection.relationshipType} ·{' '}
                    {projection.projectionState}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={projection.projectionState === 'APPROVED'}
                      onClick={() => reviewMajorProjection(projection.id, 'approve')}
                      className="text-green-700 disabled:opacity-40"
                    >
                      {t('course13_copy_076')}</button>
                    <button
                      disabled={projection.projectionState === 'REJECTED'}
                      onClick={() => reviewMajorProjection(projection.id, 'reject')}
                      className="text-red-700 disabled:opacity-40"
                    >
                      {t('course13_copy_077')}</button>
                  </div>
                </div>
              ))}
              {relationships.majorProjections.length === 0 ? (
                <p className="text-xs text-gray-500">{t('course13_copy_081')}</p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">{t('course13_copy_082')}</p>
        )}
      </section>
      </>}
      </details>
    </div>
  );
}
