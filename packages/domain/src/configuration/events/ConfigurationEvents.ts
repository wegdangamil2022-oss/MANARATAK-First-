import { ConfigurationReference } from '../value-objects/ConfigurationReference';

export abstract class ConfigurationEvent {
  public readonly timestamp: Date = new Date();
  constructor(public readonly configReference: ConfigurationReference) {}
}

export class ConfigurationCreatedEvent extends ConfigurationEvent {
  constructor(configReference: ConfigurationReference) {
    super(configReference);
    console.log(`[Domain Event] Configuration Created: ${configReference.getValue()}`);
  }
}

export class ConfigurationActivatedEvent extends ConfigurationEvent {
  constructor(configReference: ConfigurationReference) {
    super(configReference);
    console.log(`[Domain Event] Configuration Activated: ${configReference.getValue()}`);
  }
}

export class ConfigurationVersionPublishedEvent extends ConfigurationEvent {
  constructor(configReference: ConfigurationReference, public readonly version: string) {
    super(configReference);
    console.log(`[Domain Event] Configuration Version Published: ${configReference.getValue()} v${version}`);
  }
}

export class ConfigurationDeprecatedEvent extends ConfigurationEvent {
  constructor(configReference: ConfigurationReference) {
    super(configReference);
    console.log(`[Domain Event] Configuration Deprecated: ${configReference.getValue()}`);
  }
}

export class ConfigurationArchivedEvent extends ConfigurationEvent {
  constructor(configReference: ConfigurationReference) {
    super(configReference);
    console.log(`[Domain Event] Configuration Archived: ${configReference.getValue()}`);
  }
}
