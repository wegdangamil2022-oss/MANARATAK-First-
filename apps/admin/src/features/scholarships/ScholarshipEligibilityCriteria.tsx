import { useRef } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { ScholarshipEligibilityItemDto } from '@manaratak/domain';
import { scholarshipCardKey } from './ScholarshipPresentation';
import {
  scholarshipCriterionSections,
  withScholarshipCriterionSections,
} from './ScholarshipCriteria';

export function ScholarshipEligibilityCriteria({
  items,
  language,
  onEdit,
  onChange,
  focusField,
}: {
  items: ScholarshipEligibilityItemDto[];
  language: string;
  onEdit?: (field?: string) => void;
  onChange?: (items: ScholarshipEligibilityItemDto[]) => void;
  focusField?: string;
}) {
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  let number = 0;
  const headings = {
    general: '',
    alternatives: tr(
      'بدائل إثبات اللغة — تُراجع مع الإعفاءات وشروط فئة المتقدم',
      'Alternative language evidence — subject to exemptions and applicant-specific rules',
    ),
    exemptions: tr('الإعفاءات وشروط فئات المتقدمين', 'Exemptions and applicant-specific rules'),
    excluded: tr('الاختبارات والصيغ غير المقبولة', 'Excluded tests and delivery modes'),
    delivery: tr('إرسال الدرجات وضوابطها', 'Score delivery and conditions'),
  };
  return (
    <section className="scholarship-read-card scholarship-criteria-panel">
      <div className="scholarship-criteria-heading">
        <h2>
          <ShieldCheck aria-hidden="true" />
          {tr('الشروط ومعايير التقديم', 'Application conditions and criteria')}
        </h2>
        {onEdit && (
          <button type="button" className="scholarship-card-edit" onClick={() => onEdit()}>
            <Pencil aria-hidden="true" />
            {tr('تعديل الشروط', 'Edit criteria')}
          </button>
        )}
      </div>
      {items.map((item) => {
        const sections = scholarshipCriterionSections(item);
        return (
          <div key={item.itemKey} className="scholarship-criteria-source">
            {sections.map((section) => (
              <div key={section.id} className="scholarship-criteria-section">
                {headings[section.kind] && <h3>{headings[section.kind]}</h3>}
                <ul className="scholarship-criteria-list">
                  {section.parts.map((part) => {
                    const index = ++number;
                    const label = tr(`نص الشرط ${index}`, `Criterion text ${index}`);
                    return (
                      <li key={part.id} className="scholarship-criterion">
                        <span className="scholarship-criterion-dot" aria-hidden="true" />
                        {onChange ? (
                          <CriterionInput
                            text={part.text}
                            label={label}
                            focus={focusField === part.id}
                            onChange={(text) =>
                              onChange(
                                items.map((row) =>
                                  row.itemKey !== item.itemKey
                                    ? row
                                    : withScholarshipCriterionSections(
                                        item,
                                        sections.map((group) => ({
                                          ...group,
                                          parts: group.parts.map((value) =>
                                            value.id === part.id ? { ...value, text } : value,
                                          ),
                                        })),
                                      ),
                                ),
                              )
                            }
                          />
                        ) : (
                          <p dir="auto">
                            {part.text || tr('أضف نص الشرط.', 'Add the condition text.')}
                          </p>
                        )}
                        {!onChange && onEdit && (
                          <button
                            type="button"
                            className="scholarship-criterion-action"
                            aria-label={tr(`تعديل الشرط ${index}`, `Edit criterion ${index}`)}
                            onClick={() => onEdit(part.id)}
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        )}
                        {onChange && (
                          <button
                            type="button"
                            className="scholarship-criterion-action scholarship-card-delete"
                            aria-label={tr(`حذف الشرط ${index}`, `Remove criterion ${index}`)}
                            onClick={() => {
                              const next = sections
                                .map((group) => ({
                                  ...group,
                                  parts: group.parts.filter((value) => value.id !== part.id),
                                }))
                                .filter((group) => group.parts.length);
                              onChange(
                                next.length
                                  ? items.map((row) =>
                                      row.itemKey === item.itemKey
                                        ? withScholarshipCriterionSections(item, next)
                                        : row,
                                    )
                                  : items.filter((row) => row.itemKey !== item.itemKey),
                              );
                            }}
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        );
      })}
      {!items.length && <p>{tr('لم تُضف شروط بعد.', 'No conditions added yet.')}</p>}
      {onChange && (
        <button
          type="button"
          className="scholarship-card-add"
          onClick={() =>
            onChange([
              ...items,
              {
                itemKey: scholarshipCardKey('condition'),
                itemTypeCode: 'GENERAL',
                valueText: '',
                isRequired: true,
                priorityOrder: items.length + 1,
              },
            ])
          }
        >
          <Plus aria-hidden="true" />
          {tr('إضافة شرط', 'Add condition')}
        </button>
      )}
    </section>
  );
}

function CriterionInput({
  text,
  label,
  focus,
  onChange,
}: {
  text: string;
  label: string;
  focus: boolean;
  onChange: (text: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <textarea
        ref={ref}
        aria-label={label}
        autoFocus={focus}
        value={text}
        rows={1}
        dir="auto"
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="scholarship-criterion-action"
        aria-label={`✎ ${label}`}
        onClick={() => ref.current?.focus()}
      >
        <Pencil aria-hidden="true" />
      </button>
    </>
  );
}
