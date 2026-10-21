import path from 'node:path';

/** Vite resolves workspace source; native Node runtime entrypoints remain dist-based. */
export function workspaceAliases(root: string) {
  return Object.fromEntries(
    ['core', 'domain', 'shared', 'types', 'ui', 'application', 'config', 'infrastructure'].map(name => [
      '@manaratak/' + name,
      path.join(root, 'packages', name, name === 'ui' ? 'src/index.tsx' : 'src/index.ts'),
    ]),
  );
}
