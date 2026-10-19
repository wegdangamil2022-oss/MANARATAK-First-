import fs from 'node:fs';
import path from 'node:path';
import { SHA } from './ReleaseContracts.mjs';
export function inspectStaticBuild(directory, unit, expectedSha) {
  try {
    const index = path.join(directory, 'index.html'),
      descriptor = JSON.parse(
        fs.readFileSync(path.join(directory, 'absheer-build.json'), 'utf8'),
      );
    const html = fs.readFileSync(index, 'utf8');
    if (
      descriptor.version !== 1 ||
      descriptor.unit !== unit ||
      !SHA.test(descriptor.sourceSha) ||
      (expectedSha && descriptor.sourceSha !== expectedSha) ||
      !html.includes(`<meta name="absheer-build-sha" content="${descriptor.sourceSha}">`)
    )
      throw new Error('INVALID');
    return { version: 1, unit, status: 'BUILT', sourceSha: descriptor.sourceSha };
  } catch {
    return { version: 1, unit, status: 'UNBUILT' };
  }
}
