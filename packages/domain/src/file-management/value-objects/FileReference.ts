export class FileReference {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('FileReference cannot be empty');
    }
  }
}
