import {digest} from './post28-migration-inventory.mjs';
export function verificationRestoreList(text){
 if(typeof text!=='string'||!text.includes('Archive created at'))throw new Error('POST28_BACKUP_TOC_INVALID');
 let schemas=0,extensions=0,objects=0;
 const excluded=[];
 const lines=text.split('\n').map(line=>{
  if(!/^\d+;/.test(line))return line;
  objects++;
  if(/\sSCHEMA\s+-\s+/.test(line)){
   if(!/\sSCHEMA\s+-\s+public\s/.test(line))throw new Error('POST28_BACKUP_UNEXPECTED_SCHEMA');
   schemas++;excluded.push(line);return '; preprovisioned '+line;
  }
  if(/\sEXTENSION\s+-\s+/.test(line)||/\sCOMMENT\s+-\s+EXTENSION\s+/.test(line)){
   if(!/\spg_trgm(?:\s|$)/.test(line))throw new Error('POST28_BACKUP_UNEXPECTED_EXTENSION');
   extensions++;excluded.push(line);return '; preprovisioned '+line;
  }
  return line;
 });
 if(schemas!==1||extensions<1||objects<1)throw new Error('POST28_BACKUP_TOC_INCOMPLETE');
 return {text:lines.join('\n'),excluded,objects,originalSha256:digest(text),filteredSha256:digest(lines.join('\n'))};
}
