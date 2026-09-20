import { FileReference } from '../value-objects/FileReference';

export interface IDownloadAuthorizationGateway {
  authorizeDownload(fileReference: FileReference, userContext: any): Promise<boolean>;
}
