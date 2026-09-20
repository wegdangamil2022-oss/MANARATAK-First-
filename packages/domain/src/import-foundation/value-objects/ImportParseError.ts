export interface ImportParseErrorProps {
  sourceRowNumber?: number;
  recordOffset?: number;
  chunkIndex?: number;
  code: string;
  message: string;
  rawFragment?: string;
  recoverable: boolean;
  metadata?: Record<string, unknown>;
}

export class ImportParseError {
  public readonly sourceRowNumber?: number;
  public readonly recordOffset?: number;
  public readonly chunkIndex?: number;
  public readonly code: string;
  public readonly message: string;
  public readonly rawFragment?: string;
  public readonly recoverable: boolean;
  public readonly metadata?: Readonly<Record<string, unknown>>;

  constructor(props: ImportParseErrorProps) {
    if (!props.code) {
      throw new Error('code is required');
    }
    if (!props.message) {
      throw new Error('message is required');
    }

    this.sourceRowNumber = props.sourceRowNumber;
    this.recordOffset = props.recordOffset;
    this.chunkIndex = props.chunkIndex;
    this.code = props.code;
    this.message = props.message;
    this.rawFragment = props.rawFragment;
    this.recoverable = props.recoverable;
    this.metadata = props.metadata ? Object.freeze({ ...props.metadata }) : undefined;
  }
}
