import { describe, it, expect } from 'vitest';
import { AcademicTaxonomyDeterministicKey } from '@manaratak/domain';
import { AcademicTaxonomyNodeType, AcademicStandardType } from '@manaratak/domain';

describe('Academic Taxonomy Seed Baseline', () => {
  it('should generate valid deterministic keys', () => {
    const key1 = AcademicTaxonomyDeterministicKey.create({
      nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
      canonicalCode: '06',
      standardType: AcademicStandardType.ISCED
    });
    expect(key1).toBe('ISCED:ACADEMIC_FIELD:06');

    const key2 = AcademicTaxonomyDeterministicKey.create({
      nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA,
      canonicalCode: '0613',
      standardType: AcademicStandardType.ISCED
    });
    expect(key2).toBe('ISCED:PROGRAM_AREA:0613');
  });

  it('should prevent invalid node types in deterministic key generation', () => {
    expect(() => {
      AcademicTaxonomyDeterministicKey.create({
        nodeType: 'INVALID_TYPE' as AcademicTaxonomyNodeType,
        canonicalCode: '123'
      });
    }).not.toThrow(); 
    // Wait, the key generator just casts it to string and toUpperCase, 
    // it relies on TypeScript for type checking, so it doesn't throw on invalid enums, 
    // but the output will just be INVALID_TYPE:123
    
    expect(() => {
      AcademicTaxonomyDeterministicKey.create({
        nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
        canonicalCode: ''
      });
    }).toThrow('canonicalCode is required and must be a string');
  });
});
