import { DomainSpecification, GeneratedId, ReferenceSpecification, SemanticVersion, StringMetadata, StringValue, UnknownRecord } from './common';

export type SecuritySensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
export const SecuritySensitivity = Object.freeze({ PUBLIC:'PUBLIC', INTERNAL:'INTERNAL', CONFIDENTIAL:'CONFIDENTIAL', RESTRICTED:'RESTRICTED' } as const);
export enum SecurityLifecycleState { CREATED='CREATED', ACTIVATED='ACTIVATED', DEPRECATED='DEPRECATED', ARCHIVED='ARCHIVED' }
export class SecurityPolicyId extends GeneratedId { constructor(value?: string) { super(value, 'security-policy'); } }
export class SecurityPolicyReference extends StringValue { constructor(value: string) { super(value, 'Security policy reference'); } }
export class SecurityOwnerReference extends StringValue { constructor(value: string) { super(value, 'Security owner reference'); } }
export class SecurityPolicyDefinition {
  constructor(private readonly purpose: string, private readonly scope: string, private readonly structuralIntent: UnknownRecord) { if (!purpose.trim() || !scope.trim()) throw new Error('Security policy purpose and scope are required'); }
  getPurpose(): string { return this.purpose; } getScope(): string { return this.scope; } getStructuralIntent(): UnknownRecord { return this.structuralIntent; }
}
export type SecurityRuleIntent = 'ALLOW'|'DENY'|'REQUIRE';
export class SecurityRuleDefinition {
  constructor(private readonly name: string, private readonly intent: SecurityRuleIntent, private readonly parameters: UnknownRecord) { if (!name.trim()) throw new Error('Security rule name is required'); }
  getName(): string { return this.name; } getIntent(): string { return this.intent; } getParameters(): UnknownRecord { return this.parameters; }
}
export class SecurityPolicyClassification { constructor(private readonly level: SecuritySensitivity) {} getLevel(): string { return this.level; } }
export class SecurityVersion { private constructor(private readonly version: SemanticVersion) {} static initial(): SecurityVersion { return new SecurityVersion(SemanticVersion.initial()); } nextPatch(): SecurityVersion { return new SecurityVersion(this.version.nextPatch()); } getValue(): string { return this.version.getValue(); } }
export class SecurityMetadata extends StringMetadata {}
export class SecurityIntent { constructor(private readonly reason: string, private readonly impact: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL') { if (!reason.trim()) throw new Error('Security intent reason is required'); } getReason(): string { return this.reason; } getImpact(): string { return this.impact; } }
export class SecurityPolicy {
  private lifecycleState: SecurityLifecycleState;
  constructor(private readonly id: SecurityPolicyId, private readonly reference: SecurityPolicyReference, private readonly ownerReference: SecurityOwnerReference, private readonly definition: SecurityPolicyDefinition, private readonly rules: readonly SecurityRuleDefinition[], private readonly classification: SecurityPolicyClassification, private readonly metadata: SecurityMetadata, private readonly version: SecurityVersion, private readonly intent: SecurityIntent, lifecycleState: SecurityLifecycleState = SecurityLifecycleState.CREATED) { this.rules = Object.freeze([...rules]); this.lifecycleState = lifecycleState; }
  getId(): SecurityPolicyId { return this.id; } getReference(): SecurityPolicyReference { return this.reference; } getOwnerReference(): SecurityOwnerReference { return this.ownerReference; } getDefinition(): SecurityPolicyDefinition { return this.definition; } getRules(): readonly SecurityRuleDefinition[] { return this.rules; } getClassification(): SecurityPolicyClassification { return this.classification; } getMetadata(): SecurityMetadata { return this.metadata; } getVersion(): SecurityVersion { return this.version; } getIntent(): SecurityIntent { return this.intent; } getLifecycleState(): SecurityLifecycleState { return this.lifecycleState; } setLifecycleState(state: SecurityLifecycleState): void { this.lifecycleState = state; }
}
export interface ISecurityPolicyRepository { save(policy: SecurityPolicy): Promise<void>; findBy(specification: DomainSpecification<SecurityPolicy>): Promise<SecurityPolicy[]>; }
export class SecurityPolicyReferenceSpecification extends ReferenceSpecification<SecurityPolicy> { constructor(reference: string) { super(reference); } }
export class SecurityPolicyValidationService { static validate(definition: SecurityPolicyDefinition, rules: readonly SecurityRuleDefinition[]): void { if (!definition.getPurpose() || rules.length === 0) throw new Error('Security policy requires at least one rule'); } }
export class SecurityLifecycleService { static transitionTo(policy: SecurityPolicy, state: SecurityLifecycleState): SecurityPolicy { if (policy.getLifecycleState() === SecurityLifecycleState.ARCHIVED) throw new Error('Archived security policy cannot transition'); policy.setLifecycleState(state); return policy; } }
export class SecurityPolicyCreatedEvent { constructor(public readonly reference: SecurityPolicyReference) {} }
export class SecurityPolicyActivatedEvent { constructor(public readonly reference: SecurityPolicyReference) {} }
export class SecurityVersionPublishedEvent { constructor(public readonly reference: SecurityPolicyReference, public readonly version: string) {} }
export class SecurityPolicyDeprecatedEvent { constructor(public readonly reference: SecurityPolicyReference) {} }
export class SecurityPolicyArchivedEvent { constructor(public readonly reference: SecurityPolicyReference) {} }
