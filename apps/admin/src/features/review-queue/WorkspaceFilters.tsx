import { useState } from 'react';
import {
  Search,
  Filter,
  LayoutGrid,
  ListFilter,
  Flag,
  Users,
  ClipboardCheck,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  X,
  Save,
} from 'lucide-react';
import {
  reviewDomains,
  reviewReasons,
  type ReviewQuery,
  type ReviewSavedView,
} from '@manaratak/shared';
import { labelFor, textFor } from './WorkspaceText';
export function WorkspaceFilters({
  language,
  query,
  search,
  setSearch,
  change,
  clear,
  views,
  saveView,
  canCoordinate,
  reviewers,
}: {
  language: string;
  query: ReviewQuery;
  search: string;
  setSearch: (value: string) => void;
  change: (key: keyof ReviewQuery, value: string) => void;
  clear: () => void;
  views: ReviewSavedView[];
  saveView: (name: string, shared: boolean) => Promise<void>;
  canCoordinate: boolean;
  reviewers: Array<{ id: string; label: string; kind: string }>;
}) {
  const tr = textFor(language),
    label = labelFor(language),
    [extra, setExtra] = useState(false),
    [saving, setSaving] = useState(false),
    [name, setName] = useState(''),
    [shared, setShared] = useState(false);
  const fields = [
    { key: 'domain', Icon: LayoutGrid, values: reviewDomains },
    { key: 'reason', Icon: ListFilter, values: reviewReasons },
    { key: 'priority', Icon: Flag, values: ['critical', 'high', 'medium', 'low'] },
    { key: 'assignee', Icon: Users, values: ['mine', 'unassigned'] },
    { key: 'state', Icon: ClipboardCheck, values: ['OPEN', 'WAITING_INFORMATION', 'REFERRED'] },
  ] as const;
  return (
    <section
      className="rw-panel rw-filters"
      aria-label={tr('البحث والتصفية', 'Search and filters')}
    >
      <div className="rw-search">
        <Search aria-hidden="true" />
        <label className="rw-sr-only" htmlFor="rw-search">
          {tr('بحث شامل', 'Search all reviews')}
        </label>
        <input
          id="rw-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={tr(
            'ابحث بالاسم، المعرف، الرقم المرجعي أو السبب…',
            'Search name, ID, reference or review reason…',
          )}
          maxLength={200}
        />
        <button onClick={clear}>
          <X aria-hidden="true" />
          {tr('مسح الكل', 'Clear all')}
        </button>
      </div>
      <div className="rw-filter-grid">
        {fields.map(({ key, Icon, values }) => (
          <label key={key}>
            <span>
              <Icon aria-hidden="true" />
              {label(key)}
            </span>
            <select
              value={query[key] ?? 'all'}
              onChange={(event) => change(key, event.target.value)}
            >
              <option value="all">{tr('الكل', 'All')}</option>
              {values.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
              {key==='assignee'?reviewers.map(person=><option key={person.kind+person.id} value={person.id}>{person.label}{person.kind==='team'?tr(' — فريق',' — team'):''}</option>):null}
            </select>
          </label>
        ))}
      </div>
      <div className="rw-filter-footer">
        <div className="rw-presets">
          {['all', 'mine', 'unassigned', 'urgent', 'overdue', 'ready'].map((value) => (
            <button
              key={value}
              aria-pressed={(query.view ?? 'all') === value}
              onClick={() => change('view', value)}
            >
              <Filter aria-hidden="true" />
              {label(value)}
            </button>
          ))}
        </div>
        <button aria-expanded={extra} aria-controls="rw-extra" onClick={() => setExtra(!extra)}>
          <SlidersHorizontal aria-hidden="true" />
          {tr('فلاتر إضافية', 'More filters')}
        </button>
      </div>
      {extra ? (
        <div id="rw-extra" className="rw-filter-grid">
          {(
            [
              {
                key: 'source',
                name: 'sourceKind',
                values: ['imported', 'manual', 'cms', 'unknown'],
              },
              { key: 'age', name: 'age', values: ['today', 'week', 'older', 'unknown'] },
              { key: 'locale', name: 'locale', values: ['ar', 'en'] },
            ] as const
          ).map((field) => (
            <label key={field.key}>
              <span>
                <Filter aria-hidden="true" />
                {label(field.name)}
              </span>
              <select
                value={query[field.key] ?? 'all'}
                onChange={(event) => change(field.key, event.target.value)}
              >
                <option value="all">{label('all')}</option>
                {field.values.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            <span>
              <ArrowDownWideNarrow aria-hidden="true" />
              {tr('الترتيب', 'Sort')}
            </span>
            <select
              value={query.sort ?? 'priority'}
              onChange={(event) => change('sort', event.target.value)}
            >
              {['priority', 'deadline', 'oldest', 'newest', 'domain', 'assignee'].map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              <Save aria-hidden="true" />
              {tr('العروض المحفوظة', 'Saved views')}
            </span>
            <select
              value=""
              onChange={(event) => {
                const view = views.find((value) => value.id === event.target.value);
                if (view) {
                  clear();
                  for (const [key, value] of Object.entries(view.filters))
                    change(key as keyof ReviewQuery, String(value));
                }
              }}
            >
              <option value="">{tr('اختر عرضًا محفوظًا', 'Choose a saved view')}</option>
              {views.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                  {view.shared ? tr(' — مشترك', ' — shared') : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      {Object.entries(query).some(
        ([key, value]) =>
          !['pageSize', 'sort', 'cursor', 'snapshot', 'search'].includes(key) &&
          value &&
          value !== 'all',
      ) ? (
        <div className="rw-applied" aria-label={tr('الفلاتر المطبقة', 'Applied filters')}>
          {Object.entries(query)
            .filter(
              ([key, value]) =>
                !['pageSize', 'sort', 'cursor', 'snapshot', 'search'].includes(key) &&
                value &&
                value !== 'all',
            )
            .map(([key, value]) => (
              <button
                key={key}
                onClick={() => change(key as keyof ReviewQuery, 'all')}
                aria-label={tr('إزالة: ', 'Remove: ') + label(String(value))}
              >
                {label(String(value))}
                <X aria-hidden="true" />
              </button>
            ))}
        </div>
      ) : null}
      {extra && canCoordinate ? (
        <form
          className="rw-inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            setSaving(true);
            void saveView(name, shared)
              .then(() => setName(''))
              .finally(() => setSaving(false));
          }}
        >
          <label>
            <span>{tr('اسم العرض — دون حفظ نص البحث', 'View name — search text is excluded')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label className="rw-checkbox">
            <input
              type="checkbox"
              checked={shared}
              onChange={(event) => setShared(event.target.checked)}
            />
            {tr('مشترك مع المراجعين المخولين', 'Share with authorized reviewers')}
          </label>
          <button type="submit" disabled={saving}>
            <Save aria-hidden="true" />
            {tr('حفظ العرض', 'Save view')}
          </button>
        </form>
      ) : null}
    </section>
  );
}
