import { SourceConnectorCategory } from '@manaratak/domain';
import { BaseSourceConnector } from './BaseSourceConnector';

export class OfficialApiSourceConnector extends BaseSourceConnector {
  readonly connectorId = 'official-api';
  readonly connectorVersion = '2.0.0';
  readonly category = SourceConnectorCategory.OFFICIAL_API;
}
