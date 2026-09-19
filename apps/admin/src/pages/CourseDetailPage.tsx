import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { ArrowLeft, CheckCircle2, FileQuestion, Layers, Loader2, Plus, Save, XCircle } from 'lucide-react';
import { useTranslation } from "../i18n/I18nProvider";
import { CanonicalPicker } from '../components/CanonicalPicker';
import { AssetPicker } from '../components/AssetPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';

interface CourseDetail {
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
  difficultyLevel?: string;
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
  taxonomyLinks: Array<{ id: string; taxonomyNodeId: string; sourceTerm: string; relationshipType: string; reviewState: string }>;
  majorProjections: Array<{ id: string; majorId: string; relationshipType: string; projectionState: string }>;
  closure: { languageCanonical: boolean; approvedTaxonomyLinks: number; approvedMajorProjections: number; reviewRequired: boolean };
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
    const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [snapshot, setSnapshot] = useState<CurriculumSnapshot | null>(null);
  const [relationships, setRelationships] = useState<CourseRelationshipReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CourseDetail>>({});
  const [moduleDraft, setModuleDraft] = useState({ title: '', description: '', position: 1 });
  const [lessonDraft, setLessonDraft] = useState({ moduleId: '', title: '', lessonType: 'VIDEO', position: 1, estimatedDurationMinutes: '' });
  const [assetDraft, setAssetDraft] = useState({ lessonId: '', assetId: '', assetType: 'VIDEO', title: '', position: 1 });
  const courseAssetMimePrefix: Record<string, string | undefined> = { VIDEO: 'video/', IMAGE: 'image/', PDF: 'application/pdf', DOCUMENT: 'application/', AUDIO: 'audio/', SUBTITLE: 'text/', OTHER: undefined };
  const [quizDraft, setQuizDraft] = useState({ moduleId: '', lessonId: '', title: '', position: 1, passingScore: '70' });
  const [questionDraft, setQuestionDraft] = useState({ quizId: '', questionType: 'MULTIPLE_CHOICE', prompt: '', choices: '["Option A","Option B"]', correctAnswer: '"Option A"', position: 1, points: 1 });

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
      setCourse(courseResponse);
      const relationshipResponse = await adminApiClient.request<CourseRelationshipReview>(`/admin/courses/${id}/relationships`);
      setRelationships(relationshipResponse);
      setFormData({
        displayName: courseResponse.displayName,
        directCourseUrl: courseResponse.directCourseUrl,
        platformName: courseResponse.platformName || '',
        providerName: courseResponse.providerName || '',
        learningLanguage: courseResponse.learningLanguage || '',
        studyDuration: courseResponse.studyDuration || '',
        category: courseResponse.category || '',
        difficultyLevel: courseResponse.difficultyLevel || '',
        certificateAvailable: courseResponse.certificateAvailable ?? false,
      });

      if (courseResponse.originType !== 'EXTERNAL_LINKED_COURSE') {
        const curriculumResponse = await adminApiClient.request<CurriculumSnapshot>(`/admin/courses/${id}/curriculum`);
        setSnapshot(curriculumResponse);
        setModuleDraft((value) => ({ ...value, position: curriculumResponse.modules.length + 1 }));
      } else {
        setSnapshot(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const refreshCurriculum = async () => {
    if (!id || isExternalLinkedCourse) return;
    const curriculumResponse = await adminApiClient.request<CurriculumSnapshot>(`/admin/courses/${id}/curriculum`);
    setSnapshot(curriculumResponse);
  };

  const handleSaveCourse = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { directCourseUrl: _sourceOwnedUrl, ...editableFields } = formData;
      const updated = await adminApiClient.request<CourseDetail>(`/admin/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(isExternalLinkedCourse ? editableFields : formData),
      });
      setCourse(updated);
      setSuccessMsg('Course metadata saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (endpoint: string, actionName: string) => {
    if (!id) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApiClient.request(`/admin/courses/${id}/${endpoint}`, { method: 'POST' });
      setSuccessMsg(`Successfully executed: ${actionName}`);
      fetchCourse();
    } catch (err: any) {
      setError(err.message);
    }
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
        estimatedDurationMinutes: lessonDraft.estimatedDurationMinutes ? Number(lessonDraft.estimatedDurationMinutes) : undefined,
      }),
    });
    setLessonDraft({ moduleId: lessonDraft.moduleId, title: '', lessonType: 'VIDEO', position: lessonDraft.position + 1, estimatedDurationMinutes: '' });
    await refreshCurriculum();
  };

  const attachAsset = async () => {
    if (!id || !assetDraft.lessonId) return;
    await adminApiClient.request(`/admin/courses/${id}/lessons/${assetDraft.lessonId}/assets`, {
      method: 'POST',
      body: JSON.stringify(assetDraft),
    });
    setAssetDraft({ lessonId: assetDraft.lessonId, assetId: '', assetType: 'VIDEO', title: '', position: assetDraft.position + 1 });
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
    setQuizDraft({ moduleId: quizDraft.moduleId, lessonId: quizDraft.lessonId, title: '', position: quizDraft.position + 1, passingScore: '70' });
    await refreshCurriculum();
  };

  const createQuestion = async () => {
    if (!id || !questionDraft.quizId) return;
    const choices = questionDraft.choices ? JSON.parse(questionDraft.choices) : undefined;
    const correctAnswer = questionDraft.correctAnswer ? JSON.parse(questionDraft.correctAnswer) : undefined;
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
    setRelationships(await adminApiClient.request<CourseRelationshipReview>(`/admin/courses/${id}/relationships`));
  };

  const analyzeRelationships = async () => {
    if (!id) return;
    setSaving(true); setError(null); setSuccessMsg(null);
    try {
      await adminApiClient.request(`/admin/courses/${id}/relationships/analyze`, { method: 'POST' });
      await refreshRelationships();
      setSuccessMsg('Course relationship analysis completed; proposals are ready for review.');
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const approveLanguage = async (languageReferenceId: string | null) => {
    if (!id || !languageReferenceId) return;
    setSaving(true); setError(null);
    try {
      await adminApiClient.request(`/admin/courses/${id}/relationships/language`, { method: 'POST', body: JSON.stringify({ languageReferenceId }) });
      await refreshRelationships();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const reviewTaxonomy = async (linkId: string, decision: 'approve' | 'reject') => {
    if (!id) return;
    await adminApiClient.request(`/admin/courses/${id}/relationships/taxonomy/${linkId}/${decision}`, { method: 'POST' });
    await refreshRelationships();
  };

  const projectMajors = async () => {
    if (!id) return;
    await adminApiClient.request(`/admin/courses/${id}/relationships/majors/project`, { method: 'POST' });
    await refreshRelationships();
  };

  const reviewMajorProjection = async (projectionId: string, decision: 'approve' | 'reject') => {
    if (!id) return;
    await adminApiClient.request(`/admin/courses/${id}/relationships/majors/${projectionId}/${decision}`, { method: 'POST' });
    await refreshRelationships();
  };

  if (loading && !course) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  if (!course) {
    return <div className="text-red-500">{t('failed_to_load_course_details')}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => navigate('/courses')} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t('back_to_courses')}</button>
        <div className="flex flex-wrap gap-2">
          {course.status !== 'READY_TO_REVIEW' && course.status !== 'PUBLISHED' && <button onClick={() => handleAction('mark-ready', 'Mark Ready')} className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50">{t('mark_ready')}</button>}
          {course.completenessStatus === 'COMPLETE' && course.status === 'READY_TO_REVIEW' && <button onClick={() => handleAction('mark-publishable', 'Ready to Publish')} className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded shadow-sm hover:bg-blue-100">{t('ready_to_publish')}</button>}
          {course.status === 'READY_TO_PUBLISH' && <button onClick={() => handleAction('publish', 'Publish')} className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded shadow-sm hover:bg-green-700">{t('publish')}</button>}
          {course.status === 'PUBLISHED' && <button onClick={() => handleAction('unpublish', 'Unpublish')} className="px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 rounded shadow-sm hover:bg-yellow-200">{t('unpublish')}</button>}
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 flex items-start gap-3 rounded text-red-800 text-sm border border-red-200"><XCircle className="h-5 w-5 shrink-0" /> <p>{error}</p></div>}
      {successMsg && <div className="p-4 bg-green-50 flex items-start gap-3 rounded text-green-800 text-sm border border-green-200"><CheckCircle2 className="h-5 w-5 shrink-0" /> <p>{successMsg}</p></div>}

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
            <input value={formData.displayName || ''} onChange={(event) => setFormData({ ...formData, displayName: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm" />
            <label className="block text-xs font-medium text-gray-700">{t('direct_url')}</label>
            <input
              value={formData.directCourseUrl || ''}
              readOnly={isExternalLinkedCourse}
              onChange={(event) => setFormData({ ...formData, directCourseUrl: event.target.value })}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm read-only:bg-gray-50 read-only:text-gray-500"
            />
            {isExternalLinkedCourse && <p className="text-xs text-gray-500">Source-owned URL; update it through the controlled import workflow.</p>}
            <label className="block text-xs font-medium text-gray-700">{t('learning_language')}</label>
            <input value={formData.learningLanguage || ''} onChange={(event) => setFormData({ ...formData, learningLanguage: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm" />
            <label className="block text-xs font-medium text-gray-700">{t('duration')}</label>
            <input value={formData.studyDuration || ''} onChange={(event) => setFormData({ ...formData, studyDuration: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm" />
            <label className="block text-xs font-medium text-gray-700">{t('category')}</label>
            <input value={formData.category || ''} onChange={(event) => setFormData({ ...formData, category: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm" />
            <button onClick={handleSaveCourse} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t('save_metadata')}</button>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          {isExternalLinkedCourse ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-900">{t('external_linked_course')}</h3>
              <p className="text-sm text-amber-800 mt-2">{t('this_course_redirects_learners_to_an_external_prov')}</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold">{t('curriculum_builder')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <input placeholder={t('module_title')} value={moduleDraft.title} onChange={(event) => setModuleDraft({ ...moduleDraft, title: event.target.value })} className="md:col-span-2 rounded border border-gray-300 px-3 py-2 text-sm" />
                  <input placeholder={t('description')} value={moduleDraft.description} onChange={(event) => setModuleDraft({ ...moduleDraft, description: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={createModule} disabled={!moduleDraft.title} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> {t('add_module')}</button>
                </div>

                <div className="space-y-4">
                  {(snapshot?.modules || []).map((module) => (
                    <div key={module.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{module.position}. {module.title}</h4>
                          <p className="text-xs text-gray-500">{module.status}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {(lessonsByModule[module.id] || []).map((lesson) => (
                          <div key={lesson.id} className="bg-white border border-gray-200 rounded px-3 py-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{lesson.position}. {lesson.title}</span>
                              <span className="text-xs text-gray-500">{lesson.lessonType}</span>
                            </div>
                            {(assetsByLesson[lesson.id] || []).length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">{t('assets')}{(assetsByLesson[lesson.id] || []).map((asset) => asset.assetId).join(', ')}</div>
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
                  <select value={lessonDraft.moduleId} onChange={(event) => setLessonDraft({ ...lessonDraft, moduleId: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="">{t('choose_module')}</option>
                    {snapshot?.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
                  </select>
                  <input placeholder={t('lesson_title')} value={lessonDraft.title} onChange={(event) => setLessonDraft({ ...lessonDraft, title: event.target.value })} className="md:col-span-2 rounded border border-gray-300 px-3 py-2 text-sm" />
                  <select value={lessonDraft.lessonType} onChange={(event) => setLessonDraft({ ...lessonDraft, lessonType: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="VIDEO">{t('video')}</option>
                    <option value="ARTICLE">{t('article')}</option>
                    <option value="FILE">{t('file')}</option>
                    <option value="QUIZ">{t('quiz')}</option>
                    <option value="MIXED">{t('mixed')}</option>
                  </select>
                  <button onClick={createLesson} disabled={!lessonDraft.moduleId || !lessonDraft.title} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> {t('add_lesson_1')}</button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <h3 className="font-semibold mb-4">{t('attach_lesson_asset')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <select value={assetDraft.lessonId} onChange={(event) => setAssetDraft({ ...assetDraft, lessonId: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="">{t('choose_lesson')}</option>
                    {snapshot?.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                  </select>
                  <div className="md:col-span-2"><AssetPicker label={t('eap_assetid')} purpose={`COURSE_LESSON_MEDIA:${assetDraft.assetType}`} mimeTypePrefix={courseAssetMimePrefix[assetDraft.assetType]} value={assetDraft.assetId} onChange={(assetId) => setAssetDraft({ ...assetDraft, assetId })} /></div>
                  <select value={assetDraft.assetType} onChange={(event) => setAssetDraft({ ...assetDraft, assetType: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="VIDEO">{t('video')}</option>
                    <option value="IMAGE">{t('image')}</option>
                    <option value="PDF">{t('pdf')}</option>
                    <option value="DOCUMENT">{t('document')}</option>
                    <option value="AUDIO">{t('audio')}</option>
                    <option value="SUBTITLE">{t('subtitle')}</option>
                  </select>
                  <button onClick={attachAsset} disabled={!assetDraft.lessonId || !assetDraft.assetId} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> {t('attach')}</button>
                </div>
                <p className="text-xs text-gray-500 mt-2">{t('only_phase_05_eap_handles_are_accepted_raw_urls_ar')}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileQuestion className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold">{t('assessments')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                  <input placeholder={t('quiz_title')} value={quizDraft.title} onChange={(event) => setQuizDraft({ ...quizDraft, title: event.target.value })} className="md:col-span-2 rounded border border-gray-300 px-3 py-2 text-sm" />
                  <select value={quizDraft.moduleId} onChange={(event) => setQuizDraft({ ...quizDraft, moduleId: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="">{t('course_level_quiz')}</option>
                    {snapshot?.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
                  </select>
                  <input placeholder={t('passing')} value={quizDraft.passingScore} onChange={(event) => setQuizDraft({ ...quizDraft, passingScore: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={createQuiz} disabled={!quizDraft.title} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> {t('add_quiz')}</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <select value={questionDraft.quizId} onChange={(event) => setQuestionDraft({ ...questionDraft, quizId: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="">{t('choose_quiz')}</option>
                    {snapshot?.quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
                  </select>
                  <input placeholder={t('question_prompt')} value={questionDraft.prompt} onChange={(event) => setQuestionDraft({ ...questionDraft, prompt: event.target.value })} className="md:col-span-3 rounded border border-gray-300 px-3 py-2 text-sm" />
                  <select value={questionDraft.questionType} onChange={(event) => setQuestionDraft({ ...questionDraft, questionType: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="MULTIPLE_CHOICE">{t('multiple_choice')}</option>
                    <option value="TRUE_FALSE">{t('true_false')}</option>
                    <option value="SHORT_ANSWER">{t('short_answer')}</option>
                    <option value="ESSAY">{t('essay')}</option>
                  </select>
                  <button onClick={createQuestion} disabled={!questionDraft.quizId || !questionDraft.prompt} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded text-sm disabled:opacity-50"><Plus className="h-4 w-4" /> {t('add_question')}</button>
                </div>

                <div className="mt-4 space-y-3">
                  {(snapshot?.quizzes || []).map((quiz) => (
                    <div key={quiz.id} className="border border-gray-200 rounded p-3">
                      <div className="text-sm font-medium">{quiz.title}</div>
                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                        {(questionsByQuiz[quiz.id] || []).map((question) => <div key={question.id}>{question.position}. {question.prompt}</div>)}
                        {(questionsByQuiz[quiz.id] || []).length === 0 && <div>{t('no_questions_yet')}</div>}
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
          <div><h3 className="font-semibold">Canonical course relationships</h3><p className="text-xs text-gray-500">P13 relationship owner API · analyze, review and publish canonical IDs without direct DB writes.</p></div>
          <div className="flex gap-2"><button onClick={analyzeRelationships} disabled={saving} className="rounded border px-3 py-2 text-xs font-semibold">Analyze source terms</button><button onClick={projectMajors} disabled={saving || !relationships?.taxonomyLinks.some((item) => item.reviewState === 'APPROVED')} className="rounded border px-3 py-2 text-xs font-semibold disabled:opacity-50">Project majors</button></div>
        </div>
        {relationships ? <>
          <div className="grid gap-3 md:grid-cols-4 text-xs"><div className="rounded bg-gray-50 p-3">Language: <strong>{relationships.source.learningLanguageResolutionState}</strong></div><div className="rounded bg-gray-50 p-3">Approved taxonomy: <strong>{relationships.closure.approvedTaxonomyLinks}</strong></div><div className="rounded bg-gray-50 p-3">Approved majors: <strong>{relationships.closure.approvedMajorProjections}</strong></div><div className={`rounded p-3 ${relationships.closure.reviewRequired ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>{relationships.closure.reviewRequired ? 'Review required' : 'Relationships closed'}</div></div>
          <CanonicalPicker label={`Canonical learning language${relationships.source.learningLanguageRaw ? ` · source: ${relationships.source.learningLanguageRaw}` : ''}`} value={relationships.source.learningLanguageReferenceId} onChange={(next) => approveLanguage(next)} load={() => canonicalPickerApi.languages()} reloadKey="course-languages" optional />
          <div className="space-y-2"><h4 className="text-sm font-semibold">Taxonomy proposals</h4>{relationships.taxonomyLinks.map((link) => <div key={link.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-xs"><span><strong>{link.sourceTerm}</strong> → {link.taxonomyNodeId} · {link.relationshipType} · {link.reviewState}</span><div className="flex gap-2"><button disabled={link.reviewState === 'APPROVED'} onClick={() => reviewTaxonomy(link.id, 'approve')} className="text-green-700 disabled:opacity-40">Approve</button><button disabled={link.reviewState === 'REJECTED'} onClick={() => reviewTaxonomy(link.id, 'reject')} className="text-red-700 disabled:opacity-40">Reject</button></div></div>)}{relationships.taxonomyLinks.length === 0 ? <p className="text-xs text-gray-500">No taxonomy proposals. Run analysis first.</p> : null}</div>
          <div className="space-y-2"><h4 className="text-sm font-semibold">Major projections</h4>{relationships.majorProjections.map((projection) => <div key={projection.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-xs"><span>Major {projection.majorId} · {projection.relationshipType} · {projection.projectionState}</span><div className="flex gap-2"><button disabled={projection.projectionState === 'APPROVED'} onClick={() => reviewMajorProjection(projection.id, 'approve')} className="text-green-700 disabled:opacity-40">Approve</button><button disabled={projection.projectionState === 'REJECTED'} onClick={() => reviewMajorProjection(projection.id, 'reject')} className="text-red-700 disabled:opacity-40">Reject</button></div></div>)}{relationships.majorProjections.length === 0 ? <p className="text-xs text-gray-500">No major projections yet.</p> : null}</div>
        </> : <p className="text-xs text-gray-500">Relationship review model unavailable.</p>}
      </section>
    </div>
  );
}
