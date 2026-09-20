import {
  SecurityPolicy,
  SecurityPolicyId,
  SecurityPolicyReference,
  SecurityOwnerReference,
  SecurityPolicyDefinition,
  SecurityRuleDefinition,
  SecurityPolicyClassification,
  SecurityVersion,
  SecurityMetadata,
  SecurityIntent,
  SecurityLifecycleState,
  ISecurityPolicyRepository,
  SecurityPolicyReferenceSpecification,
  SecurityPolicyValidationService,
  SecurityLifecycleService,
  SecurityPolicyCreatedEvent,
  SecurityPolicyActivatedEvent,
  SecurityVersionPublishedEvent,
  SecurityPolicyDeprecatedEvent,
  SecurityPolicyArchivedEvent
} from '@manaratak/domain';
import {
  CreateSecurityPolicyDto,
  UpdateSecurityPolicyDto,
  SecurityPolicyResponseDto
} from '../dtos/SecurityDtos';
import { ISecurityEnforcementGateway } from '../gateways/ISecurityEnforcementGateway';

export class ManageSecurityPoliciesUseCase {
  constructor(
    private readonly repository: ISecurityPolicyRepository,
    private readonly enforcementGateway: ISecurityEnforcementGateway
  ) {}

  public async createPolicy(dto: CreateSecurityPolicyDto): Promise<SecurityPolicyResponseDto> {
    const reference = new SecurityPolicyReference(dto.reference);
    const ownerReference = new SecurityOwnerReference(dto.ownerReference);
    
    const definition = new SecurityPolicyDefinition(
      dto.definition.purpose,
      dto.definition.scope,
      dto.definition.structuralIntent
    );
    
    const rules = dto.rules.map(r => new SecurityRuleDefinition(r.name, r.intent, r.parameters));
    
    SecurityPolicyValidationService.validate(definition, rules);

    const classification = new SecurityPolicyClassification(dto.classification.level);
    const metadata = new SecurityMetadata(dto.metadata);
    const version = SecurityVersion.initial();
    const intent = new SecurityIntent(dto.intent.reason, dto.intent.impact);

    const policy = new SecurityPolicy(
      new SecurityPolicyId(),
      reference,
      ownerReference,
      definition,
      rules,
      classification,
      metadata,
      version,
      intent
    );

    await this.repository.save(policy);
    new SecurityPolicyCreatedEvent(policy.getReference());

    return this.mapToResponse(policy);
  }

  public async activatePolicy(referenceValue: string): Promise<SecurityPolicyResponseDto> {
    const policy = await this.getPolicy(referenceValue);
    SecurityLifecycleService.transitionTo(policy, SecurityLifecycleState.ACTIVATED);

    await this.repository.save(policy);
    await this.enforcementGateway.synchronize(policy);
    
    new SecurityPolicyActivatedEvent(policy.getReference());
    return this.mapToResponse(policy);
  }

  public async updatePolicyDefinition(referenceValue: string, dto: UpdateSecurityPolicyDto): Promise<SecurityPolicyResponseDto> {
    const existing = await this.getPolicy(referenceValue);
    
    const newDefinition = new SecurityPolicyDefinition(
      dto.definition.purpose,
      dto.definition.scope,
      dto.definition.structuralIntent
    );
    
    const newRules = dto.rules.map(r => new SecurityRuleDefinition(r.name, r.intent, r.parameters));
    
    SecurityPolicyValidationService.validate(newDefinition, newRules);

    const newClassification = new SecurityPolicyClassification(dto.classification.level);
    const newIntent = new SecurityIntent(dto.intent.reason, dto.intent.impact);
    const newVersion = existing.getVersion().nextPatch();

    // As per ADR-3, any modification creates a completely new SecurityPolicy (logical immutability)
    const newPolicy = new SecurityPolicy(
      new SecurityPolicyId(),
      new SecurityPolicyReference(existing.getReference().getValue()),
      existing.getOwnerReference(),
      newDefinition,
      newRules,
      newClassification,
      existing.getMetadata(),
      newVersion,
      newIntent,
      existing.getLifecycleState()
    );

    await this.repository.save(newPolicy);
    
    if (newPolicy.getLifecycleState() === SecurityLifecycleState.ACTIVATED) {
      await this.enforcementGateway.synchronize(newPolicy);
    }

    new SecurityVersionPublishedEvent(newPolicy.getReference(), newVersion.getValue());
    return this.mapToResponse(newPolicy);
  }

  public async deprecatePolicy(referenceValue: string): Promise<SecurityPolicyResponseDto> {
    const policy = await this.getPolicy(referenceValue);
    SecurityLifecycleService.transitionTo(policy, SecurityLifecycleState.DEPRECATED);

    await this.repository.save(policy);
    await this.enforcementGateway.synchronize(policy);
    
    new SecurityPolicyDeprecatedEvent(policy.getReference());
    return this.mapToResponse(policy);
  }

  public async archivePolicy(referenceValue: string): Promise<SecurityPolicyResponseDto> {
    const policy = await this.getPolicy(referenceValue);
    SecurityLifecycleService.transitionTo(policy, SecurityLifecycleState.ARCHIVED);

    await this.repository.save(policy);
    await this.enforcementGateway.decommission(policy);
    
    new SecurityPolicyArchivedEvent(policy.getReference());
    return this.mapToResponse(policy);
  }

  public async listPolicies(): Promise<SecurityPolicyResponseDto[]> {
    const policies = await this.repository.findBy({ isSatisfiedBy: () => true });
    return policies.map((p: SecurityPolicy) => this.mapToResponse(p));
  }

  private async getPolicy(referenceValue: string): Promise<SecurityPolicy> {
    const results = await this.repository.findBy(new SecurityPolicyReferenceSpecification(referenceValue));
    if (results.length === 0) {
      throw new Error(`Security Policy with reference ${referenceValue} not found`);
    }
    return results[results.length - 1]; // Return latest version
  }

  private mapToResponse(p: SecurityPolicy): SecurityPolicyResponseDto {
    const metadata: Record<string, string> = {};
    p.getMetadata().getData().forEach((v: string, k: string) => metadata[k] = v);

    return {
      reference: p.getReference().getValue(),
      ownerReference: p.getOwnerReference().getValue(),
      version: p.getVersion().getValue(),
      lifecycleState: p.getLifecycleState(),
      definition: {
        purpose: p.getDefinition().getPurpose(),
        scope: p.getDefinition().getScope(),
        structuralIntent: p.getDefinition().getStructuralIntent()
      },
      rules: p.getRules().map((r: any) => ({
        name: r.getName(),
        intent: r.getIntent(),
        parameters: r.getParameters()
      })),
      classification: {
        level: p.getClassification().getLevel()
      },
      intent: {
        reason: p.getIntent().getReason(),
        impact: p.getIntent().getImpact()
      },
      metadata
    };
  }
}
