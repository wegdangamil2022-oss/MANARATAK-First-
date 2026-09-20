import { FileId } from '../value-objects/FileId';

export class FileDeletedEvent {
  constructor(
    public readonly fileId: FileId,
    public readonly occurredOn: Date = new Date()
  ) {}
}
