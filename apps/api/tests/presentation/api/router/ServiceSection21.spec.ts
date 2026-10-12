import express from 'express';
import request from 'supertest';
import { describe,it,expect,vi } from 'vitest';
import { ServiceAdminRouter } from '../../../../src/presentation/api/router/ServiceAdminRouter';
function fixture(permissions:string[],error?:Error){
 const fulfillment:any={getRequest:vi.fn().mockResolvedValue({id:'req',assignedStaffId:'actor'}),listRequests:vi.fn().mockResolvedValue({data:[]}),createFinanceInvoice:vi.fn().mockResolvedValue({id:'invoice'})};
 const catalog:any={listServices:error?vi.fn().mockRejectedValue(error):vi.fn().mockResolvedValue({data:[]})};
 const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.authUserId='actor';next();});app.use('/services',ServiceAdminRouter.create({adminServiceCatalogUseCases:catalog,adminServiceFulfillmentUseCases:fulfillment,serviceOperationsUseCases:{} as any,authEvaluatorService:{evaluatePermission:vi.fn(async(_actor,p)=>({isGranted:permissions.includes(p)}))} as any}));return {app,fulfillment};
}
describe('Section 21 backend authorization',()=>{
 it('catalog-only staff cannot read request PII',async()=>{const f=fixture(['admin:services:manage']);expect((await request(f.app).get('/services/requests')).status).toBe(403);expect(f.fulfillment.listRequests).not.toHaveBeenCalled();});
 it('service fulfillment cannot create finance invoices without finance capability',async()=>{const f=fixture(['admin:services:requests:fulfill']);expect((await request(f.app).post('/services/requests/req/finance-invoice').send({amountMinorUnits:'12500',currencyCode:'USD',scale:2,expectedVersion:1})).status).toBe(403);expect(f.fulfillment.createFinanceInvoice).not.toHaveBeenCalled();});
 it('authorized intersection reaches finance handoff',async()=>{const f=fixture(['admin:services:requests:fulfill','admin:finance:invoice:manage']);expect((await request(f.app).post('/services/requests/req/finance-invoice').send({amountMinorUnits:'12500',currencyCode:'USD',scale:2,expectedVersion:1})).status).toBe(201);});
 it.each([
  { bookingId:'booking', workflowExecutionId:'workflow', artifactType:'document', assetId:'asset', reason:'reviewed delivery', unexpectedAuthority:'admin' },
  { bookingId:'booking', workflowExecutionId:'workflow', artifactType:'document', assetId:'asset', reason:12 },
  { bookingId:'booking', workflowExecutionId:'workflow', artifactType:'document', assetId:'asset' },
 ])('rejects malformed delivery envelopes before any owner command',async(body)=>{
   const f=fixture(['admin:services:manage','admin:services:requests:fulfill']);
   expect((await request(f.app).post('/services/operations/deliveries').send(body)).status).toBe(400);
 });
 it('redacts unexpected internal diagnostics',async()=>{const f=fixture(['admin:services:manage'],new Error('postgres private password=secret'));const res=await request(f.app).get('/services');expect(res.status).toBe(500);expect(JSON.stringify(res.body)).not.toContain('secret');expect(res.body.correlationId).toBeTruthy();});
});
