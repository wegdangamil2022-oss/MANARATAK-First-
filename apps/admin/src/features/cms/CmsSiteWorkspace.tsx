import { useSearchParams } from 'react-router-dom';
import { Menu, Blocks, Megaphone, Route, CalendarClock } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';
import { CmsOperationsPanels } from './CmsOperationsPanels';

export function CmsSiteWorkspace() {
  const { language } = useTranslation(),
    ar = language === 'ar';
  const [params, setParams] = useSearchParams();
  const tabs = [
    ['navigation', ar ? 'قوائم الموقع' : 'Navigation', Menu],
    ['blocks', ar ? 'الكتل والمكونات' : 'Content blocks', Blocks],
    ['announcements', ar ? 'الإعلانات' : 'Announcements', Megaphone],
    ['redirects', ar ? 'التحويلات' : 'Redirects', Route],
    ['publishing', ar ? 'متابعة النشر' : 'Publishing', CalendarClock],
  ] as const;
  const area = tabs.find((tab) => tab[0] === params.get('section'))?.[0] ?? 'navigation';
  const locale = params.get('locale') === 'en' ? 'en' : 'ar';
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(name, value);
    // Real links trigger the shared draft guard, including keyboard activation.
    return '/cms/site?' + next.toString();
  };
  return (
    <>
      <nav className="cms-area-tabs admin-section-navigation" aria-label={ar ? 'عمليات الموقع' : 'Site operations'}>
        {tabs.map(([value, label, Icon]) => (
          <a
            key={value}
            href={'/admin' + change('section', value)}
            aria-current={area === value ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              const next = new URLSearchParams(params);
              next.set('section', value);
              setParams(next);
            }}
          >
            <Icon size={18} />
            {label}
          </a>
        ))}
      </nav>
      <div className="cms-languages">
        {(['ar', 'en'] as const).map((value) => (
          <a
            key={value}
            href={'/admin' + change('locale', value)}
            aria-current={locale === value ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              const next = new URLSearchParams(params);
              next.set('locale', value);
              setParams(next);
            }}
          >
            {value === 'ar' ? (ar ? 'العربية' : 'Arabic') : 'English'}
          </a>
        ))}
      </div>
      <CmsOperationsPanels key={area + ':' + locale} locale={locale} area={area} />
    </>
  );
}
