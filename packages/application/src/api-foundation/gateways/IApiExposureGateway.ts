import { ApiService } from '@manaratak/domain';

export interface IApiExposureGateway {
  /**
   * Publishes the logical API Service exposure intent to the physical infrastructure gateway.
   */
  expose(apiService: ApiService): Promise<void>;

  /**
   * Logical command to decommission the physical exposure of the API Service.
   */
  decommission(apiService: ApiService): Promise<void>;
}
