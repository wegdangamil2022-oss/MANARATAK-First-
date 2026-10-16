import type React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AcademicReportsPage } from './components/AcademicReportsPage';
import { I18nProvider } from '../../i18n/I18nProvider';

const render = (props: React.ComponentProps<typeof AcademicReportsPage>) =>
  renderToStaticMarkup(createElement(I18nProvider, { children: createElement(AcademicReportsPage, props) }));

describe('academic report data boundaries', () => {
  it.each([undefined, 'api'] as const)('does not present sample audit statistics in mode %s', dataMode => {
    const html = render({ locale: 'en', onBack() {}, dataMode });
    expect(html).toContain('not connected to a verified reporting service');
    expect(html).not.toContain('81.4%');
    expect(html).not.toContain('2,770');
    expect(html).not.toContain('<progress');
  });

  it('labels prototype examples and renders CSP compatible progress values', () => {
    const html = render({ locale: 'en', onBack() {}, dataMode: 'prototype' });
    expect(html).toContain('Prototype sample data only');
    expect(html).toContain('81.4%');
    expect(html).toContain('<progress');
    expect(html).toContain('value="737" max="843"');
    expect(html).not.toContain('style=');
  });
});
