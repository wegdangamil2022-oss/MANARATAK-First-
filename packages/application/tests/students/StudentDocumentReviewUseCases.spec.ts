import {describe,it,expect,vi} from 'vitest';
import {StudentDocumentReviewUseCases} from '../../src/students/use-cases/StudentDocumentReviewUseCases';
describe('document review reviewer identity',()=>{
  it.each(['','   '])('rejects blank reviewer before resolving document or issuing delivery (%j)',async(actor)=>{
    const repository={findDocumentReview:vi.fn()},lifecycle={requestDeliveryGrant:vi.fn()};
    const useCases=new StudentDocumentReviewUseCases(repository as unknown as ConstructorParameters<typeof StudentDocumentReviewUseCases>[0],{} as ConstructorParameters<typeof StudentDocumentReviewUseCases>[1],{} as ConstructorParameters<typeof StudentDocumentReviewUseCases>[2],lifecycle as unknown as ConstructorParameters<typeof StudentDocumentReviewUseCases>[3]);
    await expect(useCases.open('binding',actor)).rejects.toThrow('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    expect(repository.findDocumentReview).not.toHaveBeenCalled();
    expect(lifecycle.requestDeliveryGrant).not.toHaveBeenCalled();
  });
});
