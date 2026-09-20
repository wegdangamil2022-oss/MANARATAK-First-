import { RetentionCandidate, RetentionDecision, RetentionDisposition, RetentionOwner, decideRetention } from '@manaratak/domain';

export interface IRetentionOwnerGateway {
  readonly owner: RetentionOwner;
  listDue(now: Date, limit: number): Promise<RetentionCandidate[]>;
  applyDecision(candidate: RetentionCandidate, decision: RetentionDecision): Promise<'APPLIED' | 'SKIPPED'>;
}

export interface IRetentionDecisionRepository {
  hasTerminalDecision(decisionKey: string): Promise<boolean>;
  append(input: RetentionDecision & { result: 'APPLIED' | 'SKIPPED' | 'FAILED'; errorMessage?: string | null }): Promise<void>;
}

export interface RetentionSweepResult {
  examined: number;
  applied: number;
  skipped: number;
  failed: number;
  failures: Array<{ owner: RetentionOwner; recordId: string; error: string }>;
}

export class RetentionSweepUseCase {
  constructor(
    private readonly gateways: readonly IRetentionOwnerGateway[],
    private readonly decisions: IRetentionDecisionRepository,
  ) {}

  async execute(input: { now?: Date; limitPerOwner?: number } = {}): Promise<RetentionSweepResult> {
    const now = input.now ?? new Date();
    const limit = Math.min(500, Math.max(1, Math.trunc(input.limitPerOwner ?? 100)));
    const result: RetentionSweepResult = { examined: 0, applied: 0, skipped: 0, failed: 0, failures: [] };
    for (const gateway of this.gateways) {
      const candidates = await gateway.listDue(now, limit);
      for (const candidate of candidates) {
        result.examined++;
        const decision = decideRetention(candidate, now);
        if (await this.decisions.hasTerminalDecision(decision.decisionKey)) { result.skipped++; continue; }
        if (decision.disposition === RetentionDisposition.KEEP) {
          await this.decisions.append({ ...decision, result: 'SKIPPED' });
          result.skipped++;
          continue;
        }
        try {
          const outcome = await gateway.applyDecision(candidate, decision);
          await this.decisions.append({ ...decision, result: outcome });
          outcome === 'APPLIED' ? result.applied++ : result.skipped++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await this.decisions.append({ ...decision, result: 'FAILED', errorMessage: message });
          result.failed++;
          result.failures.push({ owner: candidate.owner, recordId: candidate.recordId, error: message });
        }
      }
    }
    return result;
  }
}
