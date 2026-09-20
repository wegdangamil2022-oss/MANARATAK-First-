import { PrismaClient } from '@prisma/client';
import {
  ComponentLifecycleState,
  ComponentMetadata,
  ComponentVersion,
  DomainSpecification,
  ISharedComponentRepository,
  RenderingIntent,
  SharedComponent,
  SharedComponentCompatibilityMetadata,
  SharedComponentDefinition,
  SharedComponentId,
  SharedComponentOwnerReference,
  SharedComponentReference,
} from '@manaratak/domain';

type ComponentSnapshot = {
  id: string; reference: string; ownerReference: string;
  properties: Array<{ name: string; type: string; required: boolean }>;
  slots: Array<{ name: string; description: string }>;
  version: string;
  compatibility: { backward: boolean; forward: boolean };
  metadata: Record<string, string>;
  renderingIntent: { visualCategory: string; interactionModel: string };
  lifecycleState: ComponentLifecycleState;
};

export class PrismaSharedComponentRepository implements ISharedComponentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(component: SharedComponent): Promise<void> {
    const snapshot = this.toSnapshot(component);
    await (this.prisma as any).sharedComponentControlRecord.upsert({
      where: { id: snapshot.id },
      update: { reference: snapshot.reference, ownerReference: snapshot.ownerReference, lifecycleState: snapshot.lifecycleState, version: snapshot.version, snapshot },
      create: { id: snapshot.id, reference: snapshot.reference, ownerReference: snapshot.ownerReference, lifecycleState: snapshot.lifecycleState, version: snapshot.version, snapshot },
    });
  }

  async findBy(specification: DomainSpecification<SharedComponent>): Promise<SharedComponent[]> {
    const rows = await (this.prisma as any).sharedComponentControlRecord.findMany({ orderBy: [{ reference: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((row: any) => this.fromSnapshot(row.snapshot as ComponentSnapshot)).filter((item: SharedComponent) => specification.isSatisfiedBy(item));
  }

  private toSnapshot(component: SharedComponent): ComponentSnapshot {
    return {
      id: component.getId().getValue(), reference: component.getReference().getValue(), ownerReference: component.getOwnerReference().getValue(),
      properties: component.getDefinition().getProperties(), slots: component.getDefinition().getSlots(), version: component.getVersion().getValue(),
      compatibility: { backward: component.getCompatibility().getIsBackwardCompatible(), forward: component.getCompatibility().getIsForwardCompatible() },
      metadata: Object.fromEntries(component.getMetadata().getData()),
      renderingIntent: { visualCategory: component.getRenderingIntent().getVisualCategory(), interactionModel: component.getRenderingIntent().getInteractionModel() },
      lifecycleState: component.getState(),
    };
  }

  private fromSnapshot(snapshot: ComponentSnapshot): SharedComponent {
    const [major, minor, patch] = snapshot.version.split('.').map(Number);
    return new SharedComponent(
      new SharedComponentId(snapshot.id), new SharedComponentReference(snapshot.reference), new SharedComponentOwnerReference(snapshot.ownerReference),
      new SharedComponentDefinition(snapshot.properties, snapshot.slots), new ComponentVersion(major, minor, patch),
      new SharedComponentCompatibilityMetadata(snapshot.compatibility.backward, snapshot.compatibility.forward),
      new ComponentMetadata(new Map(Object.entries(snapshot.metadata))),
      new RenderingIntent(snapshot.renderingIntent.visualCategory, snapshot.renderingIntent.interactionModel), snapshot.lifecycleState,
    );
  }
}
