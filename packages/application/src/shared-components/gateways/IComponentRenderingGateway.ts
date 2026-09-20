import { SharedComponent } from '@manaratak/domain';

export interface IComponentRenderingGateway {
  /**
   * Notifies the physical rendering infrastructure of a component's structural intent.
   * This is used to synchronize the logical definition with the physical presentation layer.
   */
  synchronize(component: SharedComponent): Promise<void>;

  /**
   * Requests the physical decommissioning of a component's rendering capability.
   */
  decommission(component: SharedComponent): Promise<void>;
}
