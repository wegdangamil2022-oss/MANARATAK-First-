import { useState } from 'react';
import {
  courseBlockTypes,
  type CourseContentBlockInput,
  type CourseCurriculumSnapshotDto,
} from '@manaratak/domain';
import { ArrowUp, ArrowDown, Plus, Save, Trash2, GripVertical, Undo2, Eye } from 'lucide-react';
import { useCourseCopy } from './useCourseCopy';
import { NativeLessonBlockPreview } from './NativeLessonBlockPreview';
const names = {
  TEXT: ['نص', 'Text'],
  HEADING: ['عنوان فاصل', 'Heading'],
  CODE: ['مثال برمجي', 'Code'],
  TABLE: ['جدول', 'Table'],
  LINK: ['مرجع', 'Reference'],
  VIDEO: ['فيديو', 'Video'],
  AUDIO: ['صوت', 'Audio'],
  IMAGE: ['صورة', 'Image'],
  FILE: ['ملف', 'File'],
  QUIZ: ['اختبار', 'Assessment'],
};
export function NativeLessonBlockEditor({
  lessonId,
  snapshot,
  editable,
  busy,
  onDirty,
  onSave,
}: {
  lessonId: string;
  snapshot: CourseCurriculumSnapshotDto;
  editable: boolean;
  busy: boolean;
  onDirty: (value: boolean) => void;
  onSave: (blocks: CourseContentBlockInput[]) => Promise<unknown>;
}) {
  const { tr, ar } = useCourseCopy();
  const initial = (snapshot.contentBlocks ?? [])
    .filter((block) => block.lessonId === lessonId)
    .sort((a, b) => a.position - b.position)
    .map(({ id, type, payload, assetReferenceId, quizId }) => ({
      id,
      type,
      payload,
      assetReferenceId,
      quizId,
    }));
  const [blocks, setBlocks] = useState<CourseContentBlockInput[]>(initial),
    [type, setType] = useState<(typeof courseBlockTypes)[number]>('TEXT'),
    [drag, setDrag] = useState<number>();
  const [preview, setPreview] = useState(false);
  const change = (next: CourseContentBlockInput[]) => {
    setBlocks(next);
    onDirty(true);
  };
  const update = (index: number, values: Partial<CourseContentBlockInput>) =>
    change(blocks.map((block, i) => (i === index ? { ...block, ...values } : block)));
  const move = (index: number, target: number) => {
    if (target < 0 || target >= blocks.length || target === index) return;
    const next = [...blocks],
      [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    change(next);
  };
  const input = (
    block: CourseContentBlockInput,
    index: number,
    key: string,
    label: string,
    multiline = false,
  ) => (
    <label className="course-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          aria-label={label}
          disabled={!editable || busy}
          value={String(block.payload[key] ?? '')}
          onChange={(event) =>
            update(index, { payload: { ...block.payload, [key]: event.target.value } })
          }
        />
      ) : (
        <input
          aria-label={label}
          disabled={!editable || busy}
          value={String(block.payload[key] ?? '')}
          onChange={(event) =>
            update(index, { payload: { ...block.payload, [key]: event.target.value } })
          }
        />
      )}
    </label>
  );
  return (
    <section className="course-panel native-block-editor">
      <h3>{tr('كتل محتوى المحاضرة', 'Lecture content blocks')}</h3>
      <p className="course-hint">
        {tr(
          'رتب المحتوى بالسحب أو أزرار النقل، ثم احفظ المحاضرة. الملفات تُفتح عبر صلاحية الطالب؛ لا روابط وسائط خام.',
          'Drag or use move buttons, then save. Files use authorized learner delivery; no raw media URLs.',
        )}
      </p>
      <button type="button" aria-pressed={preview} onClick={() => setPreview((value) => !value)}>
        <Eye size={16} />
        {tr('معاينة المحتوى الحالي', 'Preview current content')}
      </button>
      {preview && <NativeLessonBlockPreview blocks={blocks} snapshot={snapshot} />}
      {blocks.map((block, index) => (
        <article
          className="native-block"
          key={block.id}
          data-block-id={block.id}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (drag !== undefined && editable && !busy) move(drag, index);
            setDrag(undefined);
          }}
        >
          <header>
            <strong>
              {index + 1}. {names[block.type][ar ? 0 : 1]}
            </strong>
            <div>
              <button
                type="button"
                draggable={editable && !busy}
                onDragStart={(event) => {
                  setDrag(index);
                  event.dataTransfer.setData('text/plain', block.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDrag(undefined)}
                aria-label={tr('اسحب لنقل الكتلة', 'Drag to move block')}
                disabled={!editable || busy}
              >
                <GripVertical size={16} />
              </button>
              <button
                type="button"
                aria-label={tr('نقل لأعلى', 'Move up')}
                disabled={!editable || busy || index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                aria-label={tr('نقل لأسفل', 'Move down')}
                disabled={!editable || busy || index === blocks.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                aria-label={tr('إزالة الكتلة من المسودة', 'Remove draft block')}
                disabled={!editable || busy}
                onClick={() => change(blocks.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </header>
          {['TEXT', 'HEADING', 'CODE'].includes(block.type) &&
            input(block, index, 'text', tr('المحتوى', 'Content'), block.type !== 'HEADING')}
          {block.type === 'TEXT' && (
            <label className="course-field">
              <span>{tr('تنسيق النص', 'Text format')}</span>
              <select
                disabled={!editable || busy}
                value={String(block.payload.format ?? 'PARAGRAPH')}
                onChange={(event) =>
                  update(index, { payload: { ...block.payload, format: event.target.value } })
                }
              >
                {[
                  ['PARAGRAPH', tr('فقرات', 'Paragraphs')],
                  ['BULLETS', tr('قائمة نقطية', 'Bulleted list')],
                  ['NUMBERED', tr('قائمة مرقمة', 'Numbered list')],
                ].map(([value, title]) => (
                  <option key={value} value={value}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {block.type === 'CODE' &&
            input(block, index, 'language', tr('لغة المثال', 'Example language'))}
          {block.type === 'TABLE' && (
            <label className="course-field">
              <span>
                {tr(
                  'صف لكل سطر؛ افصل الأعمدة بعلامة |، والصف الأول عناوين',
                  'One row per line; separate columns with |. First row is the header.',
                )}
              </span>
              <textarea
                disabled={!editable || busy}
                value={((block.payload.rows ?? []) as string[][])
                  .map((row) => row.join('|'))
                  .join('\n')}
                onChange={(event) =>
                  update(index, {
                    payload: { rows: event.target.value.split('\n').map((row) => row.split('|')) },
                  })
                }
              />
            </label>
          )}
          {block.type === 'LINK' && (
            <>
              {input(block, index, 'title', tr('اسم المرجع', 'Reference title'))}
              {input(block, index, 'url', tr('رابط HTTPS', 'HTTPS URL'))}
            </>
          )}
          {['VIDEO', 'AUDIO', 'IMAGE', 'FILE'].includes(block.type) && (
            <>
              {input(
                block,
                index,
                block.type === 'IMAGE' ? 'alt' : 'title',
                block.type === 'IMAGE'
                  ? tr('النص البديل للصورة', 'Image alternative text')
                  : tr('عنوان الملف', 'File title'),
              )}
              {input(block, index, 'caption', tr('شرح اختياري', 'Optional caption'))}
              <label className="course-field">
                <span>{tr('ملف المحاضرة المعتمد', 'Approved lecture attachment')}</span>
                <select
                  aria-label={tr('ملف المحاضرة المعتمد', 'Approved lecture attachment')}
                  disabled={!editable || busy}
                  value={block.assetReferenceId ?? ''}
                  onChange={(event) =>
                    update(index, { assetReferenceId: event.target.value || null })
                  }
                >
                  <option value="">
                    {tr('اختر ملفًا مضافًا للمحاضرة', 'Choose an attached lecture file')}
                  </option>
                  {snapshot.assets
                    .filter(
                      (asset) =>
                        asset.lessonId === lessonId &&
                        (block.type === 'FILE' || asset.assetType === block.type),
                    )
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.title || asset.assetType}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          {block.type === 'VIDEO' && <><label className="course-field"><span>{tr('ترجمة الفيديو VTT — اختياري', 'Video captions VTT — optional')}</span><select aria-label={tr('ترجمة الفيديو VTT — اختياري', 'Video captions VTT — optional')} disabled={!editable || busy} value={String(block.payload.subtitleReferenceId ?? '')} onChange={event => { const { subtitleReferenceId: _ref, subtitleLanguage: _language, ...rest } = block.payload; update(index, { payload: { ...rest, ...(event.target.value ? { subtitleReferenceId: event.target.value, subtitleLanguage: 'ar' } : {}) } }); }}><option value="">{tr('دون ترجمة مرفقة', 'No caption attachment')}</option>{snapshot.assets.filter(asset => asset.lessonId === lessonId && asset.assetType === 'SUBTITLE').map(asset => <option key={asset.id} value={asset.id}>{asset.title || 'VTT'}</option>)}</select></label>{Boolean(block.payload.subtitleReferenceId) && input(block, index, 'subtitleLanguage', tr('رمز لغة الترجمة — مثل ar أو en', 'Caption language code — e.g. ar or en'))}</>}
          {block.type === 'QUIZ' && (
            <>
              <label className="course-field">
                <span>{tr('اختبار المحاضرة', 'Lecture assessment')}</span>
                <select
                  aria-label={tr('اختبار المحاضرة', 'Lecture assessment')}
                  disabled={!editable || busy}
                  value={block.quizId ?? ''}
                  onChange={(event) => update(index, { quizId: event.target.value || null })}
                >
                  <option value="">
                    {tr(
                      'اختر اختبارًا مرتبطًا بهذه المحاضرة',
                      'Choose an assessment belonging to this lecture',
                    )}
                  </option>
                  {snapshot.quizzes
                    .filter((quiz) => quiz.lessonId === lessonId && quiz.status !== 'ARCHIVED')
                    .map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </option>
                    ))}
                </select>
              </label>
              {input(block, index, 'title', tr('عنوان العرض الاختياري', 'Optional display title'))}
            </>
          )}
        </article>
      ))}
      {blocks.length === 0 && (
        <p>
          {tr(
            'لا توجد كتل محفوظة. النص والمرفقات السابقة محفوظة كما هي.',
            'No saved blocks. Existing text and attachments are preserved.',
          )}
        </p>
      )}
      <div className="course-drawer-toolbar">
        <select
          aria-label={tr('نوع الكتلة الجديدة', 'New block type')}
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          disabled={!editable || busy}
        >
          {courseBlockTypes.map((type) => (
            <option value={type} key={type}>
              {names[type][ar ? 0 : 1]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!editable || busy || blocks.length >= 200}
          onClick={() =>
            change([
              ...blocks,
              {
                id: crypto.randomUUID(),
                type,
                payload: type === 'TABLE' ? { rows: [['', '']] } : {},
                assetReferenceId: null,
                quizId: null,
              },
            ])
          }
        >
          <Plus size={16} />
          {tr('إضافة محتوى', 'Add content')}
        </button>
        <button
          type="button"
          className="course-primary"
          disabled={!editable || busy}
          onClick={() => void onSave(blocks).catch(() => undefined)}
        >
          <Save size={16} />
          {tr('حفظ كتل المحاضرة', 'Save lecture blocks')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBlocks(initial);
            onDirty(false);
          }}
        >
          <Undo2 size={16} />
          {tr('إلغاء التعديلات', 'Discard changes')}
        </button>
      </div>
    </section>
  );
}
