import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CourseCurriculumSnapshotDto } from '@manaratak/domain';
import { BookOpen, Plus, Paperclip, Layers, Pencil, Copy } from 'lucide-react';
import { CourseDraftStructurePanel } from '../../components/CourseDraftStructurePanel';
import { AssetPicker } from '../../components/AssetPicker';
import { NativeLessonBlockEditor } from './NativeLessonBlockEditor';
import { useCourseCopy } from './useCourseCopy';
import { NativeCurriculumCopyDialog } from './NativeCourseCopyDialog';
import { NativeCourseMediaUpload } from './NativeCourseMediaUpload';
export type NativeCourseCommand = (path: string, body?: object, method?: string) => Promise<unknown>;
export function NativeCourseCurriculumPanel({
  id,
  version,
  reason,
  status,
  snapshot,
  busy,
  dirty,
  onDirty,
  command,
  reload,
  canEdit=true,
}: {
  id: string;
  version: number;
  reason: string;
  status: string;
  snapshot: CourseCurriculumSnapshotDto;
  busy: boolean;
  dirty: boolean;
  onDirty: (value: boolean) => void;
  command: NativeCourseCommand;
  reload: () => Promise<void>;
  canEdit?:boolean;
}) {
  const { tr } = useCourseCopy();
  const [params, setParams] = useSearchParams();
  const modules = snapshot.modules
    .filter((module) => module.status !== 'ARCHIVED')
    .sort((a, b) => a.position - b.position);
  const lessons = snapshot.lessons
    .filter((lesson) => lesson.status !== 'ARCHIVED')
    .sort((a, b) => a.position - b.position);
  const [selected, setSelected] = useState(
      lessons.some((lesson) => lesson.id === params.get('lesson'))
        ? params.get('lesson')!
        : (lessons[0]?.id ?? ''),
    ),
    [mode, setMode] = useState('blocks'),
    [search, setSearch] = useState('');
  const [title, setTitle] = useState(''),
    [moduleId, setModuleId] = useState(modules[0]?.id ?? ''),
    [assetId, setAssetId] = useState(''),
    [assetType, setAssetType] = useState('VIDEO');
  const [description, setDescription] = useState(''),
    [duration, setDuration] = useState('');
  const [copy, setCopy] = useState<{kind: 'modules' | 'lessons'; id: string}>();
  const openCopy = (kind: 'modules' | 'lessons', target: string) => { if (dirty && !window.confirm(tr('تجاهل التعديلات غير المحفوظة؟', 'Discard unsaved changes?'))) return; onDirty(false); setCopy({kind, id: target}); };
  const editable = canEdit && !['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(status),
    lesson = lessons.find((lesson) => lesson.id === selected);
  const switchMode = (next: string, lessonId = selected) => {
    if (
      dirty &&
      !window.confirm(
        tr('تجاهل تعديلات المحاضرة غير المحفوظة؟', 'Discard unsaved lecture changes?'),
      )
    )
      return;
    const targetLesson = lessons.find((lesson) => lesson.id === lessonId),
      targetModule = modules.find((module) => module.id === lessonId);
    onDirty(false);
    setMode(next);
    setSelected(next === 'module-metadata' ? selected : lessonId);
    setTitle(
      next === 'metadata'
        ? (targetLesson?.title ?? '')
        : next === 'module-metadata'
          ? (targetModule?.title ?? '')
          : '',
    );
    setDescription(
      next === 'metadata'
        ? (targetLesson?.summary ?? '')
        : next === 'module-metadata'
          ? (targetModule?.description ?? '')
          : '',
    );
    setDuration(next === 'metadata' ? String(targetLesson?.estimatedDurationMinutes ?? '') : '');
    if (next === 'module-metadata') setModuleId(lessonId);
    if (lessons.some((lesson) => lesson.id === lessonId))
      setParams(
        (previous) => {
          const nextParams = new URLSearchParams(previous);
          nextParams.set('lesson', lessonId);
          return nextParams;
        },
        { replace: true },
      );
    setAssetId('');
  };
  const form = (kind: string) => (
    <form
      className="course-panel course-section-form"
      onSubmit={(event) => {
        event.preventDefault();
        const request =
          kind === 'module'
            ? command('modules', {
                title,
                description,
                position: Math.max(0, ...snapshot.modules.map((module) => module.position)) + 1,
              })
            : kind === 'module-metadata'
              ? command(`modules/${moduleId}`, { title, description }, 'PATCH')
              : kind === 'lesson'
                ? command(`modules/${moduleId}/lessons`, {
                    title,
                    summary: description,
                    ...(duration ? { estimatedDurationMinutes: Number(duration) } : {}),
                    lessonType: 'MIXED',
                    position:
                      Math.max(
                        0,
                        ...snapshot.lessons
                          .filter((lesson) => lesson.moduleId === moduleId)
                          .map((lesson) => lesson.position),
                      ) + 1,
                  })
                : kind === 'metadata'
                  ? command(
                      `lessons/${selected}`,
                      {
                        title,
                        summary: description,
                        estimatedDurationMinutes: duration ? Number(duration) : null,
                      },
                      'PATCH',
                    )
                  : command(`lessons/${selected}/assets`, {
                      assetId,
                      assetType,
                      title,
                      position:
                        Math.max(
                          0,
                          ...snapshot.assets
                            .filter((asset) => asset.lessonId === selected)
                            .map((asset) => asset.position),
                        ) + 1,
                    });
        void request
          .then(() => {
            setTitle('');
            setAssetId('');
          })
          .catch(() => undefined);
      }}
    >
      <h3>
        {kind === 'module'
          ? tr('إضافة وحدة', 'Add module')
          : kind === 'module-metadata'
            ? tr('تعديل الوحدة', 'Edit module')
            : kind === 'lesson'
              ? tr('إضافة محاضرة', 'Add lecture')
              : kind === 'metadata'
                ? tr('تعديل المحاضرة', 'Edit lecture')
                : tr('إضافة ملف للمحاضرة', 'Attach lecture file')}
      </h3>
      {kind === 'lesson' && (
        <label className="course-field">
          <span>{tr('الوحدة', 'Module')}</span>
          <select
            required
            value={moduleId}
            onChange={(event) => {
              setModuleId(event.target.value);
              onDirty(true);
            }}
          >
            <option value="">{tr('اختر وحدة', 'Choose module')}</option>
            {modules.map((module) => (
              <option value={module.id} key={module.id}>
                {module.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="course-field">
        <span>{tr('العنوان', 'Title')}</span>
        <input
          required
          maxLength={500}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            onDirty(true);
          }}
        />
      </label>
      {kind !== 'attach' && (
        <label className="course-field">
          <span>{tr('الوصف والأهداف', 'Description and objectives')}</span>
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              onDirty(true);
            }}
          />
        </label>
      )}
      {['lesson', 'metadata'].includes(kind) && (
        <label className="course-field">
          <span>
            {tr('المدة التقريبية بالدقائق — اختياري', 'Estimated duration in minutes — optional')}
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={duration}
            onChange={(event) => {
              setDuration(event.target.value);
              onDirty(true);
            }}
          />
        </label>
      )}
      {kind === 'attach' && (
        <>
          <label className="course-field">
            <span>{tr('نوع الملف', 'File type')}</span>
            <select
              value={assetType}
              onChange={(event) => {
                setAssetType(event.target.value);
                setAssetId('');
                onDirty(true);
              }}
            >
              {['VIDEO', 'AUDIO', 'IMAGE', 'PDF', 'DOCUMENT', 'SUBTITLE', 'OTHER'].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <AssetPicker
            purpose={`COURSE_LESSON_MEDIA:${assetType}`}
            value={assetId}
            onChange={(value) => {
              setAssetId(value);
              onDirty(true);
            }}
            mimeTypePrefix={
              (
                {
                  VIDEO: 'video/',
                  AUDIO: 'audio/',
                  IMAGE: 'image/',
                  PDF: 'application/pdf',
                  SUBTITLE: 'text/',
                } as Record<string, string>
              )[assetType]
            }
          />
        </>
      )}
      <button
        className="course-primary"
        disabled={!editable || busy || (kind === 'attach' && !assetId)}
        type="submit"
      >
        {tr('حفظ', 'Save')}
      </button>
    </form>
  );
  return (
    <section className="native-curriculum">
      <div className="course-drawer-toolbar">
        <button type="button" disabled={!editable || busy} onClick={() => switchMode('module')}>
          <Plus size={16} />
          {tr('إضافة وحدة', 'Add module')}
        </button>
        <button
          type="button"
          disabled={!editable || busy || !modules.length}
          onClick={() => switchMode('lesson')}
        >
          <Plus size={16} />
          {tr('إضافة محاضرة', 'Add lecture')}
        </button>
        <button type="button" onClick={() => switchMode('structure')}>
          <Layers size={16} />
          {tr('ترتيب وأرشفة المنهج', 'Arrange and archive curriculum')}
        </button>
      </div>
      <div className="native-curriculum-layout">
        <nav
          className="course-panel native-curriculum-tree"
          aria-label={tr('فهرس الوحدات والمحاضرات', 'Modules and lectures')}
        >
          <label className="course-field">
            <span>{tr('بحث في المنهج', 'Search curriculum')}</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          {modules.map((module) => {
            const children = lessons.filter(
              (lesson) =>
                lesson.moduleId === module.id &&
                (lesson.title + module.title).toLowerCase().includes(search.toLowerCase()),
            );
            return (
              <section key={module.id}>
                <h4>
                  <BookOpen size={16} />
                  {module.title}
                  <button type="button" aria-label={tr('نسخ الوحدة', 'Copy module')} disabled={!editable || busy} onClick={() => openCopy('modules', module.id)}><Copy size={15}/></button>
                  <button
                    type="button"
                    aria-label={tr('تعديل الوحدة', 'Edit module')}
                    disabled={!editable || busy}
                    onClick={() => switchMode('module-metadata', module.id)}
                  >
                    <Pencil size={15} />
                  </button>
                </h4>
                {children.map((lesson) => (
                  <button
                    type="button"
                    key={lesson.id}
                    aria-current={selected === lesson.id ? 'true' : undefined}
                    onClick={() => switchMode('blocks', lesson.id)}
                  >
                    {lesson.position}. {lesson.title}
                  </button>
                ))}
              </section>
            );
          })}
          {modules.length === 0 && (
            <p>{tr('ابدأ بإضافة أول وحدة.', 'Start by adding a module.')}</p>
          )}
        </nav>
        <div className="native-lecture-content">
          {copy && <NativeCurriculumCopyDialog kind={copy.kind} id={copy.id} command={command} onClose={() => setCopy(undefined)}/>}
          {mode === 'structure' ? (
            <CourseDraftStructurePanel
              courseId={id}
              version={version}
              status={status}
              snapshot={snapshot}
              onSaved={reload}
            />
          ) : ['module', 'module-metadata', 'lesson', 'attach', 'metadata'].includes(mode) ? (
            form(mode)
          ) : lesson ? (
            <>
              <header className="course-section-heading">
                <h3>{lesson.title}</h3>
                <div className="course-drawer-toolbar">
                  <button
                    type="button"
                    disabled={!editable || busy}
                    onClick={() => switchMode('metadata')}
                  >
                    <Pencil size={16} />
                    {tr('العنوان', 'Title')}
                  </button>
                  <button
                    type="button"
                    disabled={!editable || busy}
                    onClick={() => switchMode('attach')}
                  >
                    <Paperclip size={16} />
                    {tr('إضافة ملف', 'Attach file')}
                  </button>
                  <button type="button" disabled={!editable || busy} onClick={() => openCopy('lessons', lesson.id)}><Copy size={16}/>{tr('نسخ المحاضرة', 'Copy lecture')}</button>
                  <button type="button" disabled={!editable || busy} onClick={() => switchMode(mode === 'upload' ? 'blocks' : 'upload')}>{mode === 'upload' ? tr('تحرير المحتوى', 'Edit content') : tr('رفع ملف جديد', 'Upload new media')}</button>
                </div>
              </header>
              {mode === 'upload' ? <NativeCourseMediaUpload key={lesson.id} courseId={id} lessonId={lesson.id} version={version} reason={reason} attachedAssetIds={snapshot.assets.filter(row => row.lessonId === lesson.id).map(row => row.assetId)} onDirty={onDirty} onAttach={asset => command(`lessons/${lesson.id}/assets`, { ...asset, position: Math.max(0, ...snapshot.assets.filter(row => row.lessonId === lesson.id).map(row => row.position)) + 1 })}/> : <>
              {lesson.contentText && (
                <section className="course-panel">
                  <h4>{tr('النص السابق المحفوظ', 'Preserved existing text')}</h4>
                  <p className="native-preserved-text">{lesson.contentText}</p>
                  <button type="button" disabled={!editable || busy || dirty} onClick={() => { if (window.confirm(tr('تحويل النص المحفوظ إلى كتل قابلة للتحرير؟ سيحفظ ترتيبه والنص كاملًا، وتبقى النسخ التاريخية.', 'Convert preserved text into editable blocks? The full text and ordering are retained, and historical versions remain.'))) void command(`lessons/${lesson.id}/convert-text`, {}).catch(() => undefined); }}>{tr('تحويل النص إلى كتل', 'Convert text to blocks')}</button>
                </section>
              )}
              <NativeLessonBlockEditor
                key={`${lesson.id}:${version}`}
                lessonId={lesson.id}
                snapshot={snapshot}
                editable={editable}
                busy={busy}
                onDirty={onDirty}
                onSave={(blocks) =>
                  command(`lessons/${lesson.id}/content-blocks`, { blocks }, 'PUT')
                }
              />
              </>}
            </>
          ) : (
            <p className="course-panel">
              {tr('اختر محاضرة أو أضف محاضرة جديدة.', 'Select a lecture or create one.')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
