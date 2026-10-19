import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
} from './enums';

export const UNESCO_ISCED_PROVENANCE = {
  provenance: 'UNESCO_UIS_ISCED_F_2013',
  sourceVersion: '2013',
  sourceUrl: 'http://uis.unesco.org/sites/default/files/documents/isced-fields-of-education-and-training-2013-en.pdf',
};

export interface ISCEDNodeSeedInput {
  nodeType: AcademicTaxonomyNodeType;
  canonicalCode: string;
  canonicalName: string;
  description: string;
  status: AcademicTaxonomyStatus;
  standardType: AcademicStandardType;
  standardCode: string;
  localizedNames: { ar: string; en: string };
  metadata: {
    provenance: string;
    sourceVersion: string;
    sourceUrl: string;
  };
}

export const iscedFBaselineNodes: ISCEDNodeSeedInput[] = [];

// Build Edges automatically from Field -> Discipline -> Program Area hierarchy rules
export interface ISCEDEdgeSeedInput {
  parent: string;
  child: string;
}

export const iscedFBaselineEdges: ISCEDEdgeSeedInput[] = [];

export interface ISCEDAliasSeedInput {
  nodeKey: string;
  locale: string;
  alias: string;
}

export const iscedFBaselineAliases: ISCEDAliasSeedInput[] = [];

export interface ISCEDMappingSeedInput {
  sourceKey: string;
  targetStandard: string;
  targetCode: string;
  strength: string;
}

export const iscedFBaselineMappings: ISCEDMappingSeedInput[] = [];
