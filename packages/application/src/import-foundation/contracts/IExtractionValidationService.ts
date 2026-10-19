import { ExtractionCandidate } from '@absheer/domain';

export interface IExtractionValidationService {
  validateCandidate(candidate: ExtractionCandidate): Promise<ExtractionCandidate>;
  validateCandidates(candidates: ExtractionCandidate[]): Promise<ExtractionCandidate[]>;
}
