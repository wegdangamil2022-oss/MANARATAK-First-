export class FileId {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('FileId cannot be empty');
    }
  }
}
