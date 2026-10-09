import { lstat, readdir, readFile, rm } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
let sweepOffset = 0;
/** Only private, marked spools from a dead process on this host are removable. */
export async function sweepOrphanImportSpools(root = tmpdir(), now = Date.now()): Promise<number> {
  let removed = 0;
  const entries = await readdir(root, { withFileTypes: true });
  const candidates = entries.filter(item => item.isDirectory() && /^manaratak-import-[A-Za-z0-9]+$/.test(item.name)).sort((a,b) => a.name.localeCompare(b.name));
  if (sweepOffset >= candidates.length) sweepOffset = 0;
  const page = candidates.slice(sweepOffset, sweepOffset + 100); sweepOffset += page.length;
  for (const entry of page) {
    const directory = join(root, entry.name);
    try {
      const stat = await lstat(directory);
      if (stat.isSymbolicLink() || now - stat.mtimeMs < 24 * 3600_000 ||
          typeof process.getuid === 'function' && stat.uid !== process.getuid()) continue;
      const markerPath = join(directory, 'owner.json'); const markerStat = await lstat(markerPath);
      if (!markerStat.isFile() || markerStat.isSymbolicLink() || markerStat.size > 1000) continue;
      const owner = JSON.parse(await readFile(markerPath, 'utf8'));
      if (owner.host !== hostname() || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 || owner.pid === process.pid ||
          !Number.isFinite(owner.createdAt) || now - owner.createdAt < 24 * 3600_000) continue;
      try { process.kill(owner.pid, 0); continue; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') continue; }
      await rm(directory, { recursive: true, force: true }); removed++;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') continue; }
  }
  return removed;
}
