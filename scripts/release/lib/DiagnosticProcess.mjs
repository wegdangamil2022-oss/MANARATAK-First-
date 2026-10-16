import fs from 'node:fs';
import path from 'node:path';

// Windows cannot exec npm.cmd without a shell. Invoke its JS entry directly instead.
export function npmInvocation(args, {platform = process.platform, execPath = process.execPath, env = process.env} = {}) {
  if (platform !== 'win32') return {command: 'npm', args};
  const cli = env.npm_execpath?.endsWith('.js') ? env.npm_execpath :
    path.join(path.dirname(execPath), 'node_modules/npm/bin/npm-cli.js');
  if (!fs.statSync(cli).isFile()) throw new Error('POST28_NPM_CLI_REQUIRED');
  return {command: execPath, args: [cli, ...args]};
}
