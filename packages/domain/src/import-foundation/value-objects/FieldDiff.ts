import { FieldDiffType } from '../enums/FieldDiffType';
import { FieldEvidence } from './FieldEvidence';

export interface FieldDiffProps {
  fieldName: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  diffType: FieldDiffType;
  evidence?: FieldEvidence;
}

export class FieldDiff {
  public readonly fieldName: string;
  public readonly currentValue?: unknown;
  public readonly proposedValue?: unknown;
  public readonly diffType: FieldDiffType;
  public readonly evidence?: FieldEvidence;

  constructor(props: FieldDiffProps) {
    if (!props.fieldName || props.fieldName.trim() === '') {
      throw new Error('fieldName is required');
    }
    if (!props.diffType) {
      throw new Error('diffType is required');
    }

    if (
      props.diffType === FieldDiffType.ADDITION ||
      props.diffType === FieldDiffType.MODIFICATION ||
      props.diffType === FieldDiffType.CONFLICT
    ) {
      if (!props.evidence) {
        throw new Error(`evidence is required for ${props.diffType} diff type`);
      }
    }

    this.fieldName = props.fieldName;
    this.currentValue = props.currentValue;
    this.proposedValue = props.proposedValue;
    this.diffType = props.diffType;
    this.evidence = props.evidence;
  }

  public canDeleteExistingValue(): false {
    return false;
  }
}
