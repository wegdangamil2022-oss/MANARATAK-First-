import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { type ISettingsGovernanceGateway, type SettingsProposal } from '@manaratak/application';
import {
  type AtomicPersistenceContext,
  ScopeIdentifier,
  NamespacedKey,
  SettingAssignment,
  SettingVersion,
  ValueType,
  NumberValue,
  StringValue,
  BooleanValue,
  JsonValue,
  validateSettingRuleValue,
} from '@manaratak/domain';
import { PrismaSettingsDependencyGuard } from './PrismaSettingsDependencyGuard';
import { PrismaSettingAssignmentRepository } from './PrismaSettingAssignmentRepository';
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
          .join(',')}}`
      : JSON.stringify(value);
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
type PreviewInput = Omit<SettingsProposal, 'id' | 'approverId' | 'previewDigest' | 'reason'>;
export class PrismaSettingsGovernanceGateway implements ISettingsGovernanceGateway {
  constructor(
    private readonly db: PrismaClient | Prisma.TransactionClient,
    private readonly bound = false,
  ) {}
  withTransaction(tx: AtomicPersistenceContext) {
    const client = (
      tx as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!tx.boundaryId || !client) throw new Error('SETTINGS_GOVERNANCE_UNAVAILABLE');
    return new PrismaSettingsGovernanceGateway(client, true);
  }
  private async lock() {
    if (!this.bound) throw new Error('SETTINGS_GOVERNANCE_UNAVAILABLE');
    await new PrismaSettingsDependencyGuard(this.db).lock();
  }
  policy() {
    return new PrismaSettingsDependencyGuard(this.db).policy();
  }
  private async prepare(input: PreviewInput) {
    const guard = new PrismaSettingsDependencyGuard(this.db);
    const { revision, policy } = await guard.policy();
    if (revision !== input.expectedPolicyRevision)
      throw new Error('SETTINGS_POLICY_VERSION_CONFLICT');
    const rows: Array<{
      key: string;
      level: string;
      scopeId?: string;
      oldValue: unknown;
      newValue: unknown;
      expectedCurrentVersionId: string | null;
      definitionRevision: string;
      consumerDomain: string | null;
      constraints: unknown;
    }> = [];
    for (const change of input.changes ?? []) {
      const definition = await this.db.settingDefinitionRecord.findUnique({
        where: { key: change.key },
      });
      if (!definition || definition.isDeprecated || definition.isSecret)
        throw new Error('SETTINGS_DEFINITION_NOT_WRITABLE');
      const scope = new ScopeIdentifier(change.level, change.scopeId);
      const assignment = await this.db.settingAssignmentRecord.findUnique({
        where: {
          key_scopeLevel_scopeId: {
            key: change.key,
            scopeLevel: scope.getLevel(),
            scopeId: scope.getScopeId() ?? 'GLOBAL',
          },
        },
        include: { currentVersion: true },
      });
      if ((assignment?.currentVersionId ?? null) !== change.expectedCurrentVersionId)
        throw new Error('SETTINGS_VERSION_CONFLICT');
      this.value(definition.valueType, change.value);
      validateSettingRuleValue(
        definition.valueType as ValueType,
        change.value,
        definition.validationRules == null ? undefined : (definition.validationRules as any),
      );
      rows.push({
        key: change.key,
        level: change.level,
        scopeId: change.scopeId,
        oldValue:
          assignment?.currentVersion.operation === 'CLEAR_OVERRIDE'
            ? null
            : (assignment?.currentVersion.value ?? null),
        newValue: change.value,
        expectedCurrentVersionId: change.expectedCurrentVersionId,
        definitionRevision: definition.updatedAt.toISOString(),
        consumerDomain: definition.consumerDomain,
        constraints: definition.validationRules,
      });
    }
    await guard.assert(input.changes ?? [], input.kind === 'DEPENDENCIES' ? input.policy : policy);
    const data = {
      kind: input.kind,
      policyRevision: revision,
      rows,
      ...(input.kind === 'DEPENDENCIES' ? { policy: input.policy } : {}),
    };
    return {
      ...data,
      previewDigest: digest(data),
      atomic: true,
      liveConsumerEffect: 'NOT_VERIFIED',
    };
  }
  async preview(input: PreviewInput) {
    if (this.bound) return this.prepare(input);
    return (this.db as PrismaClient).$transaction(
      (tx) => new PrismaSettingsGovernanceGateway(tx, true).prepare(input),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async propose(input: SettingsProposal, actorId: string) {
    await this.lock();
    const preview = await this.prepare(input);
    if (preview.previewDigest !== input.previewDigest)
      throw new Error('SETTINGS_PREVIEW_VERSION_CONFLICT');
    const id = 'change-set:' + input.id;
    const prior = await this.db.settingsGovernanceRecord.findUnique({ where: { id } });
    if (prior) {
      if (prior.createdBy !== actorId || digest(prior.payload) !== digest(input))
        throw new Error('SETTINGS_CHANGE_SET_CONFLICT');
      return { ...this.view(prior, actorId), replay: true };
    }
    return this.view(
      await this.db.settingsGovernanceRecord.create({
        data: {
          id,
          kind: 'PROPOSAL',
          createdBy: actorId,
          approverId: input.approverId,
          expiresAt: new Date(Date.now() + 30 * 60_000),
          payload: input as unknown as Prisma.InputJsonValue,
        },
      }),
      actorId,
    );
  }
  private view(
    row: {
      id: string;
      payload: Prisma.JsonValue;
      createdBy: string;
      approverId: string | null;
      approvedAt: Date | null;
      consumedAt: Date | null;
      expiresAt: Date | null;
    },
    actorId?: string,
  ) {
    return {
      canApprove: actorId === row.approverId,
      canCommit: actorId === row.createdBy,
      id: row.id.slice('change-set:'.length),
      request: row.payload,
      requestedBy: row.createdBy,
      approverId: row.approverId,
      approvedAt: row.approvedAt,
      consumedAt: row.consumedAt,
      expiresAt: row.expiresAt,
    };
  }
  async list(actorId: string, cursor?: string) {
    const rows = await this.db.settingsGovernanceRecord.findMany({
      where: {
        kind: 'PROPOSAL',
        OR: [{ createdBy: actorId }, { approverId: actorId }],
        ...(cursor ? { id: { gt: 'change-set:' + cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: 21,
    });
    return {
      items: rows.slice(0, 20).map((row) => this.view(row, actorId)),
      nextCursor: rows.length > 20 ? rows[19].id.slice(11) : null,
    };
  }
  async get(id: string, actorId: string) {
    const row = await this.db.settingsGovernanceRecord.findUnique({
      where: { id: 'change-set:' + id },
    });
    if (
      !row ||
      row.kind !== 'PROPOSAL' ||
      (row.createdBy !== actorId && row.approverId !== actorId)
    )
      throw new Error('SETTINGS_CHANGE_SET_NOT_FOUND');
    return this.view(row, actorId);
  }
  private async proposal(id: string) {
    const row = await this.db.settingsGovernanceRecord.findUnique({
      where: { id: 'change-set:' + id },
    });
    if (!row || row.kind !== 'PROPOSAL') throw new Error('SETTINGS_CHANGE_SET_NOT_FOUND');
    if (!row.expiresAt || row.expiresAt <= new Date() || row.consumedAt)
      throw new Error('SETTINGS_CHANGE_SET_CONFLICT');
    return row;
  }
  async approve(id: string, actorId: string) {
    await this.lock();
    const row = await this.proposal(id);
    if (row.createdBy === actorId || row.approverId !== actorId)
      throw new Error('SETTINGS_INDEPENDENT_APPROVAL_REQUIRED');
    if (!row.approvedAt)
      await this.db.settingsGovernanceRecord.update({
        where: { id: row.id },
        data: { approvedAt: new Date() },
      });
    return { id, approved: true, replay: Boolean(row.approvedAt) };
  }
  private value(type: string, value: unknown) {
    switch (type) {
      case 'Number':
        return new NumberValue(value as number);
      case 'String':
        return new StringValue(value as string);
      case 'Boolean':
        return new BooleanValue(value as boolean);
      case 'Json':
        return new JsonValue(value as Record<string, unknown>);
    }
    throw new Error('SETTINGS_GOVERNANCE_INVALID');
  }
  async commit(id: string, actorId: string, correlationId: string) {
    await this.lock();
    const row = await this.db.settingsGovernanceRecord.findUnique({
      where: { id: 'change-set:' + id },
    });
    if (!row || row.kind !== 'PROPOSAL') throw new Error('SETTINGS_CHANGE_SET_NOT_FOUND');
    if (row.createdBy !== actorId || !row.approvedAt || row.approverId === actorId)
      throw new Error('SETTINGS_INDEPENDENT_APPROVAL_REQUIRED');
    if (row.consumedAt) return { id, committed: true, atomic: true, replay: true };
    if (!row.expiresAt || row.expiresAt <= new Date())
      throw new Error('SETTINGS_CHANGE_SET_CONFLICT');
    const input = row.payload as unknown as SettingsProposal;
    const preview = await this.prepare(input);
    if (preview.previewDigest !== input.previewDigest)
      throw new Error('SETTINGS_PREVIEW_VERSION_CONFLICT');
    if (input.kind === 'DEPENDENCIES') {
      await this.db.settingsGovernanceRecord.upsert({
        where: { id: 'dependencies' },
        create: {
          id: 'dependencies',
          kind: 'DEPENDENCIES',
          createdBy: actorId,
          revision: 1,
          payload: input.policy as unknown as Prisma.InputJsonValue,
        },
        update: {
          revision: { increment: 1 },
          payload: input.policy as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      const repo = new PrismaSettingAssignmentRepository(
        this.db as unknown as PrismaClient,
        true,
        input.changes,
      );
      for (const change of [...(input.changes ?? [])].sort((a, b) =>
        canonical([a.key, a.level, a.scopeId]).localeCompare(
          canonical([b.key, b.level, b.scopeId]),
        ),
      )) {
        const scope = new ScopeIdentifier(change.level, change.scopeId);
        const key = new NamespacedKey(change.key);
        const definition = await this.db.settingDefinitionRecord.findUniqueOrThrow({
          where: { key: change.key },
        });
        let assignment = await repo.findByScopeAndKey(scope, key);
        const versionId = randomUUID();
        const value = this.value(definition.valueType, change.value);
        if (assignment) assignment.updateValue(versionId, value, actorId, input.reason);
        else
          assignment = new SettingAssignment(
            {
              id: randomUUID(),
              key,
              scope,
              versions: [
                new SettingVersion(
                  versionId,
                  value,
                  new Date(),
                  actorId,
                  undefined,
                  'SET',
                  input.reason,
                ),
              ],
            },
            true,
          );
        await repo.save(assignment, { correlationId });
      }
    }
    await this.db.settingsGovernanceRecord.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return { id, committed: true, atomic: true };
  }
}
