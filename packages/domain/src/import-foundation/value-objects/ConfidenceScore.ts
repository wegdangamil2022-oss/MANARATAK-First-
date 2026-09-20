export interface ConfidenceScoreProps {
  value: number;
  explanation: string;
}

export class ConfidenceScore {
  public readonly value: number;
  public readonly explanation: string;

  constructor(props: ConfidenceScoreProps) {
    if (typeof props.value !== 'number' || Number.isNaN(props.value) || props.value < 0 || props.value > 1) {
      throw new Error('Confidence value must be between 0 and 1 inclusive');
    }
    if (!props.explanation || props.explanation.trim() === '') {
      throw new Error('explanation is required');
    }

    this.value = props.value;
    this.explanation = props.explanation;
  }

  public canAutoPublish(): false {
    return false;
  }
}
