import {Router,type Request,type Response,type NextFunction} from 'express';
import {z} from 'zod';
import type {CourseSourceReviewUseCases} from '@manaratak/application';
import {requireAuthenticatedPrincipal} from '../../security/AuthenticatedPrincipal';
import {courseAdminErrorResponse} from './CourseAdminErrorPolicy';
export class CourseSourceReviewRouter {
 static create({courseSourceReviewUseCases:owner}:{courseSourceReviewUseCases:CourseSourceReviewUseCases}):Router{
  const router=Router();const handle=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{Promise.resolve().then(()=>fn(req,res)).catch(next);};
  router.get('/:id',handle(async(req,res)=>{res.set('Cache-Control','no-store');res.json({data:await owner.history(req.params.id),limit:50});}));
  router.post('/:id/approve',handle(async(req,res)=>{const body=z.object({reason:z.string().trim().min(3).max(2000),evidenceUrls:z.array(z.string().url().max(2048)).min(1).max(30),validUntil:z.string().datetime().nullable().optional()}).strict().parse(req.body);const raw=req.get('If-Match');const version=raw&&/^(?:"(\d+)"|(\d+))$/.exec(raw);const expectedVersion=version?Number(version[1]??version[2]):undefined;if(!Number.isSafeInteger(expectedVersion)||expectedVersion!<1)throw new Error('COURSE_VERSION_PRECONDITION_REQUIRED');res.json(await owner.approve(req.params.id,{...body,expectedVersion:expectedVersion!},{actorId:requireAuthenticatedPrincipal(req).principalId,source:'admin-course-source-review',correlationId:req.get('X-Correlation-ID')}));}));
  router.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{if(err instanceof z.ZodError)return res.status(400).json({error:'Validation Error',details:err.issues});const result=courseAdminErrorResponse(err);return res.status(result.status).json({error:result.error});});return router;
 }
}
