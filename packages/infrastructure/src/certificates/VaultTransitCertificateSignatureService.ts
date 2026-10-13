import type { ICertificateSignatureService } from '@manaratak/domain';

export interface CertificateTransitKey {
  issuerCode: string;
  keyName: string;
  version: number;
  canSign: boolean;
}
/** Vault Transit is the KMS boundary: private keys are never read by the application.
 * Each issuer reference is pinned to a key version; retired references remain verify-only.
 */
export class VaultTransitCertificateSignatureService implements ICertificateSignatureService {
  private readonly base: string;
  private readonly keys: Readonly<Record<string, CertificateTransitKey>>;
  constructor(
    private readonly options: {
      baseUrl: string;
      token: string;
      mount?: string;
      keys: Record<string, CertificateTransitKey>;
    },
  ) {
    const url = new URL(options.baseUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !options.token.trim() ||
      /[\r\n]/.test(options.token)
    )
      throw new Error('CERTIFICATE_KMS_CONFIGURATION_INVALID');
    const mount = options.mount ?? 'transit';
    if (!/^[a-zA-Z0-9_-]+$/.test(mount) || !Object.keys(options.keys).length)
      throw new Error('CERTIFICATE_KMS_CONFIGURATION_INVALID');
    const identities = new Set<string>();
    for (const [reference, key] of Object.entries(options.keys)) {
      if (
        !reference.trim() ||
        !key.issuerCode?.trim() ||
        !/^[a-zA-Z0-9_-]+$/.test(key.keyName) ||
        !Number.isSafeInteger(key.version) ||
        key.version < 1 ||
        typeof key.canSign !== 'boolean'
      )
        throw new Error('CERTIFICATE_KMS_KEY_CONFIGURATION_INVALID');
      const identity = `${key.keyName}:${key.version}`;
      if (identities.has(identity))
        throw new Error('CERTIFICATE_KMS_KEY_REFERENCE_ALIAS_FORBIDDEN');
      identities.add(identity);
    }
    this.keys = Object.freeze(
      Object.fromEntries(
        Object.entries(options.keys).map(([reference, key]) => [
          reference,
          Object.freeze({ ...key }),
        ]),
      ),
    );
    this.base = `${url.toString().replace(/\/$/, '')}/v1/${mount}`;
  }
  private key(reference: string) {
    const key = Object.prototype.hasOwnProperty.call(this.keys, reference)
      ? this.keys[reference]
      : undefined;
    if (!key) throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_NOT_CONFIGURED');
    return key;
  }
  private async request(
    path: string,
    payload?: unknown,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.base}/${path}`, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: {
        'X-Vault-Token': this.options.token,
        'content-type': 'application/json',
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || !response.body)
      throw new Error('CERTIFICATE_KMS_REQUEST_FAILED');
    const reader = response.body.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65536) throw new Error('CERTIFICATE_KMS_RESPONSE_TOO_LARGE');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const json = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      data?: Record<string, unknown>;
    };
    if (!json.data || typeof json.data !== 'object')
      throw new Error('CERTIFICATE_KMS_RESPONSE_INVALID');
    return json.data;
  }
  private digest(hash: string) {
    if (!/^[a-f0-9]{64}$/i.test(hash))
      throw new Error('CERTIFICATE_SIGNING_HASH_INVALID');
    return Buffer.from(hash, 'hex').toString('base64');
  }
  async assertIssuerKeyForIssuer(
    reference: string,
    issuerCode: string,
  ): Promise<void> {
    if (this.key(reference).issuerCode !== issuerCode)
      throw new Error('CERTIFICATE_KMS_ISSUER_KEY_SCOPE_INVALID');
    await this.assertIssuerKeyAvailable(reference);
  }
  async assertIssuerKeyAvailable(reference: string): Promise<void> {
    const key = this.key(reference);
    if (!key.canSign) throw new Error('CERTIFICATE_KMS_KEY_RETIRED');
    const metadata = await this.request(`keys/${key.keyName}`);
    if (
      metadata.exportable !== false ||
      metadata.allow_plaintext_backup !== false ||
      metadata.supports_signing !== true ||
      ![
        'rsa-2048',
        'rsa-3072',
        'rsa-4096',
        'ecdsa-p256',
        'ecdsa-p384',
        'ecdsa-p521',
      ].includes(String(metadata.type)) ||
      !metadata.keys ||
      !Object.prototype.hasOwnProperty.call(
        metadata.keys,
        String(key.version),
      ) ||
      Number(metadata.min_encryption_version ?? 0) > key.version
    )
      throw new Error('CERTIFICATE_KMS_KEY_CUSTODY_INVALID');
  }
  async signHash(hash: string, reference: string): Promise<string> {
    await this.assertIssuerKeyAvailable(reference);
    const key = this.key(reference);
    const data = await this.request(`sign/${key.keyName}`, {
      input: this.digest(hash),
      prehashed: true,
      hash_algorithm: 'sha2-256',
      key_version: key.version,
    });
    if (
      typeof data.signature !== 'string' ||
      !new RegExp(`^vault:v${key.version}:[A-Za-z0-9+/]+={0,2}$`).test(
        data.signature,
      ) ||
      data.signature.length > 4096
    )
      throw new Error('CERTIFICATE_KMS_SIGNATURE_INVALID');
    return data.signature;
  }
  async verifyHash(
    hash: string,
    signature: string | null | undefined,
    reference: string,
  ): Promise<boolean> {
    try {
      const key = this.key(reference);
      if (
        !signature ||
        signature.length > 4096 ||
        !new RegExp(`^vault:v${key.version}:[A-Za-z0-9+/]+={0,2}$`).test(
          signature,
        )
      )
        return false;
      const data = await this.request(`verify/${key.keyName}`, {
        input: this.digest(hash),
        signature,
        prehashed: true,
        hash_algorithm: 'sha2-256',
      });
      return data.valid === true;
    } catch {
      return false;
    }
  }
}
