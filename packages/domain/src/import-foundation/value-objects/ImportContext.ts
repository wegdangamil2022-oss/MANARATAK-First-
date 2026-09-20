import { ValueObject } from '@manaratak/core';

export interface ImportContextProps {
  sourceSystem: string;
  triggeredBy: string;
}

export class ImportContext extends ValueObject<ImportContextProps> {
  constructor(props: ImportContextProps) {
    super(props);
  }
}
