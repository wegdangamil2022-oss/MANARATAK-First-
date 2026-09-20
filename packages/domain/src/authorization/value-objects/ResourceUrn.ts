export class ResourceUrn {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('ResourceUrn cannot be empty');
    }
  }

  equals(other: ResourceUrn): boolean {
    return this.value === other.value;
  }
}
