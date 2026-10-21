// Keep the canonical test command and exit status; expose bounded failure
// annotations when the full runner log cannot be retrieved by reviewers.
import {spawn} from 'node:child_process';
import {stripVTControlCharacters} from 'node:util';
import {npmInvocation} from '../release/lib/DiagnosticProcess.mjs';
const args=process.argv.slice(2);
if(JSON.stringify(args)!==JSON.stringify(['npm','run','test:unit']))throw Error('CANONICAL_SOURCE_UNIT_COMMAND_REQUIRED');
const command=npmInvocation(args.slice(1));
const child=spawn(command.command,command.args,{stdio:['ignore','pipe','pipe'],env:process.env,windowsHide:true});
let log='';
for(const [stream,output]of [[child.stdout,process.stdout],[child.stderr,process.stderr]])stream.on('data',chunk=>{output.write(chunk);log+=chunk.toString();if(log.length>2_000_000)log=log.slice(-2_000_000);});
child.once('error',()=>{console.error('::error::SOURCE_UNIT_TEST_PROCESS_START_FAILED');process.exitCode=1;});
child.once('exit',(code,signal)=>{
  if(code===0)return;
  const lines=stripVTControlCharacters(log).split(/\r?\n/),snippets=[];
  for(let i=0;i<lines.length&&snippets.length<15;i++)if(/(?:\bFAIL\s|^not ok\b|^\s*not ok\b|\bError:|\bAssertionError:)/.test(lines[i]))snippets.push(lines.slice(i,i+14).join('\n').slice(0,2200));
  if(!snippets.length)snippets.push(lines.slice(-30).join('\n').slice(-4000));
  for(const text of snippets)console.error('::error title=Source unit failure::'+text.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A'));
  process.exitCode=Number.isInteger(code)&&code>0?code:1;
  console.error('SOURCE_UNIT_EXIT='+JSON.stringify({code,signal}));
});
