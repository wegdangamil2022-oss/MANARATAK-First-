import { describe, expect, it } from 'vitest';
import { HierarchyValidationService } from '../../src/hierarchy';
import type { HierarchyEdgeReference } from '../../src/hierarchy';

describe('P7.13 generic DAG foundation', () => {
  const svc = new HierarchyValidationService();
  const edges: HierarchyEdgeReference[] = [
    { parentNodeId: 'A', childNodeId: 'B' },
    { parentNodeId: 'A', childNodeId: 'C' },
    { parentNodeId: 'B', childNodeId: 'D' },
    { parentNodeId: 'C', childNodeId: 'D' },
  ];

  it('finds a shortest polyhierarchical path without selecting a random parent', () => {
    const path = svc.resolveShortestPath('A', 'D', edges);
    expect(path).toEqual(['A', 'B', 'D']);
    expect(svc.resolveShortestPath('D', 'A', edges)).toBe(null);
  });
  it('rejects back edges and direct self cycles, accepts non-cycling edges', () => {
    expect(svc.validateNoCycles('D', 'A', edges)).toBe(false);
    expect(svc.validateNoCycles('D', 'D', edges)).toBe(false);
    expect(svc.validateNoCycles('D', 'E', edges)).toBe(true);
  });
  it('handles a deep chain without recursive call-stack failure', () => {
    const chain: HierarchyEdgeReference[] = Array.from({ length: 300 }, (_, i) => ({
      parentNodeId: String(i), childNodeId: String(i + 1),
    }));
    expect(svc.hasPath('0', '300', chain)).toBe(true);
    expect(svc.resolveShortestPath('0', '300', chain)?.length).toBe(301);
  });
});
