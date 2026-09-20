export class Action {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('Action cannot be empty');
    }
  }

  equals(other: Action): boolean {
    return this.value === other.value;
  }
}
