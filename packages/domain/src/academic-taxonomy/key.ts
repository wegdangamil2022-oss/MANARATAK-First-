import { AcademicTaxonomyNodeType, AcademicStandardType } from './enums';

export interface AcademicTaxonomyDeterministicKeyInput {
  nodeType: AcademicTaxonomyNodeType;
  canonicalCode: string;
  standardType?: AcademicStandardType;
}

export class AcademicTaxonomyDeterministicKey {
  static create(input: AcademicTaxonomyDeterministicKeyInput): string {
    if (!input) {
      throw new Error('Input is required');
    }
    if (!input.nodeType) {
      throw new Error('nodeType is required');
    }
    if (!input.canonicalCode || typeof input.canonicalCode !== 'string') {
      throw new Error('canonicalCode is required and must be a string');
    }
    const trimmedCode = input.canonicalCode.trim();
    if (trimmedCode === '') {
      throw new Error('canonicalCode cannot be empty');
    }
    const codeUpper = trimmedCode.toUpperCase();
    const nodeTypeUpper = String(input.nodeType).toUpperCase();

    if (input.standardType) {
      const standardUpper = String(input.standardType).toUpperCase();
      return `${standardUpper}:${nodeTypeUpper}:${codeUpper}`;
    }

    return `${nodeTypeUpper}:${codeUpper}`;
  }
}
