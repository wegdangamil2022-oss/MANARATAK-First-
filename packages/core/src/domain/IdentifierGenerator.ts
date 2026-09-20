/** Canonical cryptographic identifier authority for persisted/domain identifiers. */
export interface IIdentifierGenerator {
  generate(): string;
}

export class CryptographicIdentifierGenerator implements IIdentifierGenerator {
  generate(): string {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || typeof cryptoApi.randomUUID !== 'function') {
      throw new Error('CRYPTO_RANDOM_UUID_UNAVAILABLE');
    }
    return cryptoApi.randomUUID();
  }
}

const canonicalIdentifierGenerator = new CryptographicIdentifierGenerator();
export const generateOpaqueIdentifier = (): string => canonicalIdentifierGenerator.generate();
