import type { ScholarshipBenefitDto, ScholarshipDto } from '@manaratak/domain';
import { Pencil } from 'lucide-react';
import { benefitText } from './ScholarshipPresentation';
import {
  fundingCardText,
  fundingGroupContext,
  fundingGroupTitle,
  fundingTextGroups,
  originalFundingText,
} from './ScholarshipFundingCards';

export function ScholarshipFundingReadCards({
  benefit,
  language,
  onEdit,
}: {
  benefit: ScholarshipBenefitDto;
  language: string;
  onEdit?: (key: string) => void;
}) {
  const ar = language === 'ar';
  const row = (key: string, text: string, editable = true) => (
    <li key={key} className="scholarship-criterion">
      <span className="scholarship-criterion-dot" aria-hidden="true" />
      <p dir="auto">{text}</p>
      {onEdit && editable && (
        <button
          type="button"
          className="scholarship-criterion-action"
          aria-label={`${ar ? 'تعديل ميزة التمويل' : 'Edit funding benefit'} ${key}`}
          onClick={() => onEdit(key)}
        >
          <Pencil aria-hidden="true" />
          {ar ? 'تعديل' : 'Edit'}
        </button>
      )}
    </li>
  );
  const currency = (benefit as ScholarshipBenefitDto & { currency?: { isoCode?: string } }).currency
    ?.isoCode;
  return (
    <div className="scholarship-funding-benefit">
      {fundingTextGroups(benefit).map((group) => (
        <div key={group.id} className="scholarship-funding-text-group">
          {group.prefix && <h3>{fundingGroupTitle(group, ar)}</h3>}
          <ul className="scholarship-criteria-list">
            {fundingGroupContext(group) && row(`${group.id}-context`, fundingGroupContext(group))}
            {group.cards.map((card) =>
              row(card.id, fundingCardText(card.text) || benefitText(benefit, ar)),
            )}
          </ul>
        </div>
      ))}
      <ul className="scholarship-criteria-list">
        {benefit.durationText &&
          fundingTextGroups(benefit, 'durationText').flatMap((group) =>
            group.cards.map((card) => row(card.id, group.prefix + card.text + group.suffix)),
          )}
        {benefit.notes && row(`${benefit.benefitKey}-notes`, benefit.notes)}
        {benefit.amount != null &&
          row(
            `${benefit.benefitKey}-amount`,
            `${ar ? 'المبلغ' : 'Amount'}: ${benefit.amount}${currency ? ` ${currency}` : ''}`,
            false,
          )}
        {benefit.isCovered === false &&
          row(`${benefit.benefitKey}-coverage`, ar ? 'غير مشمول' : 'Not covered', false)}
        {benefit.isOptional &&
          row(`${benefit.benefitKey}-optional`, ar ? 'ميزة اختيارية' : 'Optional benefit', false)}
      </ul>
    </div>
  );
}

export function ScholarshipFundingOriginal({
  metadata,
  language,
}: {
  metadata: ScholarshipDto['metadata'];
  language: string;
}) {
  const text = originalFundingText(metadata);
  return (
    <section className="scholarship-read-card scholarship-funding-original">
      <h2>{language === 'ar' ? 'النص الأصلي من الملف' : 'Original text from the file'}</h2>
      <p className="scholarship-long-text" dir="auto">
        {text ||
          (language === 'ar'
            ? 'النص الأصلي للتمويل غير مذكور في الملف المرتبط.'
            : 'The original funding text is not stated in the linked file.')}
      </p>
    </section>
  );
}
