import { AssetVersion } from './AssetVersion';

export class AssetVersionChain {
  private readonly versions: AssetVersion[];

  constructor(initialVersions: AssetVersion[] = []) {
    this.versions = [...initialVersions].sort((a, b) => a.versionNumber - b.versionNumber);
  }

  get allVersions(): ReadonlyArray<AssetVersion> {
    return [...this.versions];
  }

  getLatestVersion(): AssetVersion | null {
    if (this.versions.length === 0) return null;
    return this.versions[this.versions.length - 1];
  }

  addVersion(version: AssetVersion): AssetVersionChain {
    const nextVersionNumber = (this.getLatestVersion()?.versionNumber ?? 0) + 1;
    if (version.versionNumber !== nextVersionNumber) {
      throw new Error(`Invalid version number ${version.versionNumber}, expected ${nextVersionNumber}`);
    }
    return new AssetVersionChain([...this.versions, version]);
  }
}
