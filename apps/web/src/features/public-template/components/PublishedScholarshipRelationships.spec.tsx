import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { mapPublicScholarshipDto } from '../publicScholarshipDataSource';
import { PublishedScholarshipDetails } from './PublishedScholarshipDetails';

vi.mock('../../../i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key === 'public_view_linked_test' ? 'View linked test' : key }),
}));

const scholarship = mapPublicScholarshipDto({
  publicId: 's', slug: 's', canonicalName: 'S', displayName: 'S', updatedAt: '',
  fundingCoverage: '', coverageDetails: '', degreeLevel: '', eligibleMajorsOrFields: [],
  requiredDocumentItems: [
    { documentKey: 'toefl', displayName: 'TOEFL certificate', internationalTestId: 'canonical-toefl' },
    { documentKey: 'label-only', displayName: 'IELTS mentioned without an approved link' },
  ],
});

function buttons(node: React.ReactNode): React.ReactElement<{ children?: React.ReactNode; onClick?: () => void }>[] {
  if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => void }>(node)) return [];
  return [
    ...(node.type === 'button' ? [node] : []),
    ...React.Children.toArray(node.props.children).flatMap(buttons),
  ];
}

describe('scholarship requirement navigation', () => {
  it('opens the approved canonical test directly from the required-document item', () => {
    const open = vi.fn();
    const tree = PublishedScholarshipDetails({ scholarship, onOpenExam: open });
    const links = buttons(tree).filter(button => button.props.children === 'View linked test');
    expect(links).toHaveLength(1);
    links[0].props.onClick?.();
    expect(open).toHaveBeenCalledExactlyOnceWith('canonical-toefl');
    expect(renderToStaticMarkup(tree)).toContain('IELTS mentioned without an approved link');
  });

  it('does not render an inline action when no navigation handler is available', () => {
    expect(renderToStaticMarkup(<PublishedScholarshipDetails scholarship={scholarship} />)).not.toContain('View linked test');
  });

  it('shows a partial-requirements notice without rendering a hidden target', () => {
    const html = renderToStaticMarkup(<PublishedScholarshipDetails scholarship={{ ...scholarship, publishedData: { ...scholarship.publishedData!, requiredDocumentItems: [], hasUnavailableRequirements: true } }} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('public_requirements_partial');
    expect(html).not.toContain('View linked test');
  });
});
