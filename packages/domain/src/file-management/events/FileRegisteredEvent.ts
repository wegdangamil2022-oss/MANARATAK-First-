import { FileId } from '../value-objects/FileId';

export class FileRegisteredEvent {
  constructor(
    public readonly fileId: FileId,
    public readonly occurredOn: Date = new Date()
  ) {}
}
