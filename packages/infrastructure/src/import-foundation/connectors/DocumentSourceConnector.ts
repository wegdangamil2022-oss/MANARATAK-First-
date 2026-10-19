import { SourceConnectorCategory } from '@absheer/domain';
import { BaseSourceConnector } from './BaseSourceConnector';

export class DocumentSourceConnector extends BaseSourceConnector {
  readonly connectorId = 'document-stub';
  readonly connectorVersion = '1.0.0';
  readonly category = SourceConnectorCategory.DOCUMENT;
}
