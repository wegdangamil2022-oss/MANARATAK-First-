export class AssetChecksum {
  constructor(
    public readonly algorithm: string,
    public readonly hash: string
  ) {
    if (!algorithm || algorithm.trim() === '') {
      throw new Error('AssetChecksum algorithm cannot be empty');
    }
    if (!hash || hash.trim() === '') {
      throw new Error('AssetChecksum hash cannot be empty');
    }
  }
}
