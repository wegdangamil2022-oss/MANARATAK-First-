import { SettingOverrideClearedEvent } from '../events/SettingOverrideClearedEvent';
import { NamespacedKey } from '../value-objects/NamespacedKey';
import { ScopeIdentifier } from '../value-objects/ScopeIdentifier';
import { SettingValueData } from '../value-objects/SettingValueData';
import { SettingVersion } from '../value-objects/SettingVersion';
import { IDomainEvent } from '@manaratak/core';
import { SettingValueAssignedEvent } from '../events/SettingValueAssignedEvent';
import { SettingValueUpdatedEvent } from '../events/SettingValueUpdatedEvent';
import { SettingValueRolledBackEvent } from '../events/SettingValueRolledBackEvent';

export interface SettingAssignmentProps {
  id: string;
  key: NamespacedKey;
  scope: ScopeIdentifier;
  versions: SettingVersion[];
}

export class SettingAssignment {
  public readonly id: string;
  public readonly key: NamespacedKey;
  public readonly scope: ScopeIdentifier;
  private readonly versions: SettingVersion[];
  
  private _domainEvents: IDomainEvent[] = [];

  constructor(props: SettingAssignmentProps, isNew = false) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('SettingAssignment id is required.');
    }
    if (!props.key) {
      throw new Error('SettingAssignment key is required.');
    }
    if (!props.scope) {
      throw new Error('SettingAssignment scope is required.');
    }
    if (!props.versions || props.versions.length === 0) {
      throw new Error('SettingAssignment must contain at least one version.');
    }

    const versionIds = props.versions.map((version) => version.id);
    if (new Set(versionIds).size !== versionIds.length) {
      throw new Error('SettingAssignment version ids must be unique and immutable.');
    }

    this.id = props.id.trim();
    this.key = props.key;
    this.scope = props.scope;
    this.versions = [...props.versions];

    if (isNew) {
      this.addDomainEvent(new SettingValueAssignedEvent(this.id, this.key.toString(), this.scope));
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

  public getCurrentVersion(): SettingVersion {
    return this.versions[this.versions.length - 1];
  }

  public getVersions(): readonly SettingVersion[] {
    return [...this.versions];
  }

  public updateValue(versionId: string, valueData: SettingValueData, authorId?: string, changeReason?: string): SettingVersion {
    this.assertVersionIdAvailable(versionId);
    const newVersion = new SettingVersion(versionId, valueData, new Date(), authorId, undefined, 'SET', changeReason);
    this.versions.push(newVersion);
    this.addDomainEvent(new SettingValueUpdatedEvent(this.id, this.key.toString(), this.scope, versionId));
    return newVersion;
  }

  public rollbackTo(previousVersionId: string, newVersionId: string, authorId?: string, changeReason?: string): SettingVersion {
    this.assertVersionIdAvailable(newVersionId);
    const targetVersion = this.versions.find((v) => v.id === previousVersionId);
    if (!targetVersion) {
      throw new Error(`Version ${previousVersionId} not found in assignment version history.`);
    }

    const rolledBackVersion = new SettingVersion(newVersionId, targetVersion.value, new Date(), authorId, previousVersionId, targetVersion.operation, changeReason);
    this.versions.push(rolledBackVersion);
    this.addDomainEvent(new SettingValueRolledBackEvent(this.id, previousVersionId, newVersionId));
    return rolledBackVersion;
  }

  public get isOverrideCleared(): boolean { return this.getCurrentVersion().operation === 'CLEAR_OVERRIDE'; }

  public clearOverride(versionId: string, authorId: string | undefined, changeReason: string): SettingVersion {
    this.assertVersionIdAvailable(versionId);
    if (this.isOverrideCleared) throw new Error('SETTINGS_OVERRIDE_ALREADY_CLEARED');
    const version = new SettingVersion(versionId, this.getCurrentVersion().value, new Date(), authorId,
      undefined, 'CLEAR_OVERRIDE', changeReason);
    this.versions.push(version);
    this.addDomainEvent(new SettingOverrideClearedEvent(this.id, this.key.getValue(), versionId));
    return version;
  }

  private assertVersionIdAvailable(versionId: string): void {
    if (!versionId || versionId.trim() === '') {
      throw new Error('Setting version id is required.');
    }
    if (this.versions.some((version) => version.id === versionId)) {
      throw new Error(`Setting version ${versionId} already exists and cannot be mutated.`);
    }
  }

  public equals(object?: any): boolean {
    if (object == null || object === undefined) return false;
    if (this === object) return true;
    if (!(object instanceof this.constructor)) return false;
    return this.id === (object as any).id;
  }
}

