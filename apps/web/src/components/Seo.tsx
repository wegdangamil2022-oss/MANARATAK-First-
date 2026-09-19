import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/I18nProvider';
import {
  buildLocalizedSeoLinks,
  getAlternateOpenGraphLocale,
  toOpenGraphLocale,
} from '../seo/localeSeo';

interface SeoProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

export function Seo({
  title,
  description,
  canonicalUrl,
  noIndex = false,
  noFollow = false,
}: SeoProps) {
  const { language } = useTranslation();
  const location = useLocation();
  useEffect(() => {
    const pageTitle = `${title} | MANARATAK`;
    const baseUrl = import.meta.env.VITE_PUBLIC_WEB_URL || window.location.origin;
    const localizedLinks = buildLocalizedSeoLinks({
      baseUrl,
      pathname: location.pathname,
      locale: language,
    });
    document.title = pageTitle;
    upsertMeta('description', description);
    upsertMeta('robots', `${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`);
    upsertMeta('og:title', pageTitle, 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:url', canonicalUrl || localizedLinks.canonical, 'property');
    upsertMeta('og:locale', toOpenGraphLocale(language), 'property');
    upsertMeta('og:locale:alternate', getAlternateOpenGraphLocale(language), 'property');
    upsertLink('canonical', canonicalUrl || localizedLinks.canonical);
    upsertAlternateLink('ar', localizedLinks.alternates.ar);
    upsertAlternateLink('en', localizedLinks.alternates.en);
    upsertAlternateLink('x-default', localizedLinks.xDefault);
  }, [canonicalUrl, description, language, location.pathname, noFollow, noIndex, title]);

  return null;
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]:not([hreflang])`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertAlternateLink(hreflang: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    `link[rel="alternate"][hreflang="${hreflang}"]`,
  );
  if (!element) {
    element = document.createElement('link');
    element.rel = 'alternate';
    element.hreflang = hreflang;
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}
