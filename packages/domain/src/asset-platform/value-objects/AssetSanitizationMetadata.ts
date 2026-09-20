export class AssetSanitizationMetadata {
  constructor(
    public readonly exifStripped: boolean,
    public readonly sanitizedAt?: Date | null,
    public readonly sanitizerNotes?: string | null
  ) {}
}
