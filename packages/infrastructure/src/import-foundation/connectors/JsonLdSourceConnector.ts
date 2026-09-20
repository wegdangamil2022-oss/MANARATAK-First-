import { SourceConnectorCategory } from '@manaratak/domain';
import { BaseSourceConnector } from './BaseSourceConnector';

export class JsonLdSourceConnector extends BaseSourceConnector {
  readonly connectorId = 'json-ld-stub';
  readonly connectorVersion = '1.0.0';
  readonly category = SourceConnectorCategory.JSON_LD;
}
