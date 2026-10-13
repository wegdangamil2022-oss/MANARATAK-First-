import type { AtomicPersistenceContext, MajorImportPayload } from '@manaratak/domain';
export interface MajorImportReview {
 id:string;receiptId:string;requestHash:string;payload:MajorImportPayload;preview:{targetId:string|null;targetRevision:number|null};previewHash:string;version:number;
 status:'PREVIEWED'|'APPROVED'|'REJECTED'|'APPLIED';reviewer?:string|null;reason?:string|null;result?:unknown;
}
export interface IMajorImportReviewGateway {
 withTransaction(context:AtomicPersistenceContext):IMajorImportReviewGateway;lock():Promise<void>;
 screening(id:string):Promise<{requestHash:string;result:unknown}|null>;verifyArtifact(id:string,sha256:string):Promise<void>;
 inspect(payload:MajorImportPayload):Promise<MajorImportReview['preview']>;
 get(id:string):Promise<MajorImportReview|null>;save(plan:MajorImportReview,expectedVersion?:number):Promise<void>;
 apply(plan:MajorImportReview,context:AtomicPersistenceContext):Promise<unknown>;
 screenings(page:number):Promise<{data:Array<{id:string;createdAt:Date;result:unknown}>;total:number}>;
 list(page:number):Promise<{data:MajorImportReview[];total:number}>;
}
