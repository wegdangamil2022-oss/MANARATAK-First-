export interface ParsedImportRowProps {
  batchId?: string;
  sourceRowNumber: number;
  recordOffset?: number;
  chunkIndex?: number;
  raw: Record<string, unknown>;
  normalized?: Record<string, unknown>;
  sourceDedupKey?: string;
  metadata?: Record<string, unknown>;
}

export class ParsedImportRow {
  public readonly batchId?: string;
  public readonly sourceRowNumber: number;
  public readonly recordOffset?: number;
  public readonly chunkIndex?: number;
  public readonly raw: Readonly<Record<string, unknown>>;
  public readonly normalized?: Readonly<Record<string, unknown>>;
  public readonly sourceDedupKey?: string;
  public readonly metadata?: Readonly<Record<string, unknown>>;

  constructor(props: ParsedImportRowProps) {
    if (props.sourceRowNumber < 0) {
      throw new Error('sourceRowNumber must be non-negative');
    }
    
    this.batchId = props.batchId;
    this.sourceRowNumber = props.sourceRowNumber;
    this.recordOffset = props.recordOffset;
    this.chunkIndex = props.chunkIndex;
    this.raw = Object.freeze({ ...props.raw });
    this.normalized = props.normalized ? Object.freeze({ ...props.normalized }) : undefined;
    this.sourceDedupKey = props.sourceDedupKey;
    this.metadata = props.metadata ? Object.freeze({ ...props.metadata }) : undefined;
  }
}
