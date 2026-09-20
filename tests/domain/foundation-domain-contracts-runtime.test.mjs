import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const work = mkdtempSync(join(tmpdir(), 'manaratak-foundation-'));
const outDir = join(work, 'build');
const tsconfig = join(work, 'tsconfig.json');
writeFileSync(tsconfig, JSON.stringify({
  compilerOptions: {
    target: 'ES2022', module: 'CommonJS', moduleResolution: 'Node', strict: true,
    skipLibCheck: true, types: [], outDir,
    rootDir: join(root, 'packages/domain/src/foundation-contracts').replaceAll('\\', '/'),
  },
  include: [join(root, 'packages/domain/src/foundation-contracts/*.ts').replaceAll('\\', '/')],
}, null, 2));
const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', tsconfig, '--pretty', 'false'], { stdio: 'pipe' });
const integration = require(join(outDir, 'integration.js'));
const localization = require(join(outDir, 'localization.js'));
const workflow = require(join(outDir, 'workflow.js'));
const search = require(join(outDir, 'search.js'));
const shared = require(join(outDir, 'shared-components.js'));
const notification = require(join(outDir, 'notification.js'));

test('typed integration lifecycle rejects reactivation after deprecation', () => {
  const item = new integration.Integration(
    new integration.IntegrationId(), new integration.IntegrationReference('integration-a'),
    new integration.IntegrationOwnerReference('platform'),
    new integration.IntegrationDefinition('purpose', 'scope'),
    new integration.IntegrationCapabilityDefinition(['read']),
    new integration.IntegrationClassification(integration.IntegrationScopeType.INTERNAL, integration.IntegrationCategory.API),
    new integration.IntegrationMetadata({ owner: 'platform' }), integration.IntegrationVersion.initial(),
    new integration.IntegrationIntent('goal', 'reason'),
  );
  integration.IntegrationFoundationLifecycleService.transitionTo(item, integration.IntegrationLifecycleState.ACTIVATED);
  integration.IntegrationFoundationLifecycleService.transitionTo(item, integration.IntegrationLifecycleState.DEPRECATED);
  assert.throws(() => integration.IntegrationFoundationLifecycleService.transitionTo(item, integration.IntegrationLifecycleState.ACTIVATED));
});

test('localization contract keeps translations typed and versioned', () => {
  const translations = new localization.TranslationDefinition({ title: 'مرحبا' });
  assert.equal(translations.getTranslations().get('title'), 'مرحبا');
  assert.equal(localization.LocalizationVersion.initial().nextPatch().getValue(), '1.0.1');
});

test('workflow transition validator enforces declared graph and terminal completion', () => {
  const draft = new workflow.WorkflowStateDefinition('DRAFT', true, false);
  const done = new workflow.WorkflowStateDefinition('DONE', false, true);
  const definition = new workflow.WorkflowDefinition('approval', [draft, done], [new workflow.WorkflowTransitionDefinition('DRAFT', 'DONE', 'approve')]);
  const item = workflow.Workflow.create(new workflow.WorkflowId(), new workflow.WorkflowReference('wf-1'), new workflow.WorkflowOwnerReference('platform'), definition, new workflow.WorkflowVersion(1), new workflow.WorkflowMetadata({}), new workflow.WorkflowExecutionIntent('execute'));
  item.activate();
  assert.equal(workflow.WorkflowTransitionValidator.isValidTransition(definition, undefined, draft), true);
  item.changeState(draft);
  assert.equal(workflow.WorkflowTransitionValidator.isValidTransition(definition, draft, done), true);
  item.changeState(done);
  item.complete();
  assert.equal(item.getLifecycleState(), workflow.WorkflowLifecycleState.COMPLETED);
});

test('search and notification contracts fail closed on invalid primitives', () => {
  assert.throws(() => search.SearchPagination.create(0, 20));
  const result = new search.SearchResult(3, 12.5, []);
  assert.equal(result.getTotalCount(), 3);
  const intent = notification.NotificationIntent.create(
    notification.NotificationId.create('n-1'), notification.NotificationReference.create('ref-1'),
    notification.TemplateId.create('t-1'), notification.NotificationRecipientReference.create('u-1'), [],
  );
  intent.cancel();
  assert.equal(intent.getState(), notification.NotificationIntentState.CANCELLED);
});

test('component compatibility rejects removed required property', () => {
  const before = new shared.SharedComponentDefinition([{ name: 'title', type: 'string', required: true }], []);
  const after = new shared.SharedComponentDefinition([], []);
  assert.equal(shared.ComponentCompatibilityService.isBackwardCompatible(before, after), false);
});

test.after(() => rmSync(work, { recursive: true, force: true }));
