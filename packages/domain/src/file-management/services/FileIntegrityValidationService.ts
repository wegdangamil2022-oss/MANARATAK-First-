import { Checksum } from '../value-objects/Checksum';

export class FileIntegrityValidationService {
  public validate(expected: Checksum, actual: Checksum): boolean {
    return expected.algorithm === actual.algorithm && expected.hash === actual.hash;
  }
}
