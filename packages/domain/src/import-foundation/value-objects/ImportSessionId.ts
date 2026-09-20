import { ValueObject } from '@manaratak/core';

export interface ImportSessionIdProps {
  value: string;
}

export class ImportSessionId extends ValueObject<ImportSessionIdProps> {
  constructor(props: ImportSessionIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }
}
