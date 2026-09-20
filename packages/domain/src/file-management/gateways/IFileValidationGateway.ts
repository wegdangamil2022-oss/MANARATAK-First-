import { StorageLocator } from '../value-objects/StorageLocator';

export interface IFileValidationGateway {
  validate(locator: StorageLocator): Promise<boolean>;
}
