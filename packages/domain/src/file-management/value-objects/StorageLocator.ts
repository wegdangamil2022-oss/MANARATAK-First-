export class StorageLocator {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('StorageLocator cannot be empty');
    }
  }
}
