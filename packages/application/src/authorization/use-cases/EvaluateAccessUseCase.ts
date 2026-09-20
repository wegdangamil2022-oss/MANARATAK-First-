import { 
  AuthorizationEvaluatorService, 
  ResourceUrn, 
  Action 
} from '@manaratak/domain';
import { EvaluateAccessInput, AccessDecisionDto } from '../dtos/AuthorizationDtos';

export class EvaluateAccessUseCase {
  constructor(private readonly evaluatorService: AuthorizationEvaluatorService) {}

  public async execute(input: EvaluateAccessInput): Promise<AccessDecisionDto> {
    const decision = await this.evaluatorService.evaluateAccess(
      input.identityId,
      new ResourceUrn(input.resourceUrn),
      new Action(input.action),
      input.contextAttributes || {}
    );

    return {
      isGranted: decision.isGranted,
      result: decision.result,
      reasons: decision.reasons
    };
  }
}
