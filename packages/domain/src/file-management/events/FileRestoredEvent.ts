import { FileId } from '../value-objects/FileId';

export class FileRestoredEvent {
  constructor(
    public readonly fileId: FileId,
    public readonly occurredOn: Date = new Date()
  ) {}
}
