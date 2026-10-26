import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
const directory = process.argv[2];
if (!directory || !path.isAbsolute(directory)) throw Error('PRIVATE_ABSOLUTE_DIRECTORY_REQUIRED');
const root = path.resolve(directory),
  repository = path.resolve(import.meta.dirname, '../..');
if (root === repository || root.startsWith(repository + path.sep))
  throw Error('SECRETS_MUST_BE_OUTSIDE_REPOSITORY');
await fs.mkdir(root, { recursive: true, mode: 0o700 });
for (const name of ['provider_key', 'provider_signing', 'grant_signing', 'worker_token'])
  await fs.writeFile(path.join(root, name), randomBytes(48).toString('base64url'), {
    flag: 'wx',
    mode: 0o600,
  });
console.log(
  'Private secret files created. Existing files are never overwritten. Supply TLS certificate/key separately.',
);
