import { useId, useRef, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ScholarshipDto } from '@manaratak/domain';
import type { ScholarshipCatalogUpdate } from '../../api/scholarshipCatalog';
import {
  fundingTextGroups,
  withFundingTextGroups,
  fundingGroupTitle,
  fundingGroupContext,
} from './ScholarshipFundingCards';
import { ScholarshipFundingOriginal } from './ScholarshipFundingReadCards';
import {
  moveScholarshipBenefit,
  scholarshipCardKey,
  scholarshipPresentation,
  withScholarshipPresentation,
  type FundingGroup,
  type SourceGroup,
  type SourceCard,
} from './ScholarshipPresentation';

export function TextCard({
  title,
  value,
  onChange,
  multiline = false,
  type = 'text',
  focus = false,
  children,
}: {
  title: string;
  value: unknown;
  onChange?: (value: string) => void;
  multiline?: boolean;
  type?: string;
  focus?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const label = title;
  const inputId = useId();
  return (
    <div className="scholarship-editor-card">
      <div className="scholarship-card-heading">
        {onChange ? <label htmlFor={inputId}>{title}</label> : <span>{title}</span>}
        {onChange && (
          <button type="button" aria-label={`✎ ${label}`} onClick={() => ref.current?.focus()}>
            <Pencil aria-hidden="true" />
          </button>
        )}
      </div>
      {onChange ? (
        multiline ? (
          <textarea
            id={inputId}
            ref={ref}
            aria-label={label}
            autoFocus={focus}
            rows={3}
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            id={inputId}
            ref={ref}
            aria-label={label}
            autoFocus={focus}
            type={type}
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
          />
        )
      ) : (
        children
      )}
    </div>
  );
}

export function ScholarshipContentEditor({
  scholarship,
  form,
  setForm,
  tab,
  language,
  focusField,
  onRelationships,
}: {
  scholarship: ScholarshipDto;
  form: ScholarshipCatalogUpdate;
  setForm: Dispatch<SetStateAction<ScholarshipCatalogUpdate>>;
  tab: string;
  language: string;
  focusField?: string;
  onRelationships: () => void;
}) {
  const ar = language === 'ar';
  const tr = (arabic: string, english: string) => (ar ? arabic : english);
  const presentation = scholarshipPresentation({ ...scholarship, ...form }, ar);
  const set = (field: keyof ScholarshipCatalogUpdate, value: unknown) =>
    setForm((previous) => ({ ...previous, [field]: value }));
  const updateGroups = (groups: FundingGroup[]) =>
    setForm((previous) => ({
      ...previous,
      metadata: withScholarshipPresentation(previous.metadata, { fundingGroups: groups }),
    }));
  const updateSources = (groups: SourceGroup[], removedFields: string[] = []) =>
    setForm((previous) => ({
      ...previous,
      ...Object.fromEntries(removedFields.map((field) => [field, null])),
      metadata: withScholarshipPresentation(previous.metadata, { sourceGroups: groups }),
    }));
  const remove = (label: string, action: () => void) => (
    <button type="button" className="scholarship-card-delete" aria-label={label} onClick={action}>
      <Trash2 aria-hidden="true" />
      {tr('حذف', 'Remove')}
    </button>
  );
  const add = (label: string, action: () => void) => (
    <button type="button" className="scholarship-card-add" onClick={action}>
      <Plus aria-hidden="true" />
      {label}
    </button>
  );
  const fundingSelect = (
    <select
      aria-label={tr('نوع التمويل', 'Funding type')}
      value={form.fundingTypeCode ?? ''}
      onChange={(event) =>
        setForm((previous) => ({
          ...previous,
          fundingTypeCode: event.target.value || null,
          isFullyFunded: ['FULL', 'FULLY_FUNDED'].includes(event.target.value),
        }))
      }
    >
      <option value="">{tr('غير محدد', 'Not specified')}</option>
      <option value="FULLY_FUNDED">{tr('تمويل كامل', 'Full funding')}</option>
      <option value="PARTIALLY_FUNDED">{tr('تمويل جزئي', 'Partial funding')}</option>
      {form.fundingTypeCode &&
        !['FULLY_FUNDED', 'PARTIALLY_FUNDED'].includes(form.fundingTypeCode) && (
          <option value={form.fundingTypeCode}>
            {form.fundingTypeCode === 'FULL'
              ? tr('تمويل كامل', 'Full funding')
              : form.fundingTypeCode === 'PARTIAL'
                ? tr('تمويل جزئي', 'Partial funding')
                : form.fundingTypeCode}
          </option>
        )}
    </select>
  );
  if (tab === 'identity')
    return (
      <section className="scholarship-read-card">
        <h2>{tr('المعلومات الأساسية', 'Basic information')}</h2>
        <div className="scholarship-card-grid">
          {(
            [
              ['displayName', tr('اسم المنحة', 'Scholarship name')],
              ['providerName', tr('الجهة المانحة', 'Provider')],
              ['countrySourceLabel', tr('بلد الدراسة', 'Study country')],
              ['academicYear', tr('السنة الدراسية', 'Academic year')],
              ['studyLanguageSourceLabel', tr('لغة الدراسة', 'Study language')],
            ] as const
          ).map(([field, title]) => (
            <TextCard
              key={field}
              title={title}
              value={form[field]}
              focus={focusField === field}
              onChange={(value) => set(field, value || null)}
            />
          ))}
          <TextCard
            title={tr('الموعد النهائي', 'Deadline')}
            value={form.applicationDeadline ? String(form.applicationDeadline).slice(0, 10) : ''}
            type="date"
            focus={focusField === 'applicationDeadline'}
            onChange={(value) =>
              set('applicationDeadline', value ? `${value}T23:59:59.000Z` : null)
            }
          />
          <TextCard title={tr('الدرجة التعليمية', 'Educational degree')} value="">
            <p>
              {(form.degreeTargets ?? [])
                .map((degree) => degree.sourceLabel || degree.degreeLevelId)
                .filter(Boolean)
                .join('، ') || tr('غير محدد', 'Not specified')}
            </p>
            <button type="button" onClick={onRelationships}>
              <Pencil aria-hidden="true" />
              {tr('تعديل الدرجات', 'Edit degrees')}
            </button>
          </TextCard>
          <TextCard title={tr('نوع التمويل', 'Funding type')} value="">
            {fundingSelect}
          </TextCard>
        </div>
      </section>
    );
  if (tab === 'overview')
    return (
      <section className="scholarship-read-card">
        <h2>{tr('نبذة المنحة', 'Overview')}</h2>
        <TextCard
          title={tr('نبذة المنحة', 'Overview')}
          multiline
          focus
          value={form.description}
          onChange={(value) => set('description', value || null)}
        />
      </section>
    );
  if (tab === 'funding') {
    const benefits = form.benefits ?? [];
    return (
      <>
        <section className="scholarship-read-card">
          <h2>{tr('التمويل والمزايا', 'Funding and benefits')}</h2>
          <div className="scholarship-card-grid">
            <TextCard title={tr('نوع التمويل', 'Funding type')} value="">
              {fundingSelect}
            </TextCard>
            <TextCard
              title={tr('المبلغ بوحدات العملة الصغرى', 'Amount in minor currency units')}
              value={form.amountMinorUnits}
              onChange={(value) => set('amountMinorUnits', value || null)}
            />
            <TextCard
              title={tr('العملة', 'Currency')}
              value={form.amountCurrencyCode}
              onChange={(value) => set('amountCurrencyCode', value || null)}
            />
            <TextCard title={tr('تمويل كامل', 'Full funding')} value="">
              <p>{form.isFullyFunded ? tr('نعم', 'Yes') : tr('لا', 'No')}</p>
            </TextCard>
          </div>
        </section>
        {presentation.fundingGroups.map((group) => (
          <section className="scholarship-read-card" key={group.id}>
            <div className="scholarship-group-heading">
              <TextCard
                title={tr('اسم مجموعة التمويل', 'Funding group name')}
                value={group.title}
                onChange={(value) =>
                  updateGroups(
                    presentation.fundingGroups.map((row) =>
                      row.id === group.id ? { ...row, title: value } : row,
                    ),
                  )
                }
              />
              {remove(
                tr(
                  'حذف مجموعة التمويل مع إبقاء مزاياها',
                  'Remove funding group and keep its benefits',
                ),
                () => updateGroups(presentation.fundingGroups.filter((row) => row.id !== group.id)),
              )}
            </div>
            <div className="scholarship-funding-editor">
              {group.benefitKeys.map((key) => {
                const item = benefits.find((row) => row.benefitKey === key)!;
                return (
                  <div key={key}>
                    {fundingTextGroups(item).map((textGroup, groupIndex) => (
                      <div className="scholarship-funding-text-group" key={textGroup.id}>
                        {textGroup.prefix && (
                          <TextCard
                            title={
                              fundingGroupContext(textGroup)
                                ? tr('شروط مجموعة التمويل', 'Funding group conditions')
                                : fundingGroupTitle(textGroup, ar)
                            }
                            multiline
                            focus={focusField === `${textGroup.id}-context`}
                            value={textGroup.prefix}
                            onChange={(value) =>
                              set(
                                'benefits',
                                benefits.map((row) =>
                                  row.benefitKey === key
                                    ? withFundingTextGroups(
                                        row,
                                        fundingTextGroups(row).map((group) =>
                                          group.id === textGroup.id
                                            ? { ...group, prefix: value }
                                            : group,
                                        ),
                                      )
                                    : row,
                                ),
                              )
                            }
                          />
                        )}
                        {textGroup.cards.map((card, cardIndex) => (
                          <TextCard
                            key={card.id}
                            title={tr('الميزة', 'Benefit')}
                            multiline
                            focus={
                              focusField === card.id ||
                              (focusField === key && groupIndex === 0 && cardIndex === 0)
                            }
                            value={card.text}
                            onChange={(value) =>
                              set(
                                'benefits',
                                benefits.map((row) =>
                                  row.benefitKey === key
                                    ? withFundingTextGroups(
                                        row,
                                        fundingTextGroups(row).map((group) => ({
                                          ...group,
                                          cards: group.cards.map((part) =>
                                            part.id === card.id ? { ...part, text: value } : part,
                                          ),
                                        })),
                                      )
                                    : row,
                                ),
                              )
                            }
                          />
                        ))}
                      </div>
                    ))}
                    {presentation.fundingGroups.length > 1 && (
                      <label>
                        {tr('مجموعة التمويل', 'Funding group')}
                        <select
                          aria-label={tr('نقل الميزة إلى مجموعة', 'Move benefit to group')}
                          value={group.id}
                          onChange={(event) =>
                            updateGroups(
                              moveScholarshipBenefit(
                                presentation.fundingGroups,
                                key,
                                event.target.value,
                              ),
                            )
                          }
                        >
                          {presentation.fundingGroups.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.title || tr('مجموعة جديدة', 'New group')}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="scholarship-card-details">
                      {item.durationText &&
                        fundingTextGroups(item, 'durationText').flatMap((textGroup) =>
                          textGroup.cards.map((card) => (
                            <TextCard
                              key={card.id}
                              title={tr('مدة الميزة', 'Benefit duration')}
                              focus={focusField === card.id}
                              value={card.text}
                              onChange={(value) =>
                                set(
                                  'benefits',
                                  benefits.map((row) =>
                                    row.benefitKey === key
                                      ? withFundingTextGroups(
                                          row,
                                          fundingTextGroups(row, 'durationText').map((group) => ({
                                            ...group,
                                            cards: group.cards.map((part) =>
                                              part.id === card.id ? { ...part, text: value } : part,
                                            ),
                                          })),
                                          'durationText',
                                        )
                                      : row,
                                  ),
                                )
                              }
                            />
                          )),
                        )}
                      {item.notes && (
                        <TextCard
                          title={tr('شروط الميزة', 'Benefit conditions')}
                          focus={focusField === `${key}-notes`}
                          multiline
                          value={item.notes}
                          onChange={(value) =>
                            set(
                              'benefits',
                              benefits.map((row) =>
                                row.benefitKey === key ? { ...row, notes: value || null } : row,
                              ),
                            )
                          }
                        />
                      )}
                      {item.amount != null && <p>{String(item.amount)}</p>}
                    </div>
                    {remove(tr('حذف الميزة', 'Remove benefit'), () =>
                      set(
                        'benefits',
                        benefits.filter((row) => row.benefitKey !== key),
                      ),
                    )}
                  </div>
                );
              })}
            </div>
            {add(tr('إضافة ميزة', 'Add benefit'), () => {
              const benefitKey = scholarshipCardKey('benefit');
              setForm((previous) => ({
                ...previous,
                benefits: [
                  ...(previous.benefits ?? []),
                  {
                    benefitKey,
                    benefitTypeCode: 'OTHER',
                    valueText: '',
                    isCovered: true,
                    displayOrder: benefits.length + 1,
                  },
                ],
                metadata: withScholarshipPresentation(previous.metadata, {
                  fundingGroups: presentation.fundingGroups.map((row) =>
                    row.id === group.id
                      ? { ...row, benefitKeys: [...row.benefitKeys, benefitKey] }
                      : row,
                  ),
                }),
              }));
            })}
          </section>
        ))}
        {add(tr('إضافة مجموعة تمويل', 'Add funding group'), () =>
          updateGroups([
            ...presentation.fundingGroups,
            { id: scholarshipCardKey('funding'), title: '', benefitKeys: [] },
          ]),
        )}
        <ScholarshipFundingOriginal metadata={form.metadata} language={language} />
      </>
    );
  }
  if (tab === 'eligibility') {
    return null; // Source-derived criteria have an individually audited save boundary.
  }
  if (tab === 'documents') {
    const rows = form.requiredDocumentItems ?? [];
    return (
      <section className="scholarship-read-card">
        <h2>{tr('المستندات المطلوبة', 'Required documents')}</h2>
        <div className="scholarship-card-grid">
          {rows.map((item) => (
            <div key={item.documentKey}>
              <TextCard
                title={tr('المستند', 'Document')}
                multiline
                focus={focusField === item.documentKey}
                value={item.displayName}
                onChange={(value) =>
                  set(
                    'requiredDocumentItems',
                    rows.map((row) =>
                      row.documentKey === item.documentKey ? { ...row, displayName: value } : row,
                    ),
                  )
                }
              />
              {item.description && (
                <TextCard
                  title={tr('تعليمات المستند', 'Document instructions')}
                  multiline
                  value={item.description}
                  onChange={(value) =>
                    set(
                      'requiredDocumentItems',
                      rows.map((row) =>
                        row.documentKey === item.documentKey
                          ? { ...row, description: value || null }
                          : row,
                      ),
                    )
                  }
                />
              )}
              {remove(tr('حذف المستند', 'Remove document'), () =>
                set(
                  'requiredDocumentItems',
                  rows.filter((row) => row.documentKey !== item.documentKey),
                ),
              )}
            </div>
          ))}
        </div>
        {add(tr('إضافة مستند', 'Add document'), () =>
          set('requiredDocumentItems', [
            ...rows,
            {
              documentKey: scholarshipCardKey('document'),
              displayName: '',
              documentTypeCode: 'OTHER',
              isRequired: true,
              displayOrder: rows.length + 1,
            },
          ]),
        )}
      </section>
    );
  }
  if (tab === 'links_unis')
    return (
      <>
        {presentation.sourceGroups.map((group) => (
          <section className="scholarship-read-card" key={group.id}>
            <div className="scholarship-group-heading">
              <TextCard
                title={tr('اسم قسم الروابط', 'Link section name')}
                value={group.title}
                onChange={(value) =>
                  updateSources(
                    presentation.sourceGroups.map((row) =>
                      row.id === group.id ? { ...row, title: value } : row,
                    ),
                  )
                }
              />
              {remove(tr('حذف قسم الروابط', 'Remove link section'), () =>
                updateSources(
                  presentation.sourceGroups.filter((row) => row.id !== group.id),
                  group.links.flatMap((link) => (link.field ? [link.field] : [])),
                ),
              )}
            </div>
            <div className="scholarship-card-grid">
              {group.links.map((link) => (
                <div className="scholarship-editor-card" key={link.id}>
                  <TextCard
                    title={tr('عنوان الرابط', 'Link title')}
                    value={link.title}
                    onChange={(value) =>
                      updateSources(
                        presentation.sourceGroups.map((row) =>
                          row.id === group.id
                            ? {
                                ...row,
                                links: row.links.map((item) =>
                                  item.id === link.id ? { ...item, title: value } : item,
                                ),
                              }
                            : row,
                        ),
                      )
                    }
                  />
                  <TextCard
                    title={tr('الرابط', 'URL')}
                    value={link.url}
                    type="url"
                    onChange={(value) => {
                      if (link.field)
                        setForm((previous) => ({
                          ...previous,
                          [link.field!]: value || null,
                          metadata: withScholarshipPresentation(previous.metadata, {
                            sourceGroups: presentation.sourceGroups,
                          }),
                        }));
                      else
                        updateSources(
                          presentation.sourceGroups.map((row) =>
                            row.id === group.id
                              ? {
                                  ...row,
                                  links: row.links.map((item) =>
                                    item.id === link.id ? { ...item, url: value } : item,
                                  ),
                                }
                              : row,
                          ),
                        );
                    }}
                  />
                  <label>
                    {tr('استخدام الرابط', 'Link purpose')}
                    <select
                      aria-label={tr('استخدام الرابط', 'Link purpose')}
                      value={link.field ?? ''}
                      onChange={(event) => {
                        const field = (event.target.value || undefined) as SourceCard['field'];
                        if (
                          field &&
                          presentation.sourceGroups.some((group) =>
                            group.links.some((item) => item.id !== link.id && item.field === field),
                          )
                        )
                          return;
                        setForm((previous) => ({
                          ...previous,
                          ...(link.field ? { [link.field]: null } : {}),
                          ...(field ? { [field]: link.url || null } : {}),
                          metadata: withScholarshipPresentation(previous.metadata, {
                            sourceGroups: presentation.sourceGroups.map((row) =>
                              row.id === group.id
                                ? {
                                    ...row,
                                    links: row.links.map((item) =>
                                      item.id === link.id
                                        ? { ...item, field, url: link.url }
                                        : item,
                                    ),
                                  }
                                : row,
                            ),
                          }),
                        }));
                      }}
                    >
                      {(
                        [
                          ['', tr('رابط إضافي', 'Additional link')],
                          ['applicationUrl', tr('بوابة التقديم', 'Application portal')],
                          ['officialWebsite', tr('الموقع الرسمي', 'Official website')],
                          ['officialSourceUrl', tr('الإعلان الرسمي', 'Official announcement')],
                          ['sourceUrl', tr('المصدر', 'Source')],
                        ] as const
                      ).map(([field, title]) => (
                        <option
                          key={field}
                          value={field}
                          disabled={
                            !!field &&
                            presentation.sourceGroups.some((group) =>
                              group.links.some(
                                (item) => item.id !== link.id && item.field === field,
                              ),
                            )
                          }
                        >
                          {title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {remove(tr('حذف الرابط', 'Remove link'), () =>
                    updateSources(
                      presentation.sourceGroups.map((row) =>
                        row.id === group.id
                          ? { ...row, links: row.links.filter((item) => item.id !== link.id) }
                          : row,
                      ),
                      link.field ? [link.field] : [],
                    ),
                  )}
                </div>
              ))}
            </div>
            {add(tr('إضافة رابط', 'Add link'), () =>
              updateSources(
                presentation.sourceGroups.map((row) =>
                  row.id === group.id
                    ? {
                        ...row,
                        links: [
                          ...row.links,
                          { id: scholarshipCardKey('link'), title: '', url: '' },
                        ],
                      }
                    : row,
                ),
              ),
            )}
          </section>
        ))}
        {add(tr('إضافة قسم روابط', 'Add link section'), () =>
          updateSources([
            ...presentation.sourceGroups,
            { id: scholarshipCardKey('sources'), title: '', links: [] },
          ]),
        )}
      </>
    );
  return null;
}
