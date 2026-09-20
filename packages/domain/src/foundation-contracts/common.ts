export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };
export type UnknownRecord = Readonly<Record<string, unknown>>;

export interface DomainSpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

export abstract class StringValue {
  protected constructor(private readonly value: string, label: string) {
    const normalized = value?.trim();
    if (!normalized) throw new Error(`${label} is required`);
    this.value = normalized;
  }

  public getValue(): string {
    return this.value;
  }

  public toString(): string {
    return this.value;
  }
}

export abstract class GeneratedId extends StringValue {
  protected constructor(value: string | undefined, prefix: string) {
    super(value ?? `${prefix}-${globalThis.crypto.randomUUID()}`, `${prefix} id`);
  }
}

export class StringMetadata {
  private readonly data: Map<string, string>;

  constructor(input: Readonly<Record<string, string>> | ReadonlyMap<string, string> = {}) {
    this.data = input instanceof Map ? new Map(input) : new Map(Object.entries(input));
  }

  public getData(): ReadonlyMap<string, string> {
    return this.data;
  }
}

export class SemanticVersion {
  protected constructor(private readonly major: number, private readonly minor: number, private readonly patch: number) {
    if (![major, minor, patch].every(value => Number.isInteger(value) && value >= 0)) {
      throw new Error('Version components must be non-negative integers');
    }
  }

  public static initial(): SemanticVersion {
    return new SemanticVersion(1, 0, 0);
  }

  public static fromString(value: string): SemanticVersion {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
    if (!match) throw new Error('Semantic version must use MAJOR.MINOR.PATCH');
    return new SemanticVersion(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  public nextPatch(): SemanticVersion {
    return new SemanticVersion(this.major, this.minor, this.patch + 1);
  }

  public getValue(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  public parts(): readonly [number, number, number] {
    return [this.major, this.minor, this.patch] as const;
  }
}

export class NumericVersion {
  constructor(private readonly value: number) {
    if (!Number.isInteger(value) || value < 0) throw new Error('Version must be a non-negative integer');
  }

  public getValue(): string {
    return String(this.value);
  }

  public nextPatch(): NumericVersion {
    return new NumericVersion(this.value + 1);
  }
}

export abstract class ReferenceSpecification<T extends { getReference(): { getValue(): string } }> implements DomainSpecification<T> {
  protected constructor(private readonly reference: string) {}
  public isSatisfiedBy(candidate: T): boolean {
    return candidate.getReference().getValue() === this.reference;
  }
}

export abstract class LifecycleService {
  protected static assignState<TTarget extends { setLifecycleState(state: never): void }, TState extends string>(target: TTarget, state: TState): TTarget {
    target.setLifecycleState(state as never);
    return target;
  }
}
