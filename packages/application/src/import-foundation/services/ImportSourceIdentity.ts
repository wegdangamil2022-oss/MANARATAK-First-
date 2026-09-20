import { createHash } from 'node:crypto';

const IDENTITY_FIELDS = [
  'sourceReferenceId',
  'universityRefId',
  'externalId',
  'providerId',
  'classificationCode',
  'testCode',
  'publicId',
  'canonicalCode',
  'code',
  'id',
] as const;

const VOLATILE_FIELDS = new Set([
  '_sourceRowNumber',
  'sourceRowNumber',
  'rowNumber',
  'rowIndex',
  'chunkIndex',
  'recordOffset',
  'importedAt',
  'createdAt',
  'updatedAt',
]);

export interface StableImportIdentity {
  sourceDedupKey: string;
  identityKind: 'EXTERNAL_ID' | 'PAYLOAD_FINGERPRINT';
  payloadFingerprint: string;
}

export class ImportSourceIdentity {
  static create(input: {
    sourceSystem: string;
    ownerDomain: string;
    payload: Readonly<Record<string, unknown>>;
  }): StableImportIdentity {
    const canonicalPayload = this.canonicalize(input.payload);
    const payloadFingerprint = this.sha256(JSON.stringify(canonicalPayload));
    const externalIdentity = IDENTITY_FIELDS.map(
      (field) => [field, input.payload[field]] as const,
    ).find(([, value]) => typeof value === 'string' && value.trim().length > 0);
    const identity = externalIdentity
      ? `${externalIdentity[0]}:${String(externalIdentity[1]).trim().toLocaleUpperCase('en-US')}`
      : 'payload';
    return {
      sourceDedupKey: `${this.normalize(input.sourceSystem)}|${this.normalize(input.ownerDomain)}|${identity}|sha256:${payloadFingerprint}`,
      identityKind: externalIdentity ? 'EXTERNAL_ID' : 'PAYLOAD_FINGERPRINT',
      payloadFingerprint,
    };
  }

  private static canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.canonicalize(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !VOLATILE_FIELDS.has(key))
        .sort(([left], [right]) => left.localeCompare(right, 'en-US'))
        .map(([key, item]) => [key, this.canonicalize(item)]),
    );
  }

  private static normalize(value: string): string {
    return value.trim().toLocaleLowerCase('en-US');
  }

  private static sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
