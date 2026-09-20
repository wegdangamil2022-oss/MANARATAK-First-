export class Checksum {
  constructor(
    public readonly algorithm: string,
    public readonly hash: string
  ) {
    if (!algorithm || !hash) {
      throw new Error('Algorithm and hash are required for Checksum');
    }
  }
}
