import { AdminLink } from '../../components/AdminLink';
import { scholarshipSourcePresentation } from './ScholarshipSourcePresentation';
import './scholarship-list.css';

interface ScholarshipName {
  id: string;
  displayName: string;
  canonicalName?: string;
  localizedNames?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export function ScholarshipListName({ scholarship }: { scholarship: ScholarshipName }) {
  const names = [
    scholarship.localizedNames?.ar,
    scholarship.displayName,
    scholarship.canonicalName,
  ].map((name) => name?.trim() ?? '');
  const english = [
    scholarship.localizedNames?.en,
    scholarshipSourcePresentation(scholarship.metadata).officialEnglishName,
    scholarship.canonicalName,
    scholarship.displayName,
  ]
    .find((name) => name?.trim() && /[a-z]/i.test(name) && !/\p{Script=Arabic}/u.test(name))
    ?.trim();
  const arabic = names.find((name) => /\p{Script=Arabic}/u.test(name));
  const primary = arabic || names.find(Boolean) || english || '—';

  return (
    <div className="scholarship-list-name">
      <AdminLink to={`/scholarships/${scholarship.id}`}>
        <span className="scholarship-list-name-primary" dir={arabic ? 'rtl' : 'auto'}>
          {primary}
        </span>
      </AdminLink>
      {english && english !== primary && (
        <p className="scholarship-list-name-english" dir="ltr" lang="en">
          {english}
        </p>
      )}
    </div>
  );
}
