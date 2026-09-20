export class AssetId {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('AssetId cannot be empty');
    }
    if (/^https?:\/\//i.test(value.trim())) {
      throw new Error('AssetId must be a Phase 05 EAP handle, not a raw URL');
    }
  }
}
