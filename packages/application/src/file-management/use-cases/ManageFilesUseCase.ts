import {
  IFileRecordRepository,
  IStorageProviderGateway,
  FileRecord,
  FileId,
  FileReference,
  StorageLocator,
  FileMetadata,
  Checksum,
  RetentionMetadata,
  OwnerReference,
  FileIntegrityValidationService
} from '@manaratak/domain';
import {
  RegisterFileInput,
  ActivateFileInput,
  ArchiveFileInput,
  SoftDeleteFileInput,
  RestoreFileInput,
  GenerateUploadLocatorInput
} from '../dtos/FileManagementDtos';

export class ManageFilesUseCase {
  constructor(
    private fileRepository: IFileRecordRepository,
    private storageGateway: IStorageProviderGateway,
    _integrityService: FileIntegrityValidationService
  ) {}

  public async generateUploadLocator(_input: GenerateUploadLocatorInput): Promise<string> {
    const locator = await this.storageGateway.generateUploadLocator();
    return locator.value;
  }

  public async registerFile(input: RegisterFileInput): Promise<void> {
    const id = new FileId(input.fileId);
    const existing = await this.fileRepository.findBy({
      isSatisfiedBy: (f: FileRecord) => f.id.value === id.value
    });

    if (existing.length > 0) {
      throw new Error(`File with id ${input.fileId} already exists`);
    }

    const record = new FileRecord({
      id,
      reference: new FileReference(input.fileReference),
      locator: new StorageLocator(input.storageLocator),
      metadata: new FileMetadata(input.originalFilename, input.mimeType, input.fileExtension, input.byteSize),
      retention: new RetentionMetadata(input.retentionCategory, input.expiresAt),
      owner: new OwnerReference(input.ownerReference),
      classification: input.classification,
      state: undefined as any // handled by constructor
    }, true);

    await this.fileRepository.save(record);
  }

  public async activateFile(input: ActivateFileInput): Promise<void> {
    const id = new FileId(input.fileId);
    const records = await this.fileRepository.findBy({
      isSatisfiedBy: (f: FileRecord) => f.id.value === id.value
    });

    if (records.length === 0) throw new Error('File not found');
    const record = records[0];

    const checksum = new Checksum(input.checksumAlgorithm, input.checksumHash);
    record.activate(checksum);

    await this.fileRepository.save(record);
  }

  public async archiveFile(input: ArchiveFileInput): Promise<void> {
    const id = new FileId(input.fileId);
    const records = await this.fileRepository.findBy({
      isSatisfiedBy: (f: FileRecord) => f.id.value === id.value
    });

    if (records.length === 0) throw new Error('File not found');
    const record = records[0];

    record.archive();
    // Storage Gateway orchestrates physical move
    await this.storageGateway.archive(record.locator);

    await this.fileRepository.save(record);
  }

  public async softDeleteFile(input: SoftDeleteFileInput): Promise<void> {
    const id = new FileId(input.fileId);
    const records = await this.fileRepository.findBy({
      isSatisfiedBy: (f: FileRecord) => f.id.value === id.value
    });

    if (records.length === 0) throw new Error('File not found');
    const record = records[0];

    record.softDelete();
    
    await this.fileRepository.save(record);
  }

  public async restoreFile(input: RestoreFileInput): Promise<void> {
    const id = new FileId(input.fileId);
    const records = await this.fileRepository.findBy({
      isSatisfiedBy: (f: FileRecord) => f.id.value === id.value
    });

    if (records.length === 0) throw new Error('File not found');
    const record = records[0];

    record.restore();
    await this.storageGateway.restore(record.locator);
    
    await this.fileRepository.save(record);
  }
}
