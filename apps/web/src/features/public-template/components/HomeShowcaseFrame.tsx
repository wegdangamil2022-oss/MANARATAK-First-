import type { ReactNode } from 'react';
import { useTranslation } from '../../../i18n/I18nProvider';

/** Makes demo cards look exactly like the old homepage prototype, but never interactive. */
export function HomeShowcaseFrame({ active, children }: { active: boolean; children: ReactNode }) {
  const { language } = useTranslation();
  return (
    <div data-home-design-preview={active ? 'true' : 'false'} className="w-full">
      {active && (
        <p role="note" className="mb-0.5 ms-2 inline-flex items-center gap-1 rounded-t-lg border border-[#D6A43B]/50 bg-[#D6A43B]/10 px-2 py-1 text-[10px] font-bold text-[var(--ab-heading)]">
          {language === 'ar' ? 'معاينة تصميم فقط — الصور والبيانات ليست محتوى منشورًا' : 'Design preview only — sample images and information, not published listings'}
        </p>
      )}
      <div inert={active}>{children}</div>
    </div>
  );
}
