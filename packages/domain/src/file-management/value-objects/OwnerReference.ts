export class OwnerReference {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('OwnerReference cannot be empty');
    }
  }
}
