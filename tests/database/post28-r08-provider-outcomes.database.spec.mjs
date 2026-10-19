import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {FinancePlatformUseCases} from '../../packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts';
import {PrismaFinanceRepository} from '../../packages/infrastructure/src/finance-platform/PrismaFinanceRepository.ts';
import {PrismaFinanceCurrencyReferenceGateway,FinancePaymentGatewayRegistry,FinanceBankTransferGatewayRegistry} from '../../packages/infrastructure/src/finance-platform/FinanceSafetyGateways.ts';
import {EnvironmentPaymentGatewayAdapter} from '../../packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts';

const fresh=()=>randomUUID(),money=()=>({amountMinorUnits:'100',currencyCode:'USD',scale:2});
const context=()=>({actorId:'post28-r08-provider',idempotencyKey:fresh(),correlationId:fresh(),reason:'Synthetic loopback provider outcome'});
const secret=randomBytes(32).toString('hex'),apiKey=randomBytes(32).toString('hex');
const merchant='post28-synthetic-merchant',records=new Map(),requests=[];
let db,finance,server,port;
const digest=value=>createHash('sha256').update(value).digest('hex');
function captured(record,status='CAPTURED'){
  const proof={operationReference:record.reference,merchantReference:record.invalid?merchant+'-wrong':merchant,captureReference:'capture:'+record.reference,amount:record.amount,timestamp:new Date().toISOString()};
  const canonical=[record.gatewayReference,status,proof.operationReference,proof.merchantReference,proof.captureReference,proof.amount.currencyCode,String(proof.amount.scale),proof.amount.amountMinorUnits,proof.timestamp].join('\n');
  return {status,gatewayReference:record.gatewayReference,attestation:{...proof,signature:createHmac('sha256',secret).update(canonical).digest('hex')}};
}
async function stub(req,res){
  try{
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16384)throw Error('OVERSIZE');}
    const timestamp=req.headers['x-manaratak-timestamp'],nonce=req.headers['x-manaratak-nonce'],bodyHash=digest(raw);
    const canonical=['POST',req.url,timestamp,nonce,bodyHash].join('\n');
    if(req.method!=='POST'||req.headers['x-manaratak-provider-key']!==apiKey||req.headers['x-manaratak-content-sha256']!==bodyHash||req.headers['x-manaratak-signature']!==createHmac('sha256',secret).update(canonical).digest('hex'))throw Error('UNAUTHENTICATED');
    const body=JSON.parse(raw),reference=body.paymentReference??body.refundReference;
    if(!/^fin_pay_[a-f0-9]{32}$/.test(reference)&&!/^fin_ref_[a-f0-9-]{36}$/.test(reference))throw Error('REFERENCE');
    const operation=req.url.split('/').at(-1),key=req.headers['idempotency-key'];
    requests.push({reference,operation,key,signed:true});
    let record=records.get(reference),response;
    if(operation==='authorize'){
      if(!record){record={reference,gatewayReference:'synthetic:'+reference,amount:body.amount,invalid:body.paymentMethodToken==='synthetic-invalid-proof',loseCaptureReply:body.paymentMethodToken==='synthetic-lost-response',captures:0};records.set(reference,record);}
      if(body.paymentMethodToken==='synthetic-timeout')return; // Real transport deadline, no synthetic clock.
      response={status:'AUTHORIZED',gatewayReference:record.gatewayReference};
    }else if(operation==='capture'){
      if(!record||body.gatewayReference!==record.gatewayReference)throw Error('UNKNOWN_AUTHORIZATION');
      record.captures+=1;record.status='CAPTURED';
      if(record.loseCaptureReply){req.socket.destroy();return;} // Provider committed; response is deliberately lost.
      response=captured(record);
    }else if(operation==='status'){
      if(!record||record.status!=='CAPTURED')throw Error('UNKNOWN_CAPTURE');
      response=captured(record);
    }else if(operation==='refund'){
      if(!record){record={reference,gatewayReference:'synthetic:'+reference,amount:body.amount,status:'COMPLETED',submissions:0};records.set(reference,record);}
      record.submissions+=1;req.socket.destroy();return;
    }else if(operation==='refund-status'){
      if(!record||record.status!=='COMPLETED')throw Error('UNKNOWN_REFUND');response=captured(record,'COMPLETED');
    }else throw Error('UNKNOWN_OPERATION');
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(response));
  }catch{res.writeHead(400,{'Content-Type':'application/json'});res.end('{"error":"SYNTHETIC_STUB_REJECTED"}');}
}
async function invoice(){const c=context(),draft=await finance.createDraftInvoice({originDomain:'POST28_SYNTHETIC',originReferenceId:fresh(),lineItems:[{description:'Synthetic isolated provider obligation',quantity:1,unitPrice:money()}]},c);return finance.issueInvoice(draft.id,{...context(),expectedVersion:draft.version});}
async function facts(id){
  const payment=await db.financePaymentRecord.findFirstOrThrow({where:{invoiceId:id}});
  return {payment,invoice:await db.financeInvoiceRecord.findUniqueOrThrow({where:{id}}),transactions:await db.financialTransactionRecord.findMany({where:{businessReferenceType:'PAYMENT',businessReferenceId:payment.id},include:{entries:true},orderBy:{id:'asc'}}),receipts:await db.financeDocumentRecord.findMany({where:{paymentId:payment.id,type:'RECEIPT'},orderBy:{id:'asc'}}),commands:await db.financeCommandRecord.findMany({where:{targetId:{in:[payment.id,id]}},orderBy:{id:'asc'}}),audits:await db.auditRecord.findMany({where:{targetId:payment.id},orderBy:{id:'asc'}}),outbox:await db.transactionalOutboxRecord.findMany({where:{aggregateId:payment.id},orderBy:{id:'asc'}})};
}
describe('R08 signed loopback provider with persisted financial outcomes',()=>{
  beforeAll(async()=>{
    if(process.env.POST28_DATABASE_SUITE!=='r08-provider-outcomes'||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
    db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');
    await db.referenceCurrency.upsert({where:{isoCode:'USD'},update:{},create:{id:fresh(),isoCode:'USD',name:'Synthetic USD',minorUnit:2}});
    server=createServer(stub);server.listen(0,'127.0.0.1');await once(server,'listening');port=server.address().port;
    // READY applies only to this synthetic loopback stub, never a real merchant/provider approval.
    const adapter=new EnvironmentPaymentGatewayAdapter('POST28_STUB',{baseUrl:'http://127.0.0.1:'+port,apiKey,signingSecret:secret,allowInsecureHttp:true,timeoutMs:1000,maxAttempts:1,merchantReference:merchant,runtimeApproved:true});
    finance=new FinancePlatformUseCases(new PrismaFinanceRepository(db),{currencyReference:new PrismaFinanceCurrencyReferenceGateway(db),paymentGateways:new FinancePaymentGatewayRegistry([adapter]),bankTransferGateways:new FinanceBankTransferGatewayRegistry([]),fxRateProvider:{providerKey:'POST28_DISABLED',isConfigured:()=>false,fetchRate:async()=>{throw Error('EXTERNAL_FX_FORBIDDEN');}},transferFeePolicy:{policyReference:'POST28_UNUSED',basisPoints:0}});
  });
  afterAll(async()=>{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await db?.$disconnect();});
  it('reconciles a lost capture response after the natural deadline without a second charge or receipt',async()=>{
    const i=await invoice(),c=context(),input={invoiceId:i.id,amount:money(),paymentMethodToken:'synthetic-lost-response',gatewayProvider:'POST28_STUB'};
    await expect(finance.capturePayment(input,c)).rejects.toThrow('FINANCE_PROVIDER_UNAVAILABLE:payment.capture');
    const before=await facts(i.id),record=records.get(before.payment.publicId);
    expect(record.captures).toBe(1);expect(before.payment.status).toBe('AUTHORIZED');expect(before.invoice.status).toBe('ISSUED');expect(before.invoice.dueMinorUnits).toBe('100');expect(before.transactions).toHaveLength(0);expect(before.receipts).toHaveLength(0);
    await expect(finance.capturePayment(input,c)).rejects.toThrow('FINANCE_PAYMENT_OUTCOME_PENDING_RECONCILIATION');
    expect(await facts(i.id)).toEqual(before);expect(record.captures).toBe(1);
    const wait=Math.max(0,before.payment.nextCheckAt.getTime()-Date.now()+50);expect(wait).toBeLessThanOrEqual(120050);
    // Wait for the real recovery schedule; do not rewrite timestamps to force eligibility.
    await new Promise(resolve=>setTimeout(resolve,wait));
    const result=await finance.reconcileProviderStates({...context(),limit:10});expect(result.updatedPayments).toBe(1);expect(result.providerFailures).toBe(0);
    const after=await facts(i.id);expect(after.payment.status).toBe('CAPTURED');expect(after.invoice.status).toBe('PAID');expect(after.invoice.dueMinorUnits).toBe('0');expect(after.transactions).toHaveLength(1);expect(after.receipts).toHaveLength(1);
    const entries=after.transactions[0].entries;expect(entries).toHaveLength(2);expect(new Set(entries.map(e=>e.direction))).toEqual(new Set(['DEBIT','CREDIT']));expect(entries.every(e=>e.amountMinorUnits==='100'&&e.currencyCode==='USD'&&e.scale===2)).toBe(true);
    expect(after.audits.length).toBeGreaterThan(0);expect(after.outbox.length).toBeGreaterThan(0);
    expect((await finance.capturePayment(input,c)).status).toBe('CAPTURED');expect(await facts(i.id)).toEqual(after);expect(record.captures).toBe(1);
    const calls=requests.filter(r=>r.reference===record.reference);expect(calls.map(r=>r.operation)).toEqual(['authorize','capture','status']);expect(calls.every(r=>r.signed)).toBe(true);
    expect(calls.find(r=>r.operation==='capture').key).toBe('payment:'+record.reference+':capture');
  },160000);
  it('refuses signed evidence for another merchant without marking the invoice paid',async()=>{
    const i=await invoice(),c=context(),input={invoiceId:i.id,amount:money(),paymentMethodToken:'synthetic-invalid-proof',gatewayProvider:'POST28_STUB'};
    await expect(finance.capturePayment(input,c)).rejects.toThrow('FINANCE_PROVIDER_PROTOCOL_ERROR:payment.capture');
    const f=await facts(i.id);expect(f.invoice.status).toBe('ISSUED');expect(f.invoice.dueMinorUnits).toBe('100');expect(f.payment.status).toBe('AUTHORIZED');expect(f.transactions).toHaveLength(0);expect(f.receipts).toHaveLength(0);
  });
  it('recovers a lost refund response with one consumed approval and one balanced refund posting',async()=>{
    const i=await invoice(),payment=await finance.capturePayment({invoiceId:i.id,amount:money(),paymentMethodToken:'synthetic-refund-source',gatewayProvider:'POST28_STUB'},context());
    const refund=await finance.createRefund({paymentId:payment.id,amount:{...money(),amountMinorUnits:'50'},reason:'Synthetic refund recovery'},context());
    let approval=await finance.createApproval({actionType:'REFUND_EXECUTE',targetReferenceId:refund.id,requiredApprovals:2},context());
    for(const actorId of ['post28-r08-checker-a','post28-r08-checker-b'])approval=await finance.decideApproval(approval.id,'APPROVE',actorId,undefined,{...context(),actorId,expectedVersion:approval.version});
    const c={...context(),expectedVersion:refund.version};
    await expect(finance.processRefund(refund.id,approval.id,c)).rejects.toThrow('FINANCE_PROVIDER_UNAVAILABLE:payment.refund');
    const pending=await db.financeRefundRecord.findUniqueOrThrow({where:{id:refund.id}}),reserved=await db.financeApprovalRecord.findUniqueOrThrow({where:{id:approval.id}});
    expect(pending.status).toBe('UNKNOWN_OUTCOME');expect(reserved.consumedAt).not.toBeNull();
    await expect(finance.processRefund(refund.id,approval.id,c)).rejects.toThrow('not pending approval');
    expect(records.get(refund.publicId).submissions).toBe(1);
    const wait=Math.max(0,pending.nextCheckAt.getTime()-Date.now()+50);expect(wait).toBeLessThanOrEqual(60050);await new Promise(resolve=>setTimeout(resolve,wait));
    const result=await finance.reconcileProviderStates({...context(),limit:10});expect(result.updatedRefunds).toBe(1);expect(result.providerFailures).toBe(0);
    const settled=await db.financeRefundRecord.findUniqueOrThrow({where:{id:refund.id}}),ledger=await db.financialTransactionRecord.findMany({where:{businessReferenceType:'REFUND',businessReferenceId:refund.id},include:{entries:true}});
    expect(settled.status).toBe('COMPLETED');expect(ledger).toHaveLength(1);expect(ledger[0].entries).toHaveLength(2);expect(ledger[0].entries.every(e=>e.amountMinorUnits==='50')).toBe(true);expect(new Set(ledger[0].entries.map(e=>e.direction))).toEqual(new Set(['DEBIT','CREDIT']));
    expect((await db.financeInvoiceRecord.findUniqueOrThrow({where:{id:i.id}})).dueMinorUnits).toBe('50');
    const replay=await finance.processRefund(refund.id,approval.id,c);expect(replay.status).toBe('COMPLETED');expect(await db.financialTransactionRecord.findMany({where:{businessReferenceType:'REFUND',businessReferenceId:refund.id},include:{entries:true}})).toEqual(ledger);
    expect(await db.financeApprovalRecord.findUniqueOrThrow({where:{id:approval.id}})).toEqual(reserved);expect(records.get(refund.publicId).submissions).toBe(1);
  },100000);
  it('keeps a real authorization timeout pending without redispatch or a paid invoice',async()=>{
    const i=await invoice(),c=context(),input={invoiceId:i.id,amount:money(),paymentMethodToken:'synthetic-timeout',gatewayProvider:'POST28_STUB'};
    await expect(finance.capturePayment(input,c)).rejects.toThrow('FINANCE_PROVIDER_TIMEOUT:payment.authorize');
    const before=await facts(i.id);expect(before.payment.status).toBe('PENDING');expect(before.invoice.status).toBe('ISSUED');expect(before.transactions).toHaveLength(0);expect(before.receipts).toHaveLength(0);
    await expect(finance.capturePayment(input,c)).rejects.toThrow('FINANCE_PAYMENT_OUTCOME_PENDING_RECONCILIATION');expect(await facts(i.id)).toEqual(before);
    expect(requests.filter(r=>r.reference===before.payment.publicId).map(r=>r.operation)).toEqual(['authorize']);
  });
});
