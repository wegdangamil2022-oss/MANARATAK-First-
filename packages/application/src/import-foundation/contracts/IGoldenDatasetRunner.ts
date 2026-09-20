import { GoldenDatasetCase } from '../dtos/ExtractionDtos';

export interface GoldenDatasetRunResult {
  caseId: string;
  passed: boolean;
  failures: string[];
}

export interface IGoldenDatasetRunner {
  runCase(testCase: GoldenDatasetCase): Promise<GoldenDatasetRunResult>;
}
