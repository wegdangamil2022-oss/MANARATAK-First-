import { SettingDefinitionUpdatedEvent } from '../events/SettingDefinitionUpdatedEvent';
import { NamespacedKey } from '../value-objects/NamespacedKey';
import { StringValue, NumberValue, BooleanValue, JsonValue } from '../value-objects/SettingValueData';
import { ValueType } from '../enums/ValueType';
import { SettingValidationRules, validateSettingRuleDefinition, validateSettingRuleValue } from '../value-objects/SettingValidationRules';
import { IDomainEvent } from '@manaratak/core';
import { SettingDefinitionCreatedEvent } from '../events/SettingDefinitionCreatedEvent';

export interface SettingDefinitionProps {
  id: string;
  key: NamespacedKey;
  valueType: ValueType;
  description?: string;
  defaultValue?: unknown;
  validationRules?: SettingValidationRules;
  isFeatureFlag?: boolean;
  isDeprecated?: boolean;
  isSecret?: boolean;
  revision?: string;
}

export class SettingDefinition {
  public readonly id: string;
  public readonly key: NamespacedKey;
  public readonly valueType: ValueType;
  public readonly description?: string;
  public readonly defaultValue?: unknown;
  public readonly validationRules?: SettingValidationRules;
  public readonly isFeatureFlag: boolean;
  public readonly isDeprecated: boolean;
  public readonly isSecret: boolean;
  public readonly revision?: string;

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

    if (!Object.values(ValueType).includes(props.valueType)) throw new Error('SETTINGS_VALUE_TYPE_INVALID');
    validateSettingRuleDefinition(props.valueType, props.validationRules);
    if (props.isFeatureFlag && (props.valueType !== ValueType.Boolean || props.isSecret || typeof props.defaultValue !== 'boolean')) {
      throw new Error('SETTINGS_FEATURE_FLAG_BOOLEAN_DEFAULT_REQUIRED');
    }
    if (!props.isSecret && props.defaultValue !== undefined && props.defaultValue !== null) {
      switch (props.valueType) {
        case ValueType.String: new StringValue(props.defaultValue as string); break;
        case ValueType.Number: new NumberValue(props.defaultValue as number); break;
        case ValueType.Boolean: new BooleanValue(props.defaultValue as boolean); break;
        case ValueType.Json: new JsonValue(props.defaultValue as Record<string, unknown>); break;
      }
      validateSettingRuleValue(props.valueType, props.defaultValue, props.validationRules);
    }

    this.revision = props.revision;
    this.id = props.id.trim();
    this.key = props.key;
    this.valueType = props.valueType;
    this.description = props.description;
    this.defaultValue = props.defaultValue;
    this.validationRules = props.validationRules ? Object.freeze({ ...props.validationRules,
      ...(props.validationRules.allowedValues ? { allowedValues: Object.freeze([...props.validationRules.allowedValues]) as unknown as Array<string | number | boolean> } : {}) }) : undefined;
    this.isFeatureFlag = props.isFeatureFlag ?? false;
    this.isDeprecated = props.isDeprecated ?? false;
    this.isSecret = props.isSecret ?? false;

    if (isNew) {
      this.addDomainEvent(new SettingDefinitionCreatedEvent(this.id, this.key.toString()));
    }
  }

  public amendMetadata(changes: { description?: string; isDeprecated?: true }): SettingDefinition {
    if (changes.isDeprecated !== undefined && changes.isDeprecated !== true) throw new Error('SETTINGS_DEFINITION_REACTIVATION_UNAVAILABLE');
    if (changes.description !== undefined && changes.description.length > 2000) throw new Error('SETTINGS_DESCRIPTION_INVALID');
    const updated = new SettingDefinition({ id: this.id, key: this.key, valueType: this.valueType,
      description: changes.description ?? this.description, defaultValue: this.defaultValue, validationRules: this.validationRules,
      isFeatureFlag: this.isFeatureFlag, isSecret: this.isSecret,
      isDeprecated: changes.isDeprecated ?? this.isDeprecated, revision: this.revision });
    updated.addDomainEvent(new SettingDefinitionUpdatedEvent(this.id, this.key.getValue()));
    return updated;
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
