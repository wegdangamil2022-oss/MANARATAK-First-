import { ConfigurationId } from '../value-objects/ConfigurationId';
import { ConfigurationReference } from '../value-objects/ConfigurationReference';
import { ConfigurationOwnerReference } from '../value-objects/ConfigurationOwnerReference';
import { ConfigurationDefinition } from '../value-objects/ConfigurationDefinition';
import { ConfigurationValueDefinition } from '../value-objects/ConfigurationValueDefinition';
import { ConfigurationClassification } from '../value-objects/ConfigurationClassification';
import { ConfigurationMetadata } from '../value-objects/ConfigurationMetadata';
import { ConfigurationVersion } from '../value-objects/ConfigurationVersion';
import { ConfigurationLifecycleState } from '../enums/ConfigurationLifecycleState';
import { ConfigurationIntent } from '../value-objects/ConfigurationIntent';

export class Configuration {
  private lifecycleState: ConfigurationLifecycleState;

  constructor(
    private readonly id: ConfigurationId,
    private readonly reference: ConfigurationReference,
    private readonly ownerReference: ConfigurationOwnerReference,
    private readonly definition: ConfigurationDefinition,
    private readonly valueDefinition: ConfigurationValueDefinition,
    private readonly classification: ConfigurationClassification,
    private readonly metadata: ConfigurationMetadata,
    private readonly version: ConfigurationVersion,
    private readonly intent: ConfigurationIntent,
    initialLifecycleState: ConfigurationLifecycleState = ConfigurationLifecycleState.CREATED
  ) {
    this.lifecycleState = initialLifecycleState;
  }

  public getId(): ConfigurationId { return this.id; }
  public getReference(): ConfigurationReference { return this.reference; }
  public getOwnerReference(): ConfigurationOwnerReference { return this.ownerReference; }
  public getDefinition(): ConfigurationDefinition { return this.definition; }
  public getValueDefinition(): ConfigurationValueDefinition { return this.valueDefinition; }
  public getClassification(): ConfigurationClassification { return this.classification; }
  public getMetadata(): ConfigurationMetadata { return this.metadata; }
  public getVersion(): ConfigurationVersion { return this.version; }
  public getIntent(): ConfigurationIntent { return this.intent; }
  public getLifecycleState(): ConfigurationLifecycleState { return this.lifecycleState; }

  public setLifecycleState(newState: ConfigurationLifecycleState): void {
    this.lifecycleState = newState;
  }
}
