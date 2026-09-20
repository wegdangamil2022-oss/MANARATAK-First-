import { SourceConnectorCategory } from '@manaratak/domain';
import { BaseSourceConnector } from './BaseSourceConnector';

export class OfficialFeedSourceConnector extends BaseSourceConnector {
  readonly connectorId = 'official-feed';
  readonly connectorVersion = '2.0.0';
  readonly category = SourceConnectorCategory.OFFICIAL_FEED;
}
