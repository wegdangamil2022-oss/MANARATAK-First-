import { IArtifactMetadata } from './IArtifactMetadata';

export interface IArtifactDefinition {
  /**
   * The immutable metadata describing this artifact definition.
   */
  readonly metadata: IArtifactMetadata;

  /**
   * The immutable declarative properties defining the artifact contract.
   */
  readonly properties: Readonly<Record<string, unknown>>;
}
