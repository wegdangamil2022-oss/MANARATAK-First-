import { BookOpen, ExternalLink, GraduationCap, Languages, Clock3, Eye, CheckCircle2 } from 'lucide-react';
import { certificateFact, studyFact, type CatalogRow } from './catalogState';
import { certificateLabels, studyLabels, useCourseCopy } from './useCourseCopy';

export function CourseCatalogResults({ rows, cards, selected, onSelect, onSelectPage, onOpen }: {
  rows: CatalogRow[]; cards: boolean; selected: Set<string>; onSelect: (row: CatalogRow, checked: boolean) => void;
  onSelectPage: (checked: boolean) => void; onOpen: (row: CatalogRow) => void;
}) {
  const { tr, ar, date, status } = useCourseCopy();
  const origin = (row: CatalogRow) => row.originType === 'NATIVE_MANARATAK_COURSE' ? tr('منارتك', 'Manaratak') : row.originType === 'EXTERNAL_LINKED_COURSE' ? tr('خارجية', 'External') : tr('تصنيف مدفوع قائم', 'Existing paid origin');
  const provider = (row: CatalogRow) => row.originType === 'EXTERNAL_LINKED_COURSE' ? row.providerDisplayName || row.providerName || row.platformName : row.instructor;
  const select = (row: CatalogRow) => <input type="checkbox" checked={selected.has(row.id)} aria-label={`${tr('تحديد', 'Select')} ${row.displayName}`} onChange={event => onSelect(row, event.target.checked)}/>;
  const name = (row: CatalogRow) => <><button className="course-name" type="button" onClick={() => onOpen(row)} title={row.displayName}>{row.displayName}</button>{row.originalSourceTitle && row.originalSourceTitle !== row.displayName && <small dir="auto">{row.originalSourceTitle}</small>}<small className="course-code" dir="ltr">{row.publicId}</small></>;
  const badges = (row: CatalogRow) => <><span className={`course-badge ${studyFact(row) === 'FREE' ? 'course-teal' : ''}`}>{studyLabels[studyFact(row)][ar ? 0 : 1]}</span><span className={`course-badge ${certificateFact(row) === 'FREE' ? 'course-gold' : ''}`}>{certificateLabels[certificateFact(row)][ar ? 0 : 1]}</span></>;
  const open = (row: CatalogRow) => <button className="course-primary" type="button" onClick={() => onOpen(row)}><Eye size={16}/>{row.originType === 'EXTERNAL_LINKED_COURSE' ? tr('التفاصيل', 'Details') : tr('إدارة الدورة', 'Manage course')}</button>;
  if (cards) return <div className="course-cards">{rows.map(row => <article className="course-card" key={row.id} data-course-id={row.id}>
    <header><span className="course-badge">{row.originType === 'EXTERNAL_LINKED_COURSE' ? <ExternalLink size={15}/> : <GraduationCap size={15}/>}{origin(row)}</span>{select(row)}</header>
    <div className="course-name-block">{name(row)}</div><p className="course-provider">{provider(row) || tr('الجهة / المدرب غير متوفر', 'Provider / instructor unavailable')}</p>
    <div className="course-facts">{badges(row)}</div><p className="course-field-line"><BookOpen size={16}/>{row.relatedMajors?.map(major => major.name).join('، ') || row.category || tr('لا يوجد تصنيف معتمد', 'No approved classification')}</p>
    <dl><div><dt><Languages size={15}/>{tr('اللغة', 'Language')}</dt><dd>{row.learningLanguage || tr('غير محددة', 'Unspecified')}</dd></div><div><dt><Clock3 size={15}/>{tr('المدة', 'Duration')}</dt><dd>{row.studyDuration || tr('غير محددة', 'Unspecified')}</dd></div></dl>
    <footer><span className={`course-badge ${row.status === 'PUBLISHED' ? 'course-teal' : ''}`}><CheckCircle2 size={14}/>{status(row.status)}</span>{open(row)}</footer>
  </article>)}</div>;
  return <div className="course-table-scroll" role="region" tabIndex={0} aria-label={tr('جدول الدورات — قابل للتمرير أفقيًا', 'Courses table — scroll horizontally')}><table className="course-table"><thead><tr>
    <th><input type="checkbox" aria-label={tr('تحديد الصفحة الحالية', 'Select current page')} ref={node => { if (node) node.indeterminate = rows.some(row => selected.has(row.id)) && !rows.every(row => selected.has(row.id)); }} checked={rows.length > 0 && rows.every(row => selected.has(row.id))} onChange={event => onSelectPage(event.target.checked)}/></th>
    {[tr('الدورة', 'Course'), tr('النوع', 'Origin'), tr('المزود / المدرب', 'Provider / instructor'), tr('الدراسة والشهادة', 'Study and certificate'), tr('الحالة', 'Status'), tr('آخر تحديث', 'Updated'), tr('الإجراء', 'Action')].map(label => <th key={label} scope="col">{label}</th>)}
  </tr></thead><tbody>{rows.map(row => <tr key={row.id} data-course-id={row.id}>
    <td>{select(row)}</td><td className="course-name-block">{name(row)}</td><td>{origin(row)}</td><td>{provider(row) || tr('غير متوفر', 'Unavailable')}</td><td><div className="course-facts">{badges(row)}</div></td><td><span className={`course-badge ${row.status === 'PUBLISHED' ? 'course-teal' : ''}`}>{status(row.status)}</span></td><td>{date(row.updatedAt)}</td><td>{open(row)}</td>
  </tr>)}</tbody></table></div>;
}
