import { SourceConnectorCategory } from '@manaratak/domain';
import { BaseSourceConnector } from './BaseSourceConnector';

export class StaticHtmlSourceConnector extends BaseSourceConnector {
  readonly connectorId = 'static-html';
  readonly connectorVersion = '2.0.0';
  readonly category = SourceConnectorCategory.STATIC_HTML;
}
