import { NamespacedKey } from '../value-objects/NamespacedKey';
import { ValueType } from '../enums/ValueType';
import { IDomainEvent } from '@manaratak/core';
import { SettingDefinitionCreatedEvent } from '../events/SettingDefinitionCreatedEvent';

export interface SettingDefinitionProps {
  id: string;
  key: NamespacedKey;
  valueType: ValueType;
  description?: string;
  defaultValue?: unknown;
  isFeatureFlag?: boolean;
  isDeprecated?: boolean;
  isSecret?: boolean;
}

export class SettingDefinition {
  public readonly id: string;
  public readonly key: NamespacedKey;
  public readonly valueType: ValueType;
  public readonly description?: string;
  public readonly defaultValue?: unknown;
  public readonly isFeatureFlag: boolean;
  public readonly isDeprecated: boolean;
  public readonly isSecret: boolean;

  private _domainEvents: IDomainEvent[] = [];

  constructor(props: SettingDefinitionProps, isNew = false) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('SettingDefinition id is required.');
    }
    if (!props.key) {
      throw new Error('SettingDefinition key is required.');
    }
    if (!props.valueType) {
      throw new Error('SettingDefinition valueType is required.');
    }

    if ((props.isSecret ?? false) && props.defaultValue !== undefined && props.defaultValue !== null) {
      throw new Error('Secret setting definitions cannot persist a default value. Use the approved runtime secret provider.');
    }

    this.id = props.id.trim();
    this.key = props.key;
    this.valueType = props.valueType;
    this.description = props.description;
    this.defaultValue = props.defaultValue;
    this.isFeatureFlag = props.isFeatureFlag ?? false;
    this.isDeprecated = props.isDeprecated ?? false;
    this.isSecret = props.isSecret ?? false;

    if (isNew) {
      this.addDomainEvent(new SettingDefinitionCreatedEvent(this.id, this.key.toString()));
    }
  }

  get domainEvents(): IDomainEvent[] {
    return [...this._domainEvents];
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }

  protected addDomainEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }

  public equals(object?: any): boolean {
    if (object == null || object === undefined) return false;
    if (this === object) return true;
    if (!(object instanceof this.constructor)) return false;
    return this.id === (object as any).id;
  }
}
