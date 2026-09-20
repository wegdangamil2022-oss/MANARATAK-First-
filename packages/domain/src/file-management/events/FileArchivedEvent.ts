import { FileId } from '../value-objects/FileId';

export class FileArchivedEvent {
  constructor(
    public readonly fileId: FileId,
    public readonly occurredOn: Date = new Date()
  ) {}
}
