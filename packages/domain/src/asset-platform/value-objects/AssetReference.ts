export class AssetReference {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('AssetReference cannot be empty');
    }
    if (/^https?:\/\//i.test(value.trim())) {
      throw new Error('AssetReference must be a Phase 05 EAP handle, not a raw URL');
    }
  }
}
