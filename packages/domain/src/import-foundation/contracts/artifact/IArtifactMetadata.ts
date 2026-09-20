import { IArtifactIdentity } from './IArtifactIdentity';
import { IArtifactCompatibility } from './IArtifactCompatibility';

export interface IArtifactMetadata {
  /**
   * The identity of the artifact definition.
   */
  readonly identity: IArtifactIdentity;
  
  /**
   * Conceptual display information for the artifact.
   */
  readonly displayInformation: Readonly<Record<string, string>>;

  /**
   * The declared compatibility model of the artifact.
   */
  readonly compatibility: IArtifactCompatibility;
}
