export class NamespacedKey {
  private readonly value: string;

  constructor(key: string) {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('NamespacedKey cannot be empty.');
    }
    const trimmed = key.trim();
    if (!/^[a-zA-Z0-9_\-.]+$/.test(trimmed)) {
      throw new Error(`Invalid NamespacedKey format: '${key}'. Key must contain alphanumeric characters, dots, underscores, or hyphens.`);
    }
    this.value = trimmed;
  }

  public getValue(): string {
    return this.value;
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: NamespacedKey): boolean {
    if (!other || !(other instanceof NamespacedKey)) return false;
    return this.value === other.getValue();
  }
}
