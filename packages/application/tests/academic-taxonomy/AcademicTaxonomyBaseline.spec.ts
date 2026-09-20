import { describe, it, expect } from 'vitest';
import { AcademicTaxonomyDeterministicKey, AcademicTaxonomyNodeType, AcademicStandardType } from '@manaratak/domain';

// Extract the baseline logic to be testable
const taxonomyNodes = [
  // Fields
  { nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD, canonicalCode: '04', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD, canonicalCode: '05', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD, canonicalCode: '06', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD, canonicalCode: '07', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD, canonicalCode: '09', standardType: AcademicStandardType.ISCED },

  // Disciplines
  { nodeType: AcademicTaxonomyNodeType.DISCIPLINE, canonicalCode: '061', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.DISCIPLINE, canonicalCode: '071', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.DISCIPLINE, canonicalCode: '091', standardType: AcademicStandardType.ISCED },

  // Program Areas
  { nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA, canonicalCode: '0611', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA, canonicalCode: '0612', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA, canonicalCode: '0613', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA, canonicalCode: '0912', standardType: AcademicStandardType.ISCED },
  { nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA, canonicalCode: '0916', standardType: AcademicStandardType.ISCED }
];

const taxonomyEdges = [
  { parent: 'ISCED:ACADEMIC_FIELD:06', child: 'ISCED:DISCIPLINE:061' },
  { parent: 'ISCED:DISCIPLINE:061', child: 'ISCED:PROGRAM_AREA:0611' },
  { parent: 'ISCED:DISCIPLINE:061', child: 'ISCED:PROGRAM_AREA:0612' },
  { parent: 'ISCED:DISCIPLINE:061', child: 'ISCED:PROGRAM_AREA:0613' },
  
  { parent: 'ISCED:ACADEMIC_FIELD:07', child: 'ISCED:DISCIPLINE:071' },

  { parent: 'ISCED:ACADEMIC_FIELD:09', child: 'ISCED:DISCIPLINE:091' },
  { parent: 'ISCED:DISCIPLINE:091', child: 'ISCED:PROGRAM_AREA:0912' },
  { parent: 'ISCED:DISCIPLINE:091', child: 'ISCED:PROGRAM_AREA:0916' }
];

describe('Academic Taxonomy Baseline Definitions', () => {
  it('should have unique deterministic keys across all canonical baseline nodes', () => {
    const keys = taxonomyNodes.map(node => AcademicTaxonomyDeterministicKey.create(node));
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('should have no self-edges', () => {
    for (const edge of taxonomyEdges) {
      expect(edge.parent).not.toEqual(edge.child);
    }
  });

  it('should have no duplicate edges', () => {
    const edgeSet = new Set(taxonomyEdges.map(e => `${e.parent}->${e.child}`));
    expect(edgeSet.size).toBe(taxonomyEdges.length);
  });

  it('should only contain edges between valid nodes defined in the baseline', () => {
    const validKeys = new Set(taxonomyNodes.map(node => AcademicTaxonomyDeterministicKey.create(node)));
    for (const edge of taxonomyEdges) {
      expect(validKeys.has(edge.parent)).toBe(true);
      expect(validKeys.has(edge.child)).toBe(true);
    }
  });

  it('should prevent hierarchy cycles', () => {
    // Simple cycle detection
    const adjacencyList = new Map<string, string[]>();
    for (const edge of taxonomyEdges) {
      if (!adjacencyList.has(edge.parent)) {
        adjacencyList.set(edge.parent, []);
      }
      adjacencyList.get(edge.parent)!.push(edge.child);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    function isCyclicUtil(node: string): boolean {
      if (!visited.has(node)) {
        visited.add(node);
        recStack.add(node);

        const children = adjacencyList.get(node) || [];
        for (const child of children) {
          if (!visited.has(child) && isCyclicUtil(child)) {
            return true;
          } else if (recStack.has(child)) {
            return true;
          }
        }
      }
      recStack.delete(node);
      return false;
    }

    let hasCycle = false;
    for (const node of adjacencyList.keys()) {
      if (isCyclicUtil(node)) {
        hasCycle = true;
        break;
      }
    }

    expect(hasCycle).toBe(false);
  });
});
// Just to trigger a re-run or compile
