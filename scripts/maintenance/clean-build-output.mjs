import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function planBuildCleanup(repository, selectedDirectory = repository) {
  const root = fs.realpathSync(repository);
  const workspaces = ['apps', 'packages'].flatMap(group => {
    const directory = path.join(root, group);
    return fs.existsSync(directory) ? fs.readdirSync(directory)
      .map(name => path.join(directory, name))
      .filter(directory => fs.existsSync(path.join(directory, 'package.json'))) : [];
  });
  const selected = path.resolve(selectedDirectory);
  if (selected !== root && !workspaces.includes(selected))
    throw new Error('BUILD_CLEANUP_UNKNOWN_WORKSPACE');
  const directories = selected === root ? [root, ...workspaces] : [selected];
  // Validate every target before deleting any. Dependencies, source, private
  // runtime storage and immutable release/evidence directories are not targets.
  return directories.flatMap(directory => {
    if (fs.realpathSync(directory) !== directory || fs.lstatSync(directory).isSymbolicLink())
      throw new Error('BUILD_CLEANUP_LINKED_WORKSPACE');
    return ['dist', 'tsconfig.tsbuildinfo'].flatMap(name => {
      const target = path.resolve(directory, name);
      if (path.dirname(target) !== directory) throw new Error('BUILD_CLEANUP_PATH_INVALID');
      if (!fs.existsSync(target)) return [];
      if (fs.lstatSync(target).isSymbolicLink() || fs.realpathSync(target) !== target)
        throw new Error('BUILD_CLEANUP_LINKED_OUTPUT');
      return [target];
    });
  });
}

export function cleanBuildOutputs(targets) {
  for (const target of targets) fs.rmSync(target, {recursive: true, force: true});
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(argument => argument !== '--dry-run'))
    throw new Error('BUILD_CLEANUP_ARGUMENT_INVALID');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const targets = planBuildCleanup(root, process.cwd());
  if (!process.argv.includes('--dry-run')) cleanBuildOutputs(targets);
  console.log(`${process.argv.includes('--dry-run') ? 'BUILD_CLEANUP_PLAN' : 'BUILD_CLEANUP_DONE'}=${targets.length}`);
}
