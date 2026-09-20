/**
 * Phase 7.13 Generic Hierarchy & DAG Foundation.
 *
 * This module is deliberately domain-neutral. Consumers supply node identifiers
 * and directed parent -> child edges; no academic/business semantics live here.
 */
export interface IHierarchyNode<TNode = unknown> {
  readonly nodeId: string;
  readonly nodeType: string;
  readonly parentNodeIds: readonly string[];
  readonly childNodeIds: readonly string[];
  readonly depth: number;
  readonly value?: TNode;
}

export interface IClosureTableRepository<TNode = unknown> {
  maintainClosureAsync(ancestorId: string, descendantId: string, depth: number): Promise<void>;
  getAncestorsAsync(nodeId: string): Promise<readonly string[]>;
  getDescendantsAsync(nodeId: string): Promise<readonly string[]>;
  detectCycleAsync(ancestorId: string, descendantId: string): Promise<boolean>;
  getNodeAsync?(nodeId: string): Promise<TNode | null>;
}

export interface HierarchyEdgeReference {
  readonly parentNodeId: string;
  readonly childNodeId: string;
}

export interface ICycleDetectionValidator {
  /** Returns true only when the proposed parent -> child edge preserves acyclicity. */
  validateNoCycles(
    parentNodeId: string,
    childNodeId: string,
    existingEdges: readonly HierarchyEdgeReference[],
  ): boolean;

  /** Returns true when a directed path already exists from start to target. */
  hasPath(
    startNodeId: string,
    targetNodeId: string,
    existingEdges: readonly HierarchyEdgeReference[],
  ): boolean;
}

export interface IHierarchyPathResolver {
  resolveShortestPath(
    startNodeId: string,
    targetNodeId: string,
    existingEdges: readonly HierarchyEdgeReference[],
  ): readonly string[] | null;
}

/**
 * Shared, deterministic cycle/path validator. Mutation-level concurrency and
 * serialization are repository responsibilities; this service evaluates one
 * coherent graph snapshot and is reused by all hierarchy-owning domains.
 */
export class HierarchyValidationService implements ICycleDetectionValidator, IHierarchyPathResolver {
  public validateNoCycles(
    parentNodeId: string,
    childNodeId: string,
    existingEdges: readonly HierarchyEdgeReference[],
  ): boolean {
    if (!parentNodeId || !childNodeId || parentNodeId === childNodeId) return false;
    return !this.hasPath(childNodeId, parentNodeId, existingEdges);
  }

  public hasPath(
    startNodeId: string,
    targetNodeId: string,
    existingEdges: readonly HierarchyEdgeReference[],
  ): boolean {
    if (startNodeId === targetNodeId) return true;

    const adjacency = this.buildAdjacency(existingEdges);
    const visited = new Set<string>([startNodeId]);
    const queue: string[] = [startNodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const child of adjacency.get(current) ?? []) {
        if (child === targetNodeId) return true;
        if (!visited.has(child)) {
          visited.add(child);
          queue.push(child);
        }
      }
    }

    return false;
  }

  public resolveShortestPath(
    startNodeId: string,
    targetNodeId: string,
    existingEdges: readonly HierarchyEdgeReference[],
  ): readonly string[] | null {
    if (startNodeId === targetNodeId) return [startNodeId];

    const adjacency = this.buildAdjacency(existingEdges);
    const visited = new Set<string>([startNodeId]);
    const queue: Array<readonly string[]> = [[startNodeId]];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      for (const child of adjacency.get(current) ?? []) {
        if (visited.has(child)) continue;
        const nextPath = [...path, child];
        if (child === targetNodeId) return nextPath;
        visited.add(child);
        queue.push(nextPath);
      }
    }

    return null;
  }

  private buildAdjacency(
    existingEdges: readonly HierarchyEdgeReference[],
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const edge of existingEdges) {
      const children = adjacency.get(edge.parentNodeId) ?? [];
      children.push(edge.childNodeId);
      adjacency.set(edge.parentNodeId, children);
    }
    return adjacency;
  }
}
