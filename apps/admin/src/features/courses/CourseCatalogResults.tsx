import { BookOpen, ExternalLink, GraduationCap, Languages, Clock3, Eye, CheckCircle2 } from 'lucide-react';
import { certificateFact, studyFact, type CatalogRow, type NativeLearningCounts } from './catalogState';
import { certificateLabels, studyLabels, useCourseCopy } from './useCourseCopy';
import { arabicCourseValue, courseNames, courseProviderNames } from './coursePresentation';

export function CourseCatalogResults({ rows, cards, selected, onSelect, onSelectPage, onOpen, native, nativeLearning }: {
  rows: CatalogRow[]; cards: boolean; selected: Set<string>; onSelect: (row: CatalogRow, checked: boolean) => void;
  onSelectPage: (checked: boolean) => void; onOpen: (row: CatalogRow) => void;
  native?: boolean; nativeLearning?: Record<string, NativeLearningCounts>;
}) {
  const { tr, ar, date, status, number } = useCourseCopy();
  const externalOnly = rows.length > 0 && rows.every(row => row.originType === 'EXTERNAL_LINKED_COURSE');
  const learning = (row: CatalogRow) => <dl className="course-row-learning">{([
    ['enrollments', tr('التسجيلات', 'Enrollments')], ['started', tr('بدأوا', 'Started')], ['completions', tr('الإكمالات', 'Completions')],
  ] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{nativeLearning?.[row.id] ? number(nativeLearning[row.id][key]) : '—'}</dd></div>)}</dl>;
  const origin = (row: CatalogRow) => row.originType === 'NATIVE_MANARATAK_COURSE' ? tr('منارتك', 'Manaratak') : row.originType === 'EXTERNAL_LINKED_COURSE' ? tr('خارجية', 'External') : tr('تصنيف مدفوع قائم', 'Existing paid origin');
  const provider = (row: CatalogRow) => {
    if (row.originType !== 'EXTERNAL_LINKED_COURSE') return row.instructor;
    const names = courseProviderNames(row);
    return <span className="course-provider-pair">{names.arabic && <span lang="ar" dir="rtl">{names.arabic}</span>}{names.english && <small lang="en" dir="ltr">{names.english}</small>}</span>;
  };
  const select = (row: CatalogRow) => <input type="checkbox" checked={selected.has(row.id)} aria-label={`${tr('تحديد', 'Select')} ${row.displayName}`} onChange={event => onSelect(row, event.target.checked)}/>;
  const name = (row: CatalogRow) => {
    if (row.originType !== 'EXTERNAL_LINKED_COURSE') return <button className="course-name" type="button" onClick={() => onOpen(row)}>{row.displayName}</button>;
    const names = courseNames(row);
    return <><button className="course-name" type="button" onClick={() => onOpen(row)} lang="ar" dir="rtl">{names.arabic || tr('لم يُضف الاسم العربي', 'Arabic name not added')}</button>{names.english && <small className="course-english-name" lang="en" dir="ltr">{names.english}</small>}</>;
  };
  const badges = (row: CatalogRow) => <><span className={`course-badge ${studyFact(row) === 'FREE' ? 'course-teal' : ''}`}>{studyLabels[studyFact(row)][ar ? 0 : 1]}</span><span className={`course-badge ${certificateFact(row) === 'FREE' ? 'course-gold' : ''}`}>{certificateLabels[certificateFact(row)][ar ? 0 : 1]}</span></>;
  const open = (row: CatalogRow) => <button className="course-primary" type="button" onClick={() => onOpen(row)}><Eye size={16}/>{row.originType === 'EXTERNAL_LINKED_COURSE' ? tr('التفاصيل', 'Details') : tr('إدارة الدورة', 'Manage course')}</button>;
  if (cards) return <div className="course-cards">{rows.map(row => <article className="course-card" key={row.id} data-course-id={row.id}>
    <header><span className="course-badge">{row.originType === 'EXTERNAL_LINKED_COURSE' ? <ExternalLink size={15}/> : <GraduationCap size={15}/>}{origin(row)}</span>{select(row)}</header>
    <div className="course-name-block">{name(row)}</div><div className="course-provider">{provider(row) || tr('الجهة / المدرب غير متوفر', 'Provider / instructor unavailable')}</div>
    <div className="course-facts">{badges(row)}</div>{row.originType !== 'EXTERNAL_LINKED_COURSE' && (row.relatedMajors?.length || row.category) ? <p className="course-field-line"><BookOpen size={15}/>{row.relatedMajors?.map(major => major.name).join('، ') || row.category}</p> : null}
    <dl><div><dt><Languages size={14}/>{tr('اللغة', 'Language')}</dt><dd>{ar ? arabicCourseValue(row.learningLanguage) : row.learningLanguage || tr('غير محددة', 'Unspecified')}</dd></div><div><dt><Clock3 size={14}/>{tr('المدة', 'Duration')}</dt><dd>{ar ? arabicCourseValue(row.studyDuration) : row.studyDuration || tr('غير محددة', 'Unspecified')}</dd></div></dl>
    {native && learning(row)}
    <footer><span className={`course-badge ${row.status === 'PUBLISHED' ? 'course-teal' : ''}`}><CheckCircle2 size={14}/>{status(row.status)}</span>{open(row)}</footer>
  </article>)}</div>;
  return <div className="course-table-scroll" role="region" tabIndex={0} aria-label={tr('جدول الدورات — قابل للتمرير أفقيًا', 'Courses table — scroll horizontally')}><table className="course-table"><thead><tr>
    <th><input type="checkbox" aria-label={tr('تحديد الصفحة الحالية', 'Select current page')} ref={node => { if (node) node.indeterminate = rows.some(row => selected.has(row.id)) && !rows.every(row => selected.has(row.id)); }} checked={rows.length > 0 && rows.every(row => selected.has(row.id))} onChange={event => onSelectPage(event.target.checked)}/></th>
    {[tr('الدورة', 'Course'), ...(!externalOnly ? [tr('النوع', 'Origin')] : []), tr('الجهة المقدمة', 'Provider'), tr('الدراسة والشهادة', 'Study and certificate'), ...(externalOnly ? [tr('اللغة والمدة', 'Language and duration')] : []), tr('الحالة', 'Status'), ...(native ? [tr('التعلم — فوج التسجيل المحدد', 'Learning — selected cohort')] : []), ...(!externalOnly ? [tr('آخر تحديث', 'Updated')] : []), tr('الإجراء', 'Action')].map(label => <th key={label} scope="col">{label}</th>)}
  </tr></thead><tbody>{rows.map(row => <tr key={row.id} data-course-id={row.id}>
    <td>{select(row)}</td><td className="course-name-block">{name(row)}</td>{!externalOnly && <td>{origin(row)}</td>}<td>{provider(row) || tr('غير متوفر', 'Unavailable')}</td><td><div className="course-facts">{badges(row)}</div></td>{externalOnly && <td><div className="course-provider-pair"><span>{ar ? arabicCourseValue(row.learningLanguage) : row.learningLanguage}</span><small>{ar ? arabicCourseValue(row.studyDuration) : row.studyDuration}</small></div></td>}<td><span className={`course-badge ${row.status === 'PUBLISHED' ? 'course-teal' : ''}`}>{status(row.status)}</span></td>{native && <td>{learning(row)}</td>}{!externalOnly && <td>{date(row.updatedAt)}</td>}<td>{open(row)}</td>
  </tr>)}</tbody></table></div>;
}
