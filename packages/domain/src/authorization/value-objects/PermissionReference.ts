export class PermissionReference {
  constructor(public readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('PermissionReference cannot be empty');
    }
  }

  equals(other: PermissionReference): boolean {
    return this.matches(other);
  }

  matches(required: PermissionReference | string): boolean {
    const target = typeof required === 'string' ? required : required.value;
    if (this.value === target) return true;
    if (this.value === '*' || this.value === '*:*') return true;
    if (this.value.endsWith(':*')) {
      const prefix = this.value.slice(0, -1);
      return target.startsWith(prefix);
    }
    return false;
  }
}
