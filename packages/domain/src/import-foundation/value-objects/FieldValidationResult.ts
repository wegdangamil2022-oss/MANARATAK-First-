import { FieldValidationStatus } from '../enums/FieldValidationStatus';

export interface FieldValidationResultProps {
  ruleId: string;
  status: FieldValidationStatus;
  message?: string;
  metadata?: Record<string, unknown>;
}

export class FieldValidationResult {
  public readonly ruleId: string;
  public readonly status: FieldValidationStatus;
  public readonly message?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(props: FieldValidationResultProps) {
    if (!props.ruleId || props.ruleId.trim() === '') {
      throw new Error('ruleId is required');
    }
    if (!props.status) {
      throw new Error('status is required');
    }

    this.ruleId = props.ruleId;
    this.status = props.status;
    this.message = props.message;
    this.metadata = props.metadata;
  }
}
