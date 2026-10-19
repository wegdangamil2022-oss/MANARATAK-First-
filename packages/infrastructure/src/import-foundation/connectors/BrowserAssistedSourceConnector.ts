import { SourceConnectorCategory, ImportSourceDefinition } from '@absheer/domain';
import { BaseSourceConnector } from './BaseSourceConnector';
import type { SourceAcquisitionRequest, SourceAcquisitionResult } from '@absheer/application';

export class BrowserAssistedSourceConnector extends BaseSourceConnector {
  readonly connectorId = 'browser-assisted-stub';
  readonly connectorVersion = '1.0.0';
  readonly category = SourceConnectorCategory.BROWSER_ASSISTED;
  
  async acquire(_source: ImportSourceDefinition, _request?: SourceAcquisitionRequest): Promise<SourceAcquisitionResult> {
    throw new Error('BROWSER_ASSISTED_SOURCE_REQUIRES_AUTHORIZED_HUMAN_ACTION');
  }
}
