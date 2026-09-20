export interface ImportCheckpointProps {
  batchId: string;
  stage: string;
  chunkIndex: number;
  recordOffset: number;
  processedRecords: number;
  failedRecords: number;
  acceptedRecordKeys: string[];
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export class ImportCheckpoint {
  private constructor(private readonly props: ImportCheckpointProps) {}

  static create(props: ImportCheckpointProps): ImportCheckpoint {
    if (!props.batchId) {
      throw new Error('batchId is required for ImportCheckpoint');
    }
    if (props.chunkIndex < 0 || props.recordOffset < 0 || props.processedRecords < 0 || props.failedRecords < 0) {
      throw new Error('Indexes and counts must be non-negative for ImportCheckpoint');
    }
    return new ImportCheckpoint({ ...props });
  }

  get batchId(): string { return this.props.batchId; }
  get stage(): string { return this.props.stage; }
  get chunkIndex(): number { return this.props.chunkIndex; }
  get recordOffset(): number { return this.props.recordOffset; }
  get processedRecords(): number { return this.props.processedRecords; }
  get failedRecords(): number { return this.props.failedRecords; }
  get acceptedRecordKeys(): string[] { return [...this.props.acceptedRecordKeys]; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }
  
  toJSON() {
    return { ...this.props };
  }
}
