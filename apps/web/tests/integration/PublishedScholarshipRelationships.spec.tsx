import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { mapPublicScholarshipDto } from '../../src/features/public-template/publicScholarshipDataSource';
import { ScholarshipDetailModal } from '../../src/features/public-template/components/ScholarshipDetailModal';

vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key === 'public_view_linked_test' ? 'View linked test' : key }),
}));

const noop = () => {};

const scholarship = mapPublicScholarshipDto({
  publicId: 's', slug: 's', canonicalName: 'S', displayName: 'S', updatedAt: '',
  deadlineType: 'NOT_STATED_IN_SOURCE',
  fundingCoverage: '', coverageDetails: '', degreeLevel: '', eligibleMajorsOrFields: [],
  requiredDocumentItems: [
    { documentKey: 'toefl', displayName: 'TOEFL certificate', internationalTestId: 'canonical-toefl' },
    { documentKey: 'label-only', displayName: 'IELTS mentioned without an approved link' },
  ],
});

function details(overrides: Partial<React.ComponentProps<typeof ScholarshipDetailModal>> = {}) {
  return <ScholarshipDetailModal scholarship={scholarship} isFavorite={false} onClose={noop} onToggleFavorite={noop} {...overrides} />;
}

describe('scholarship requirement navigation', () => {
  it('opens the approved canonical test directly from the required-document item', () => {
    const open = vi.fn();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    let view: ReactTestRenderer | undefined;
    try {
      act(() => { view = create(details({ onOpenExam: open })); });
      const links = view!.root.findAllByType('button').filter(button => button.props.children === 'View linked test');
      expect(links).toHaveLength(1);
      act(() => links[0].props.onClick());
      expect(open).toHaveBeenCalledExactlyOnceWith('canonical-toefl');
      expect(renderToStaticMarkup(details())).toContain('IELTS mentioned without an approved link');
    } finally {
      act(() => view?.unmount());
      vi.unstubAllGlobals();
    }
  });

  it('does not render an inline action when no navigation handler is available', () => {
    expect(renderToStaticMarkup(details())).not.toContain('View linked test');
  });

  it('shows a partial-requirements notice without rendering a hidden target', () => {
    const html = renderToStaticMarkup(details({ scholarship: { ...scholarship, requiredExams: [], publishedData: { ...scholarship.publishedData!, requiredDocumentItems: [], hasUnavailableRequirements: true } } }));
    expect(html).toContain('role="status"');
    expect(html).toContain('public_requirements_partial');
    expect(html).not.toContain('View linked test');
  });
});

describe('published scholarship template', () => {
  it('uses the template cards and omits duplicate titles and sample values', () => {
    const html = renderToStaticMarkup(details());
    expect(html).toContain('id="scholarship-about"');
    expect(html).toContain('id="scholarship-majors"');
    expect(html).toContain('id="scholarship-requirements"');
    expect(html).toContain('id="scholarship-application"');
    expect(html).toMatch(/<h1[^>]*>S<\/h1>/);
    expect(html).not.toMatch(/<p[^>]*>S<\/p>/);
    expect(html).not.toContain('BSc • MSc • PhD');
    expect(html).not.toContain('public_application_deadline');
    expect(html).not.toContain('public_apply_through_manaratak');
    expect(html).not.toContain('الطب والجراحة');
  });

  it('keeps distinct translated titles and displays funding packages in the template', () => {
    const publishedData = { ...scholarship.publishedData!, benefits: [
      { coverageTypeCode: 'FULL', benefitTypeCode: 'TUITION', valueText: 'All tuition' },
      { coverageTypeCode: 'PARTIAL', benefitTypeCode: 'TUITION', valueText: 'Half tuition' },
    ] };
    const html = renderToStaticMarkup(details({ scholarship: { ...scholarship, titleEn: 'Different subtitle', publishedData } }));
    expect(html).toContain('Different subtitle');
    expect(html).toContain('public_scholarship_full_funding');
    expect(html).toContain('public_scholarship_partial_funding');
    expect(html).toContain('All tuition');
    expect(html).toContain('Half tuition');
  });
});
