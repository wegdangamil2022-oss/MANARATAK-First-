import { taxonomyRevisionHash } from './TaxonomyRevisionHash';
import { AcademicTaxonomyValidationService, normalizeAcademicTaxonomyAlias, TaxonomyGovernanceSnapshot, TaxonomyDiagnosticIssue, TaxonomyDiagnosticsReport } from '@manaratak/domain';
export const TAXONOMY_DIAGNOSTIC_CODES = ['CYCLE', 'MULTIPLE_PRIMARY_PARENTS', 'ORPHAN', 'EMPTY_ROOT', 'ISOLATED_LEAF', 'EXCESSIVE_DEPTH',
  'UNREACHABLE_NATIONAL_MAPPING', 'INVALID_MAPPING', 'HISTORICAL_MAPPING', 'ALIAS_CONFLICT', 'DUPLICATE_ALIAS', 'ALIAS_NORMALIZATION_DRIFT', 'INVALID_EDGE'] as const;
export class TaxonomyDiagnosticsService {
  report(snapshot: TaxonomyGovernanceSnapshot, query: { page?: number; code?: string } = {}): TaxonomyDiagnosticsReport {
    const page = query.page ?? 1;
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000 || query.code && !TAXONOMY_DIAGNOSTIC_CODES.includes(query.code as any)) throw new Error('TAXONOMY_DIAGNOSTICS_QUERY_INVALID');
    const scoped = new Map(snapshot.nodes.map(node => [node.nodeId, node]));
    const all = new Map([...snapshot.contextNodes, ...snapshot.nodes].map(node => [node.nodeId, node]));
    const incoming = new Map<string, typeof snapshot.edges>(); const outgoing = new Map<string, typeof snapshot.edges>();
    for (const node of snapshot.nodes) { incoming.set(node.nodeId, []); outgoing.set(node.nodeId, []); }
    const issues: TaxonomyDiagnosticIssue[] = [];
    const add = (code: TaxonomyDiagnosticIssue['code'], severity: TaxonomyDiagnosticIssue['severity'], nodeIds: string[], message: string, referenceIds?: string[]) => issues.push({ code, severity, nodeIds: nodeIds.slice(0, 32), message: nodeIds.length > 32 ? `${message} (${nodeIds.length} nodes; first 32 IDs shown.)` : message, referenceIds: referenceIds?.slice(0, 32) });
    let boundaryEdges = 0;
    for (const edge of snapshot.edges) {
      if (!scoped.has(edge.parentNodeId) || !scoped.has(edge.childNodeId)) boundaryEdges++;
      incoming.get(edge.childNodeId)?.push(edge); outgoing.get(edge.parentNodeId)?.push(edge);
      if (!all.has(edge.parentNodeId) || !all.has(edge.childNodeId)) add('INVALID_EDGE', 'ERROR', [edge.parentNodeId, edge.childNodeId], 'An edge endpoint is missing.', [edge.edgeId]);
    }
    const roots: string[] = [];
    for (const node of snapshot.nodes) {
      const parents = incoming.get(node.nodeId)!; const children = outgoing.get(node.nodeId)!;
      if (parents.filter(edge => edge.isPrimary).length > 1) add('MULTIPLE_PRIMARY_PARENTS', 'ERROR', [node.nodeId, ...parents.filter(edge => edge.isPrimary).map(edge => edge.parentNodeId)], 'The node has more than one primary parent.');
      if (!parents.length) {
        if (node.nodeType === 'ACADEMIC_FIELD' || node.metadata?.approvedRoot === true) { roots.push(node.nodeId); if (!children.length) add('EMPTY_ROOT', 'WARNING', [node.nodeId], 'Approved root has no children.'); }
        else add('ORPHAN', 'WARNING', [node.nodeId], 'Non-root node has no incoming hierarchy edge.');
      }
      if (!parents.length && !children.length && node.nodeType !== 'ACADEMIC_FIELD' && node.metadata?.approvedRoot !== true) add('ISOLATED_LEAF', 'WARNING', [node.nodeId], 'Non-root node is isolated.');
    }
    // Iterative DFS avoids call-stack overflow and records actual back-edge cycle IDs.
    const colors = new Map<string, number>();
    for (const start of scoped.keys()) {
      if (colors.get(start)) continue;
      const stack: Array<{ id: string; next: number }> = [{ id: start, next: 0 }]; colors.set(start, 1);
      while (stack.length) {
        const frame = stack[stack.length - 1]; const edges = outgoing.get(frame.id) ?? [];
        if (frame.next >= edges.length) { colors.set(frame.id, 2); stack.pop(); continue; }
        const edge = edges[frame.next++]; if (!scoped.has(edge.childNodeId)) continue;
        if (colors.get(edge.childNodeId) === 1) {
          const index = stack.findIndex(item => item.id === edge.childNodeId);
          add('CYCLE', 'ERROR', stack.slice(index).map(item => item.id).concat(edge.childNodeId), 'Directed cycle found.', [edge.edgeId]);
        } else if (!colors.get(edge.childNodeId)) { colors.set(edge.childNodeId, 1); stack.push({ id: edge.childNodeId, next: 0 }); }
      }
    }
    const reached = new Set<string>(roots); const queue = [...roots];
    for (let index = 0; index < queue.length; index++) for (const edge of outgoing.get(queue[index]) ?? []) if (scoped.has(edge.childNodeId) && !reached.has(edge.childNodeId)) { reached.add(edge.childNodeId); queue.push(edge.childNodeId); }
    const indegree = new Map(snapshot.nodes.map(node => [node.nodeId, (incoming.get(node.nodeId) ?? []).filter(edge => scoped.has(edge.parentNodeId)).length]));
    const topo = [...indegree].filter(([, count]) => count === 0).map(([id]) => id); const depths = new Map(topo.map(id => [id, 0]));
    for (let index = 0; index < topo.length; index++) for (const edge of outgoing.get(topo[index]) ?? []) {
      if (!scoped.has(edge.childNodeId)) continue;
      depths.set(edge.childNodeId, Math.max(depths.get(edge.childNodeId) ?? 0, (depths.get(edge.parentNodeId) ?? 0) + 1));
      indegree.set(edge.childNodeId, indegree.get(edge.childNodeId)! - 1); if (indegree.get(edge.childNodeId) === 0) topo.push(edge.childNodeId);
    }
    for (const [id, depth] of depths) if (depth > 32) add('EXCESSIVE_DEPTH', 'WARNING', [id], `Hierarchy depth ${depth} exceeds the diagnostic limit of 32.`);
    const validation = new AcademicTaxonomyValidationService();
    for (const mapping of snapshot.mappings) {
      const invalid = validation.validateMapping({ mapping, existingMappings: [], sourceNode: all.get(mapping.sourceNodeId), targetNode: all.get(mapping.targetNodeId) }).filter(issue => issue.severity === 'ERROR');
      if (invalid.length) {
        const historical = invalid.every(issue => ['SOURCE_NODE_NOT_ACTIVE', 'TARGET_NODE_NOT_ACTIVE'].includes(issue.code));
        add(historical ? 'HISTORICAL_MAPPING' : 'INVALID_MAPPING', historical ? 'INFO' : 'ERROR', [mapping.sourceNodeId, mapping.targetNodeId], invalid.map(issue => issue.code).join(', '), [mapping.mappingId]);
      }
      const source = scoped.get(mapping.sourceNodeId);
      if (source?.standardType === 'CUSTOM_NATIONAL' && !reached.has(source.nodeId) && boundaryEdges === 0) add('UNREACHABLE_NATIONAL_MAPPING', 'WARNING', [source.nodeId, mapping.targetNodeId], 'National crosswalk source has no path from an approved root.', [mapping.mappingId]);
    }
    const aliasGroups = new Map<string, typeof snapshot.aliases>();
    for (const alias of snapshot.aliases) {
      const normalized = normalizeAcademicTaxonomyAlias(alias.alias);
      if (alias.normalizedAlias !== normalized) add('ALIAS_NORMALIZATION_DRIFT', 'WARNING', [alias.nodeId], 'Stored alias differs from the shared NFC identity; review before any data rewrite.', [alias.aliasId]);
      const group = aliasGroups.get(normalized) ?? []; group.push(alias); aliasGroups.set(normalized, group);
    }
    for (const group of aliasGroups.values()) {
      if (new Set(group.map(alias => alias.nodeId)).size > 1) add('ALIAS_CONFLICT', 'ERROR', [...new Set(group.map(alias => alias.nodeId))], 'One normalized alias identifies different canonical nodes.', group.map(alias => alias.aliasId));
      const identities = new Set<string>();
      for (const alias of group) { const identity = `${alias.nodeId}\u0000${alias.locale?.trim().toLowerCase() ?? ''}`; if (identities.has(identity)) add('DUPLICATE_ALIAS', 'ERROR', [alias.nodeId], 'Duplicate normalized alias on the same node and locale.', [alias.aliasId]); identities.add(identity); }
    }
    issues.sort((left, right) => `${left.code}:${left.nodeIds.join(':')}`.localeCompare(`${right.code}:${right.nodeIds.join(':')}`));
    const counts: Record<string, number> = {}; for (const issue of issues) counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    const filtered = query.code ? issues.filter(issue => issue.code === query.code) : issues;
    const version = taxonomyRevisionHash({ nodes: snapshot.nodes, contextNodes: snapshot.contextNodes, edges: snapshot.edges, aliases: snapshot.aliases, mappings: snapshot.mappings });
    return { data: filtered.slice((page - 1) * 25, page * 25), total: filtered.length, counts, page, pageSize: 25, version, asOf: snapshot.asOf,
      nodeCount: snapshot.nodes.length, scope: snapshot.standardType ?? 'ALL_STANDARDS', boundaryEdges };
  }
}
