import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ImportSourceDefinition, 
  SourceConnectorCategory, 
  SourceAccessClassification, 
  SourceStatus 
} from '@manaratak/domain';
import { InMemorySourceRegistryGateway } from '../../src/import-foundation/InMemorySourceRegistryGateway';

describe('InMemorySourceRegistryGateway', () => {
  let gateway: InMemorySourceRegistryGateway;

  const validProps = {
    sourceId: 'source-1',
    displayName: 'Test Source',
    baseUrl: 'https://example.com',
    category: SourceConnectorCategory.OFFICIAL_API,
    accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
    status: SourceStatus.ACTIVE,
    connectorId: 'conn-1',
    connectorVersion: '1.0.0'
  };

  beforeEach(() => {
    gateway = new InMemorySourceRegistryGateway();
  });

  it('registers and retrieves a source', async () => {
    const source = new ImportSourceDefinition(validProps);
    await gateway.registerSource(source);
    
    const retrieved = await gateway.getSource('source-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.sourceId).toBe('source-1');
  });

  it('rejects duplicate sourceId on register', async () => {
    const source = new ImportSourceDefinition(validProps);
    await gateway.registerSource(source);
    
    await expect(gateway.registerSource(source)).rejects.toThrow(/already registered/);
  });

  it('returns null for unknown source', async () => {
    const retrieved = await gateway.getSource('unknown');
    expect(retrieved).toBeNull();
  });

  it('lists sources with no filters', async () => {
    await gateway.registerSource(new ImportSourceDefinition(validProps));
    await gateway.registerSource(new ImportSourceDefinition({ ...validProps, sourceId: 'source-2' }));
    
    const list = await gateway.listSources();
    expect(list.length).toBe(2);
  });

  it('filters sources by status', async () => {
    await gateway.registerSource(new ImportSourceDefinition(validProps));
    await gateway.registerSource(new ImportSourceDefinition({ 
      ...validProps, 
      sourceId: 'source-2', 
      status: SourceStatus.DISABLED 
    }));
    
    const list = await gateway.listSources({ status: SourceStatus.DISABLED });
    expect(list.length).toBe(1);
    expect(list[0].sourceId).toBe('source-2');
  });

  it('filters sources by category', async () => {
    await gateway.registerSource(new ImportSourceDefinition(validProps));
    await gateway.registerSource(new ImportSourceDefinition({ 
      ...validProps, 
      sourceId: 'source-2', 
      category: SourceConnectorCategory.DOCUMENT 
    }));
    
    const list = await gateway.listSources({ category: SourceConnectorCategory.DOCUMENT });
    expect(list.length).toBe(1);
    expect(list[0].sourceId).toBe('source-2');
  });

  it('filters sources by access classification', async () => {
    await gateway.registerSource(new ImportSourceDefinition(validProps));
    await gateway.registerSource(new ImportSourceDefinition({ 
      ...validProps, 
      sourceId: 'source-2', 
      accessClassification: SourceAccessClassification.AUTHORIZED_ACCOUNT 
    }));
    
    const list = await gateway.listSources({ accessClassification: SourceAccessClassification.AUTHORIZED_ACCOUNT });
    expect(list.length).toBe(1);
    expect(list[0].sourceId).toBe('source-2');
  });

  it('updates source status successfully', async () => {
    await gateway.registerSource(new ImportSourceDefinition(validProps));
    
    const result = await gateway.updateSourceStatus('source-1', SourceStatus.DISABLED);
    expect(result).toBe(true);
    
    const updated = await gateway.getSource('source-1');
    expect(updated?.status).toBe(SourceStatus.DISABLED);
    // Preserves other fields
    expect(updated?.displayName).toBe('Test Source');
  });

  it('returns false when updating unknown source', async () => {
    const result = await gateway.updateSourceStatus('unknown', SourceStatus.DISABLED);
    expect(result).toBe(false);
  });

  it('rejects updating a BLOCKED access source to ACTIVE status', async () => {
    await gateway.registerSource(new ImportSourceDefinition({
      ...validProps,
      accessClassification: SourceAccessClassification.BLOCKED,
      status: SourceStatus.BLOCKED
    }));
    
    await expect(gateway.updateSourceStatus('source-1', SourceStatus.ACTIVE)).rejects.toThrow(/BLOCKED source cannot have an ACTIVE status/);
  });

  it('returned list cannot mutate internal registry state', async () => {
    await gateway.registerSource(new ImportSourceDefinition(validProps));
    
    const list = await gateway.listSources();
    expect(list.length).toBe(1);
    
    // Simulate someone mutating the object directly
    (list[0] as any).status = SourceStatus.DISABLED;
    
    // Check if the registry was mutated
    const inRegistry = await gateway.getSource('source-1');
    expect(inRegistry?.status).toBe(SourceStatus.ACTIVE);
  });
  
  it('returned object from getSource cannot mutate internal registry state', async () => {
    await gateway.registerSource(new ImportSourceDefinition(validProps));
    
    const source = await gateway.getSource('source-1');
    // Simulate someone mutating the object directly
    (source as any).status = SourceStatus.DISABLED;
    
    // Check if the registry was mutated
    const inRegistry = await gateway.getSource('source-1');
    expect(inRegistry?.status).toBe(SourceStatus.ACTIVE);
  });
});
