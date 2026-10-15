import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FeaturedCatalogImage } from '../../src/features/public-template/components/FeaturedCatalogImage';
let tree: ReactTestRenderer | undefined;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
describe('owner images without invented replacements', () => {
  it('does not issue an empty img request and falls back to an inert icon', async () => {
    await act(async () => { tree = create(<FeaturedCatalogImage src="" alt="Published title" kind="universities" />); });
    expect(tree!.root.findAllByType('img')).toHaveLength(0);
    expect(tree!.root.findByType('span').props['aria-hidden']).toBe('true');
  });
  it('renders the supplied image, handles a broken grant once and accepts a refreshed URL', async () => {
    await act(async () => { tree = create(<FeaturedCatalogImage src="https://media.example.test/grant-a" alt="Owner title" kind="courses" />); });
    expect(tree!.root.findByType('img').props.src).toBe('https://media.example.test/grant-a');
    await act(async () => tree!.root.findByType('img').props.onError());
    expect(tree!.root.findAllByType('img')).toHaveLength(0);
    expect(JSON.stringify(tree!.toJSON())).not.toContain('unsplash');
    await act(async () => tree!.update(<FeaturedCatalogImage src="https://media.example.test/grant-b" alt="Owner title" kind="courses" />));
    expect(tree!.root.findByType('img').props.src).toBe('https://media.example.test/grant-b');
  });
});
