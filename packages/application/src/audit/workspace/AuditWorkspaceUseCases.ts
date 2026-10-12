import { AUDIT_QUERY_CATALOG } from '@manaratak/shared';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type {
  AtomicDomainMutationCoordinator,
  AtomicMutationRequestContext,
} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {
  AuditRetentionPolicyResolver,
  type AuditRetentionDurations,
} from '../use-cases/AuditRetentionPolicyResolver';
export type WorkspaceKind = 'CASE' | 'ALERT_RULE' | 'RETENTION_POLICY';
export interface InvestigationCase {
  title: string;
  ownerId: string;
  assigneeId: string | null;
  status: 'OPEN' | 'INVESTIGATING' | 'CLOSED';
  references: string[];
  notes: Array<{ id: string; authorId: string; at: string; text: string }>;
  history: Array<{ actorId: string; at: string; change: string }>;
  legalHoldUntil: string | null;
}
export interface AuditAlertRule {
  name: string;
  enabled: boolean;
  action?: string;
  category?: string;
  severity?: string;
  outcome?: 'SUCCESS' | 'FAILURE' | 'INTENT' | 'UNKNOWN';
  threshold: number;
  windowMinutes: number;
  cooldownMinutes: number;
  recipientId: string;
  templateId: string;
}
export interface WorkspaceRow {
  id: string;
  kind: WorkspaceKind;
  version: number;
  data: unknown;
}
export interface IAuditWorkspaceGateway {
  occurrences(
    ruleId: string,
    limit: number,
    cursor?: string,
  ): Promise<{
    items: Array<{
      id: string;
      state: string;
      bucket: string;
      matchedCount: number;
      intentId: string;
      ruleVersion: number;
    }>;
    nextCursor: string | null;
  }>;
  get(id: string, kind: WorkspaceKind): Promise<WorkspaceRow | null>;
  list(
    kind: WorkspaceKind,
    limit: number,
    cursor?: string,
  ): Promise<{ items: WorkspaceRow[]; nextCursor: string | null }>;
  save(
    row: WorkspaceRow,
    expectedVersion: number,
    context: AtomicPersistenceContext,
  ): Promise<void>;
  assertReferences(references: string[], context: AtomicPersistenceContext): Promise<void>;
  assertAssignee(identityId: string, context: AtomicPersistenceContext): Promise<void>;
  assertRecipient(identityId: string, templateId: string): Promise<void>;
}
export function validateAlertRule(rule: AuditAlertRule): void {
  if (
    !rule.name?.trim() ||
    rule.name.length > 160 ||
    typeof rule.enabled !== 'boolean' ||
    ![rule.action, rule.category, rule.severity, rule.outcome].some(Boolean) ||
    !Number.isInteger(rule.threshold) ||
    rule.threshold < 1 ||
    rule.threshold > 100 ||
    !Number.isInteger(rule.windowMinutes) ||
    rule.windowMinutes < 1 ||
    rule.windowMinutes > 1440 ||
    !Number.isInteger(rule.cooldownMinutes) ||
    rule.cooldownMinutes < rule.windowMinutes ||
    rule.cooldownMinutes > 10080 ||
    !rule.recipientId ||
    !rule.templateId ||
    (rule.action !== undefined &&
      !(AUDIT_QUERY_CATALOG.actions as readonly string[]).includes(rule.action)) ||
    (rule.category !== undefined &&
      !(AUDIT_QUERY_CATALOG.categories as readonly string[]).includes(rule.category)) ||
    (rule.severity !== undefined &&
      !['INFO', 'WARNING', 'ERROR', 'CRITICAL'].includes(rule.severity)) ||
    (rule.outcome !== undefined &&
      !['SUCCESS', 'FAILURE', 'INTENT', 'UNKNOWN'].includes(rule.outcome))
  )
    throw new Error('AUDIT_ALERT_RULE_INVALID');
}
export class AuditWorkspaceUseCases {
  constructor(
    private readonly gateway: IAuditWorkspaceGateway,
    private readonly atomic: AtomicDomainMutationCoordinator,
  ) {}
  list(kind: WorkspaceKind, limit: number, cursor?: string) {
    return this.gateway.list(kind, Math.min(100, Math.max(1, limit)), cursor);
  }
  get(id: string, kind: WorkspaceKind) {
    return this.gateway.get(id, kind);
  }
  occurrences(ruleId: string, limit: number, cursor?: string) {
    return this.gateway.occurrences(ruleId, Math.min(100, Math.max(1, limit)), cursor);
  }
  async createCase(
    input: { id: string; title: string; assigneeId?: string; references: string[] },
    context: AtomicMutationRequestContext,
  ) {
    if (input.id.length > 220) throw new Error('AUDIT_CASE_INVALID');
    const data: InvestigationCase = {
      title: input.title.trim(),
      ownerId: context.actorId,
      assigneeId: input.assigneeId ?? null,
      status: 'OPEN',
      references: [...new Set(input.references)],
      notes: [],
      history: [{ actorId: context.actorId, at: new Date().toISOString(), change: 'CREATED' }],
      legalHoldUntil: null,
    };
    this.validateCase(data);
    return this.write(
      { id: 'audit-case:' + input.id, kind: 'CASE', version: 1, data },
      0,
      context,
      async (tx) => this.gateway.assertReferences(data.references, tx),
    );
  }
  async updateCase(
    id: string,
    input: {
      expectedVersion: number;
      assigneeId?: string | null;
      status?: InvestigationCase['status'];
      references?: string[];
      legalHoldUntil?: string | null;
      note?: { id: string; text: string };
    },
    context: AtomicMutationRequestContext,
  ) {
    const row = await this.gateway.get(id, 'CASE');
    if (!row) throw new Error('AUDIT_WORKSPACE_NOT_FOUND');
    if (row.version !== input.expectedVersion) throw new Error('AUDIT_WORKSPACE_VERSION_CONFLICT');
    const current = row.data as InvestigationCase;
    const data = {
      ...current,
      references: input.references ? [...new Set(input.references)] : current.references,
      assigneeId: input.assigneeId === undefined ? current.assigneeId : input.assigneeId,
      status: input.status ?? current.status,
      legalHoldUntil:
        input.legalHoldUntil === undefined ? current.legalHoldUntil : input.legalHoldUntil,
      notes: [...current.notes],
      history: [...current.history],
    };
    if (input.note) {
      if (data.notes.some((note) => note.id === input.note!.id))
        throw new Error('AUDIT_CASE_NOTE_DUPLICATE');
      if (!input.note.text.trim() || input.note.text.length > 4000)
        throw new Error('AUDIT_CASE_NOTE_INVALID');
      data.notes.push({
        ...input.note,
        text: input.note.text.trim(),
        authorId: context.actorId,
        at: new Date().toISOString(),
      });
    }
    data.history.push({
      actorId: context.actorId,
      at: new Date().toISOString(),
      change: input.note ? 'NOTE_ADDED' : 'CASE_UPDATED',
    });
    this.validateCase(data);
    return this.write(
      { ...row, version: row.version + 1, data },
      input.expectedVersion,
      context,
      async (tx) => {
        await this.gateway.assertReferences(data.references, tx);
        if (input.assigneeId) await this.gateway.assertAssignee(input.assigneeId, tx);
      },
    );
  }
  async saveRule(
    id: string,
    rule: AuditAlertRule,
    expectedVersion: number,
    context: AtomicMutationRequestContext,
  ) {
    if (!id.startsWith('audit-alert:')) id = 'audit-alert:' + id;
    if (id.length > 240) throw new Error('AUDIT_ALERT_RULE_INVALID');
    validateAlertRule(rule);
    await this.gateway.assertRecipient(rule.recipientId, rule.templateId);
    return this.write(
      { id, kind: 'ALERT_RULE', version: expectedVersion + 1, data: rule },
      expectedVersion,
      context,
    );
  }
  async retention(
    durations: AuditRetentionDurations,
    expectedVersion: number,
    context: AtomicMutationRequestContext,
  ) {
    const classes = [
      'SECURITY_CRITICAL',
      'FINANCIAL',
      'IDENTITY_ACCESS',
      'AUTHENTICATION',
      'STANDARD_ADMIN',
    ];
    if (Object.keys(durations).some((key) => !classes.includes(key)))
      throw new Error('AUDIT_RETENTION_DURATION_INVALID');
    new AuditRetentionPolicyResolver(durations);
    return this.write(
      {
        id: 'audit-retention-policy',
        kind: 'RETENTION_POLICY',
        version: expectedVersion + 1,
        data: { durations },
      },
      expectedVersion,
      context,
    );
  }
  private validateCase(data: InvestigationCase) {
    if (
      !data.title ||
      data.title.length > 200 ||
      data.references.length > 100 ||
      data.references.some((ref) => !ref || ref.length > 240) ||
      data.notes.length > 200 ||
      data.history.length > 500 ||
      !['OPEN', 'INVESTIGATING', 'CLOSED'].includes(data.status) ||
      (data.legalHoldUntil !== null &&
        (!Number.isFinite(Date.parse(data.legalHoldUntil)) ||
          Date.parse(data.legalHoldUntil) <= Date.now()))
    )
      throw new Error('AUDIT_CASE_INVALID');
  }
  private write(
    row: WorkspaceRow,
    expectedVersion: number,
    context: AtomicMutationRequestContext,
    before?: (tx: AtomicPersistenceContext) => Promise<void>,
  ) {
    return this.atomic.execute(
      {
        domain: 'AUDIT_WORKSPACE',
        aggregateType: row.kind,
        aggregateId: row.id,
        action: 'AUDIT_' + row.kind + '_SAVED',
        context,
        auditMetadata: { version: row.version },
      },
      async (tx) => {
        if (before) await before(tx);
        await this.gateway.save(row, expectedVersion, tx);
        return row;
      },
    );
  }
}
