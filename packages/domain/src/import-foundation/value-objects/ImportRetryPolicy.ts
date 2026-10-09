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
    if (!Number.isSafeInteger(props.maxAttempts) || props.maxAttempts < 1 || props.maxAttempts > 100) {
      throw new Error('maxAttempts must be at least 1');
    }
    if (!Number.isSafeInteger(props.initialDelayMs) || !Number.isSafeInteger(props.maxDelayMs) ||
        props.initialDelayMs < 0 || props.maxDelayMs < props.initialDelayMs || props.maxDelayMs > 86_400_000) {
      throw new Error('Invalid delay configuration');
    }
    if (!Number.isSafeInteger(props.dlqAfterAttempts) || props.dlqAfterAttempts < 1 || props.dlqAfterAttempts > 100) {
      throw new Error('dlqAfterAttempts must be at least 1');
    }
    
    if (!['fixed', 'exponential'].includes(props.backoffStrategy) ||
        !Array.isArray(props.retryableErrorCodes) || props.retryableErrorCodes.length > 100 ||
        props.retryableErrorCodes.some(code => typeof code !== 'string' || !/^[A-Z][A-Z0-9_]{0,127}$/.test(code))) {
      throw new Error('Invalid retry classification');
    }
    return new ImportRetryPolicy({ ...props, retryableErrorCodes: [...props.retryableErrorCodes] });
  }

  get maxAttempts(): number { return this.props.maxAttempts; }
  get backoffStrategy(): 'fixed' | 'exponential' { return this.props.backoffStrategy; }
  get initialDelayMs(): number { return this.props.initialDelayMs; }
  get maxDelayMs(): number { return this.props.maxDelayMs; }
  get retryableErrorCodes(): string[] { return [...this.props.retryableErrorCodes]; }
  get dlqAfterAttempts(): number { return this.props.dlqAfterAttempts; }

  toJSON() {
    return { ...this.props, retryableErrorCodes: [...this.props.retryableErrorCodes] };
  }
}
