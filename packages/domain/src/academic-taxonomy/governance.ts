import type { AcademicStandardType, AcademicTaxonomyNodeType, AcademicTaxonomyStatus } from './enums';
import type { AcademicTaxonomyNodeDto, AcademicTaxonomyEdgeDto, AcademicTaxonomyAliasDto, AcademicStandardMappingDto } from './contracts';
export type TaxonomyCrosswalkState = 'MAPPED' | 'UNMAPPED' | 'AMBIGUOUS' | 'CONFLICTING' | 'UNRESOLVED';
export interface TaxonomyCrosswalkQuery {
  sourceStandard: AcademicStandardType; targetStandard: AcademicStandardType; nodeType?: AcademicTaxonomyNodeType;
  status?: AcademicTaxonomyStatus; minConfidence?: number; mappingState?: TaxonomyCrosswalkState; q?: string; page?: number;
}
export interface TaxonomyCrosswalkReport {
  data: Array<{ nodeId: string; canonicalCode: string; canonicalName: string; nodeType: string; mappingState: TaxonomyCrosswalkState; candidates: number; qualifiedTargets: number; exactTargets: number }>;
  total: number; counts: Record<TaxonomyCrosswalkState, number>; page: number; pageSize: number; asOf: string;
}
export interface TaxonomyGovernanceSnapshot {
  nodes: AcademicTaxonomyNodeDto[]; contextNodes: AcademicTaxonomyNodeDto[]; edges: AcademicTaxonomyEdgeDto[];
  aliases: AcademicTaxonomyAliasDto[]; mappings: AcademicStandardMappingDto[]; asOf: string; standardType?: AcademicStandardType;
}
export interface TaxonomyDiagnosticIssue { code: string; severity: 'ERROR' | 'WARNING' | 'INFO'; nodeIds: string[]; referenceIds?: string[]; message: string; }
export interface TaxonomyDiagnosticsReport {
  data: TaxonomyDiagnosticIssue[]; total: number; counts: Record<string, number>; page: number; pageSize: number;
  version: string; asOf: string; nodeCount: number; scope: string; boundaryEdges: number;
}
export interface TaxonomyRelatedNodesPage { links?: Array<{ edgeId: string; nodeId: string; isPrimary: boolean }>; data: AcademicTaxonomyNodeDto[]; total: number; page: number; pageSize: number; hasNextPage: boolean; }
/** Derived review worklist state; it is never an automatic equivalence/publication decision. */
export function classifyTaxonomyCrosswalk(input: { candidates: number; qualifiedTargets: number; exactTargets: number }): TaxonomyCrosswalkState {
  if (![input.candidates, input.qualifiedTargets, input.exactTargets].every(value => Number.isSafeInteger(value) && value >= 0) || input.qualifiedTargets > input.candidates || input.exactTargets > input.qualifiedTargets) throw new Error('TAXONOMY_CROSSWALK_COUNTS_INVALID');
  return input.exactTargets > 1 ? 'CONFLICTING' : input.qualifiedTargets > 1 ? 'AMBIGUOUS' : input.qualifiedTargets === 1 ? 'MAPPED' : input.candidates > 0 ? 'UNRESOLVED' : 'UNMAPPED';
}
