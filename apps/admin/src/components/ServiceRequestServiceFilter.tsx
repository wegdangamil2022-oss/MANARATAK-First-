import { useEffect, useRef, useState } from 'react';
import type { ServiceCatalogItemDto } from '@manaratak/domain';
import { adminApiClient } from '../api/client';

/** Filters use canonical owner IDs, including historical services with existing requests. */
export function ServiceRequestServiceFilter({ value, onChange, language }: {
  value: string;
  onChange: (id: string) => void;
  language: 'ar' | 'en';
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ServiceCatalogItemDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const generation = useRef(0);
  const ar = language === 'ar';
  useEffect(() => {
    const current = ++generation.current;
    setState('loading');
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (query.trim()) params.set('search', query.trim());
      void adminApiClient.request<{ data: ServiceCatalogItemDto[]; totalPages: number }>(
        `/admin/services?${params}`,
      ).then((result) => {
        if (current !== generation.current) return;
        setItems(result.data);
        setTotalPages(result.totalPages);
        setState('ready');
      }).catch(() => {
        if (current === generation.current) setState('error');
      });
    }, 250);
    return () => { clearTimeout(timer); ++generation.current; };
  }, [query, page]);
  return <fieldset className="space-y-2 text-xs font-bold">
    <legend>{ar ? 'الخدمة' : 'Service'}</legend>
    <input type="search" maxLength={120} value={query}
      aria-label={ar ? 'بحث الخدمات' : 'Search services'}
      placeholder={ar ? 'ابحث عن الخدمة' : 'Search for a service'}
      onChange={(event) => { setQuery(event.target.value); setPage(1); }}
      className="block rounded-xl border p-3" />
    <select value={value} onChange={(event) => onChange(event.target.value)}
      aria-label={ar ? 'فلتر الخدمة' : 'Service filter'}
      disabled={state === 'loading'} className="block rounded-xl border p-3">
      <option value="">{ar ? 'كل الخدمات' : 'All services'}</option>
      {value && !items.some((item) => item.id === value) &&
        <option value={value}>{ar ? 'الخدمة المحددة' : 'Selected service'}: {value}</option>}
      {items.map((item) => <option key={item.id} value={item.id}>
        {item.localizedContent?.[language]?.displayName || item.displayName} · {item.publicId}
      </option>)}
    </select>
    {state === 'error' && <span role="alert">{ar ? 'تعذر تحميل الخدمات' : 'Could not load services'}</span>}
    <div className="flex gap-3">
      <button type="button" disabled={state !== 'ready' || page <= 1}
        onClick={() => setPage((previous) => previous - 1)}>{ar ? 'السابق' : 'Previous'}</button>
      <span>{page}</span>
      <button type="button" disabled={state !== 'ready' || page >= totalPages}
        onClick={() => setPage((previous) => previous + 1)}>{ar ? 'التالي' : 'Next'}</button>
    </div>
  </fieldset>;
}
