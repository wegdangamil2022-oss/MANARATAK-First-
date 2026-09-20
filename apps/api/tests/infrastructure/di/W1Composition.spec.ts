import { describe, expect, it } from 'vitest';
import { container, registerDependencies } from '../../../src/infrastructure/di/container';
import {
  JwtTokenProvider,
  LocalImportRawSnapshotStore,
  NodeSafeSourceHttpTransport,
  SourceAcquisitionLimiter,
} from '@manaratak/infrastructure';
import { ConfigurationResolutionService } from '@manaratak/domain';

describe('W1 composition boundaries', () => {
  it('wires settings resolution repositories explicitly under PROXY injection', () => {
    registerDependencies({ NODE_ENV: 'test' });
    const service = container.resolve<ConfigurationResolutionService>('configurationResolutionService') as any;
    expect(service).toBeInstanceOf(ConfigurationResolutionService);
    expect(service.definitionRepo).toBeDefined();
    expect(service.assignmentRepo).toBeDefined();
  });

  it('constructs Phase 6 positional adapters through explicit factories instead of cradle injection', () => {
    registerDependencies({
      NODE_ENV: 'test',
      IMPORT_RAW_SNAPSHOT_DIR: 'var/test-import-raw',
    });

    const transport = container.resolve<NodeSafeSourceHttpTransport>('safeSourceHttpTransport') as any;
    const store = container.resolve<LocalImportRawSnapshotStore>('importRawSnapshotStore') as any;
    const limiter = container.resolve<SourceAcquisitionLimiter>('sourceAcquisitionLimiter') as any;

    expect(transport).toBeInstanceOf(NodeSafeSourceHttpTransport);
    expect(transport.policy).toBeDefined();
    expect(transport.executor).toBeDefined();
    expect(store).toBeInstanceOf(LocalImportRawSnapshotStore);
    expect(typeof store.rootDirectory).toBe('string');
    expect(limiter).toBeInstanceOf(SourceAcquisitionLimiter);
    expect(typeof limiter.now).toBe('function');
    expect(typeof limiter.sleep).toBe('function');
  });

  it('resolves the concrete JWT provider from Infrastructure, not Application', () => {
    registerDependencies({ NODE_ENV: 'test' });
    expect(container.resolve('tokenProvider')).toBeInstanceOf(JwtTokenProvider);
  });
});
