import { PrismaClient } from '@prisma/client';
import { SharedComponent } from '@manaratak/domain';
import { IComponentRenderingGateway } from '@manaratak/application';

export class PrismaComponentRenderingGateway implements IComponentRenderingGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async synchronize(component: SharedComponent): Promise<void> {
    const payload = this.payload(component);
    await (this.prisma as any).sharedComponentRenderingProjection.upsert({
      where: { componentReference: component.getReference().getValue() },
      update: { ...payload, synchronizedAt: new Date(), decommissionedAt: null },
      create: { componentReference: component.getReference().getValue(), ...payload, synchronizedAt: new Date() },
    });
  }
  async decommission(component: SharedComponent): Promise<void> {
    const payload = this.payload(component);
    await (this.prisma as any).sharedComponentRenderingProjection.upsert({
      where: { componentReference: component.getReference().getValue() },
      update: { ...payload, decommissionedAt: new Date() },
      create: { componentReference: component.getReference().getValue(), ...payload, decommissionedAt: new Date() },
    });
  }
  private payload(component: SharedComponent) {
    return {
      componentId: component.getId().getValue(), version: component.getVersion().getValue(), lifecycleState: component.getState(),
      definition: { properties: component.getDefinition().getProperties(), slots: component.getDefinition().getSlots() },
      renderingIntent: { visualCategory: component.getRenderingIntent().getVisualCategory(), interactionModel: component.getRenderingIntent().getInteractionModel() },
    };
  }
}
