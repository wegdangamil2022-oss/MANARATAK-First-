import { createHmac, timingSafeEqual } from 'node:crypto';

interface CursorPayload {
  v: 1;
  at: string;
  id: string;
  scope: string;
  exp: number;
}

/** Opaque, expiring, tamper-evident cursor bound to one support query and student scope. */
export class StudentSupportCursorCodec {
  constructor(private readonly signingSecret?: string, private readonly now: () => number = () => Date.now()) {}

  public encode(row: {updatedAt:Date|string;id:string}, scope:string): string {
    const secret=this.key();
    const at=new Date(row.updatedAt).toISOString();
    if (!row.id || row.id.length > 160) throw new Error('STUDENT_SUPPORT_CURSOR_INVALID');
    const payload:CursorPayload={
      v:1,at,id:row.id,
      scope:createHmac('sha256',secret).update('scope:'+scope).digest('base64url'),
      exp:this.now()+15*60*1000,
    };
    const body=Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');
    const signature=createHmac('sha256',secret).update('student-support:v1:'+body).digest('base64url');
    return body+'.'+signature;
  }

  public decode(token:string, scope:string):{updatedAt:Date;id:string} {
    if (!token || token.length > 2048 ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error('STUDENT_SUPPORT_CURSOR_INVALID');
    const secret=this.key();
    const [body,signature]=token.split('.');
    const expected=createHmac('sha256',secret).update('student-support:v1:'+body).digest();
    let actual:Buffer;
    try {actual=Buffer.from(signature,'base64url');}
    catch {throw new Error('STUDENT_SUPPORT_CURSOR_INVALID');}
    if (actual.length !== expected.length || !timingSafeEqual(actual,expected))
      throw new Error('STUDENT_SUPPORT_CURSOR_INVALID');
    let parsed:CursorPayload;
    try {parsed=JSON.parse(Buffer.from(body,'base64url').toString('utf8')) as CursorPayload;}
    catch {throw new Error('STUDENT_SUPPORT_CURSOR_INVALID');}
    const expectedScope=createHmac('sha256',secret).update('scope:'+scope).digest('base64url');
    const date=new Date(parsed?.at);
    if (parsed?.v!==1 || parsed.scope!==expectedScope ||
        typeof parsed.id!=='string' || parsed.id.length<1 || parsed.id.length>160 ||
        !Number.isFinite(date.getTime()) || date.toISOString()!==parsed.at ||
        typeof parsed.exp!=='number' || !Number.isFinite(parsed.exp) ||
        parsed.exp <= this.now() || parsed.exp > this.now()+15*60*1000)
      throw new Error('STUDENT_SUPPORT_CURSOR_INVALID');
    return {updatedAt:date,id:parsed.id};
  }

  private key():string {
    if (!this.signingSecret || this.signingSecret.length < 32)
      throw new Error('STUDENT_SUPPORT_CURSOR_SIGNING_SECRET_REQUIRED');
    return this.signingSecret;
  }
}
