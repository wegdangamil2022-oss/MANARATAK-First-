import { IArtifactDefinition } from './IArtifactDefinition';
import { IArtifactContext } from './IArtifactContext';
import { IResolvedArtifact } from './IResolvedArtifact';

export interface IArtifactResolutionBoundary {
  /**
   * Resolves an artifact definition across the architectural boundary, yielding a resolved artifact.
   *
   * @param definition The declarative, immutable artifact definition.
   * @param context The immutable execution context for resolution.
   * @returns A promise resolving to the immutable resolved artifact.
   */
  resolve(
    definition: IArtifactDefinition,
    context: IArtifactContext
  ): Promise<IResolvedArtifact>;
}
