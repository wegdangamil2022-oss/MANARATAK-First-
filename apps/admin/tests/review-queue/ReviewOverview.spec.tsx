import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReviewOverview } from '../../src/features/review-queue/ReviewOverview';
import { parseReviewFilters } from '../../src/features/review-queue/ReviewContracts';
import { initialSourceState } from '../../src/features/review-queue/ReviewLoader';
import { reviewSources } from '../../src/features/review-queue/ReviewSources';

describe('Restored review overview retains evidence boundaries', () => {
  it('keeps unavailable counts and unmeasured SLA unknown instead of showing zero', async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const source = reviewSources.find(source => source.reason === 'workflow_review')!;
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<MemoryRouter><ReviewOverview items={[]} states={[initialSourceState(source, true)]} filters={parseReviewFilters(new URLSearchParams())} onFilter={vi.fn()} language="en" now={Date.now()} /></MemoryRouter>); });
    const cards = tree.root.findAllByType('button');
    expect(cards.filter(card => card.findAllByType('span').some(span => span.children.includes('Evidenced overdue')))).toHaveLength(1);
    expect(tree.root.findAllByType('span').filter(span => span.children.includes('0'))).toHaveLength(0);
    expect(tree.root.findAllByType('span').filter(span => span.children.includes('—')).length).toBeGreaterThan(0);
    await act(async () => tree.unmount());
  });
  it('uses the existing filter action and displays a verified empty sample as zero', async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const source = reviewSources.find(source => source.reason === 'workflow_review')!, onFilter = vi.fn();
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<MemoryRouter><ReviewOverview items={[]} states={[{ ...initialSourceState(source, true), availability: 'ready', total: 0, nextPage: null }]} filters={parseReviewFilters(new URLSearchParams())} onFilter={onFilter} language="en" now={Date.now()} /></MemoryRouter>); });
    const card = tree.root.findAllByType('button').find(card => card.findAllByType('span').some(span => span.children.includes('In review')))!;
    expect(card.findAllByType('span').some(span => span.children.includes('0'))).toBe(true);
    await act(async () => card.props.onClick());
    expect(onFilter).toHaveBeenCalledWith('reason', 'workflow_review');
    await act(async () => tree.unmount());
  });
});
