import { StorageLocator } from '../value-objects/StorageLocator';

export interface IStorageProviderGateway {
  generateUploadLocator(): Promise<StorageLocator>;
  delete(locator: StorageLocator): Promise<void>;
  archive(locator: StorageLocator): Promise<void>;
  restore(locator: StorageLocator): Promise<void>;
}
