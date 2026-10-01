import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AcademicReportsPage } from './components/AcademicReportsPage';

describe('academic report data boundaries', () => {
  it.each([undefined, 'api'] as const)('does not present sample audit statistics in mode %s', dataMode => {
    const html = renderToStaticMarkup(createElement(AcademicReportsPage, { locale: 'en', onBack() {}, dataMode }));
    expect(html).toContain('not connected to a verified reporting service');
    expect(html).not.toContain('81.4%');
    expect(html).not.toContain('2,770');
    expect(html).not.toContain('<progress');
  });

  it('labels prototype examples and renders CSP compatible progress values', () => {
    const html = renderToStaticMarkup(createElement(AcademicReportsPage, { locale: 'en', onBack() {}, dataMode: 'prototype' }));
    expect(html).toContain('Prototype sample data only');
    expect(html).toContain('81.4%');
    expect(html).toContain('<progress');
    expect(html).toContain('value="737" max="843"');
    expect(html).not.toContain('style=');
  });
});
