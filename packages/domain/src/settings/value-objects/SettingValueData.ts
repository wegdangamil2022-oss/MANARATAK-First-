import { ValueType } from '../enums/ValueType';

export abstract class SettingValueData<T = unknown> {
  abstract readonly type: ValueType;
  abstract getValue(): T;

  public equals(other: SettingValueData): boolean {
    if (!other || this.type !== other.type) return false;
    return JSON.stringify(this.getValue()) === JSON.stringify(other.getValue());
  }
}

export class StringValue extends SettingValueData<string> {
  readonly type = ValueType.String;
  private readonly value: string;

  constructor(value: string) {
    super();
    if (typeof value !== 'string') {
      throw new Error('Value must be a string for StringValue.');
    }
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }
}

export class NumberValue extends SettingValueData<number> {
  readonly type = ValueType.Number;
  private readonly value: number;

  constructor(value: number) {
    super();
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error('Value must be a valid number for NumberValue.');
    }
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }
}

export class BooleanValue extends SettingValueData<boolean> {
  readonly type = ValueType.Boolean;
  private readonly value: boolean;

  constructor(value: boolean) {
    super();
    if (typeof value !== 'boolean') {
      throw new Error('Value must be a boolean for BooleanValue.');
    }
    this.value = value;
  }

  getValue(): boolean {
    return this.value;
  }
}

export class JsonValue extends SettingValueData<Record<string, unknown>> {
  readonly type = ValueType.Json;
  private readonly value: Record<string, unknown>;

  constructor(value: Record<string, unknown>) {
    super();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Value must be a non-null object for JsonValue.');
    }
    this.value = value;
  }

  getValue(): Record<string, unknown> {
    return this.value;
  }
}
