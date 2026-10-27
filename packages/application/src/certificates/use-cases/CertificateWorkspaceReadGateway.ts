export type CertificateReviewKind =
  'templates' | 'issuers' | 'delegations' | 'corrections' | 'revalidation' | 'recovery';
export interface CertificateWorkspaceQuery {
  kind: CertificateReviewKind;
  page: number;
  pageSize: number;
}
export interface CertificateWorkspaceRow {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
  path: string;
}
export interface CertificateWorkspacePage {
  data: CertificateWorkspaceRow[];
  total: number;
  page: number;
  pageSize: number;
}
/** P14 owner projections only. Review decisions remain on their canonical commands. */
export interface CertificateWorkspaceReadGateway {
  read(query: CertificateWorkspaceQuery): Promise<CertificateWorkspacePage>;
  templateVersions(query: {
    templateId: string;
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{
    data: Array<{ id: string; versionNumber: string; status: string; createdAt: Date }>;
    total: number;
    page: number;
    pageSize: number;
  }>;
}
