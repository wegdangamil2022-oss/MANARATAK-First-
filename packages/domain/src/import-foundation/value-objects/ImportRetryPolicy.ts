export interface ImportRetryPolicyProps {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential';
  initialDelayMs: number;
  maxDelayMs: number;
  retryableErrorCodes: string[];
  dlqAfterAttempts: number;
}

export class ImportRetryPolicy {
  private constructor(private readonly props: ImportRetryPolicyProps) {}

  static create(props: ImportRetryPolicyProps): ImportRetryPolicy {
    if (props.maxAttempts < 1) {
      throw new Error('maxAttempts must be at least 1');
    }
    if (props.initialDelayMs < 0 || props.maxDelayMs < props.initialDelayMs) {
      throw new Error('Invalid delay configuration');
    }
    if (props.dlqAfterAttempts < 1) {
      throw new Error('dlqAfterAttempts must be at least 1');
    }
    
    return new ImportRetryPolicy({ ...props });
  }

  get maxAttempts(): number { return this.props.maxAttempts; }
  get backoffStrategy(): 'fixed' | 'exponential' { return this.props.backoffStrategy; }
  get initialDelayMs(): number { return this.props.initialDelayMs; }
  get maxDelayMs(): number { return this.props.maxDelayMs; }
  get retryableErrorCodes(): string[] { return [...this.props.retryableErrorCodes]; }
  get dlqAfterAttempts(): number { return this.props.dlqAfterAttempts; }

  toJSON() {
    return { ...this.props };
  }
}
