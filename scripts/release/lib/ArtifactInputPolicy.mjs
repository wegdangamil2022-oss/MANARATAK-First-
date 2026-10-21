import fs from 'node:fs';
import path from 'node:path';
export function assertRegularArtifactInputs(root,items) {
  const base=fs.realpathSync(root);
  function inspect(file) {
    const stat=fs.lstatSync(file);
    if(stat.isSymbolicLink()||!fs.realpathSync(file).startsWith(base+path.sep))throw new Error('RELEASE_INPUT_SYMLINK_OR_ESCAPE');
    if(stat.isDirectory())for(const entry of fs.readdirSync(file))inspect(path.join(file,entry));
    else if(!stat.isFile())throw new Error('RELEASE_INPUT_SPECIAL_FILE');
  }
  for(const item of items) {
    if(path.isAbsolute(item)||item.split(/[\\/]/).includes('..'))throw new Error('RELEASE_INPUT_PATH_INVALID');
    let cursor=base;
    for(const part of item.split('/')){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw new Error('RELEASE_INPUT_SYMLINK_OR_ESCAPE');}
    inspect(path.join(base,item));
  }
}
