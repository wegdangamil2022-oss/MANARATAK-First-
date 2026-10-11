import {describe,expect,it} from 'vitest';
import {StudentSupportCursorCodec} from '../../src/students/StudentSupportCursorCodec';

const secret='student-support-test-signing-key-0000000000000000000001';
const row={updatedAt:new Date('2026-10-11T00:00:00Z'),id:'workspace-id-1'};
describe('StudentSupportCursorCodec',()=>{
  it('round trips a signed cursor scoped to filters and requested page size',()=>{
    const codec=new StudentSupportCursorCodec(secret,()=>1_790_000_000_000);
    const token=codec.encode(row,JSON.stringify({query:'student',status:'ACTIVE',limit:30}));
    expect(codec.decode(token,JSON.stringify({query:'student',status:'ACTIVE',limit:30}))).toEqual(row);
    expect(()=>codec.decode(token,JSON.stringify({query:'other',status:'ACTIVE',limit:30})))
      .toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    expect(()=>codec.decode(token,JSON.stringify({query:'student',status:'SUSPENDED',limit:30})))
      .toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    expect(()=>codec.decode(token,JSON.stringify({query:'student',status:'ACTIVE',limit:20})))
      .toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
  });
  it('rejects tampering, wrong signing keys, missing secrets and expired cursors',()=>{
    const now=1_790_000_000_000;
    const codec=new StudentSupportCursorCodec(secret,()=>now);
    const token=codec.encode(row,'student:1');
    const [body,sig]=token.split('.');
    expect(()=>codec.decode(body.slice(0,-1)+(body.endsWith('a')?'b':'a')+'.'+sig,'student:1'))
      .toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    expect(()=>codec.decode(token.slice(0,-1)+'x','student:1')).toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    expect(()=>new StudentSupportCursorCodec('another-secret-signing-key-000000000000').decode(token,'student:1'))
      .toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    expect(()=>new StudentSupportCursorCodec(secret,()=>now+16*60*1000).decode(token,'student:1'))
      .toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    expect(()=>new StudentSupportCursorCodec().encode(row,'student:1'))
      .toThrow('STUDENT_SUPPORT_CURSOR_SIGNING_SECRET_REQUIRED');
  });
  it('never exposes names or personal query text in the token',()=>{
    const codec=new StudentSupportCursorCodec(secret,()=>1_790_000_000_000);
    const token=codec.encode(row,'query:private-student-name');
    expect(token).not.toContain('private-student-name');
    expect(Buffer.from(token.split('.')[0],'base64url').toString('utf8')).not.toContain('private-student-name');
  });
});
