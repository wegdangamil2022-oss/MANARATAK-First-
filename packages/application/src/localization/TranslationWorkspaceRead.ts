import type { ITranslationImportGateway } from '../translation-import/TranslationImportContracts';
export type TranslationWorkspaceDomain =
  'UNIVERSITY' | 'MAJOR' | 'INTERNATIONAL_TEST' | 'SCHOLARSHIP' | 'COURSE';
export interface TranslationWorkspaceQuery {
  domain: TranslationWorkspaceDomain;
  page: number;
  pageSize: number;
  q?: string;
  coverage?: 'ALL' | 'MISSING_AR' | 'MISSING_EN' | 'COMPLETE';
  locale?: 'ar' | 'en';
  reviewState?: 'ALL' | 'NEEDS_REVIEW' | 'PUBLISHED' | 'REJECTED';
  sort?: 'UPDATED_DESC' | 'UPDATED_ASC' | 'NAME_ASC';
  updatedFrom?: Date;
}
export interface TranslationWorkspaceResult {
  data: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  coverageScope: 'GLOBAL';
  fieldScope: string;
  ownerSourceStatus: string;
  runtimeProof: string;
  migrationRequired: boolean;
  publicationReadiness: string;
  importSupported: boolean;
  stats: {
    complete: number;
    pending: number;
    rejected: number;
    published: number;
    missingAr: number;
    missingEn: number;
    publicReadyAr: number;
    publicReadyEn: number;
  };
}
export interface ITranslationWorkspaceReadGateway {
  search(input: TranslationWorkspaceQuery): Promise<TranslationWorkspaceResult>;
}
export type TranslationOwnerPublisher = {
  resolveExact: ITranslationImportGateway['resolveExact'];
  publishApproved: NonNullable<ITranslationImportGateway['publishApproved']>;
};
