import { FileReference } from '../value-objects/FileReference';

export interface IDownloadAuthorizationGateway {
  authorizeDownload(fileReference: FileReference, userContext: unknown): Promise<boolean>;
}
