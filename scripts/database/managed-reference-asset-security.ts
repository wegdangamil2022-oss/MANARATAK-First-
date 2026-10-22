import fs from 'node:fs';
import { AssetStorageLocator, AssetSanitizationMetadata } from '@manaratak/domain';
// @ts-expect-error Operator ESM adapter has no TS declaration.
import { createNativeSeedScanner } from './native-seed-scanner.mjs';
// @ts-expect-error Operator ESM guard has no TS declaration.
import { resolveManagedSeedAsset, validateManagedSeedJson } from './managed-reference-seed-files.mjs';

/** Windows development reference JSON only; never student documents or production. */
export class ManagedReferenceAssetSecurity {
  private scanner: ReturnType<typeof createNativeSeedScanner>;
  constructor(private root:string,private bucket:string,config:{executable:string;sha256:string}) {
    this.root=fs.realpathSync(root);this.scanner=createNativeSeedScanner(config);
  }
  get receipts(){return this.scanner.journal;}
  private filename(locator:AssetStorageLocator) {
    return resolveManagedSeedAsset(this.root,this.bucket,locator);
  }
  async scan(locator:AssetStorageLocator) {
    this.scanner.scan(this.filename(locator));return {clean:true};
  }
  async sanitize(locator:AssetStorageLocator) {
    const bytes=fs.readFileSync(this.filename(locator));
    validateManagedSeedJson(bytes);
    return {sanitizedLocator:locator,metadata:new AssetSanitizationMetadata(true,new Date(),
      'Canonical UTF-8 reference JSON; bytes unchanged. Scanned before and after sanitation with Windows Defender.')};
  }
}
