import { ImportTargetDomain } from '../enums/ImportTargetDomain';

export interface CompletenessReportProps {
  targetDomain: ImportTargetDomain;
  requiredFields: string[];
  presentFields: string[];
  missingFields: string[];
  warnings: string[];
  isComplete: boolean;
}

export class CompletenessReport {
  public readonly targetDomain: ImportTargetDomain;
  public readonly requiredFields: string[];
  public readonly presentFields: string[];
  public readonly missingFields: string[];
  public readonly warnings: string[];
  public readonly isComplete: boolean;

  constructor(props: CompletenessReportProps) {
    if (!props.targetDomain) {
      throw new Error('targetDomain is required');
    }
    if (!props.requiredFields) {
      throw new Error('requiredFields is required');
    }
    if (!props.presentFields) {
      throw new Error('presentFields is required');
    }
    if (!props.missingFields) {
      throw new Error('missingFields is required');
    }
    if (!props.warnings) {
      throw new Error('warnings is required');
    }

    // Validate consistency: missingFields must be consistent with requiredFields - presentFields where possible
    const expectedMissing = props.requiredFields.filter(f => !props.presentFields.includes(f));
    for (const f of expectedMissing) {
      if (!props.missingFields.includes(f)) {
        throw new Error(`CompletenessReport inconsistency: field '${f}' is required and not present, but not listed in missingFields`);
      }
    }

    this.targetDomain = props.targetDomain;
    this.requiredFields = props.requiredFields;
    this.presentFields = props.presentFields;
    this.missingFields = props.missingFields;
    this.warnings = props.warnings;
    this.isComplete = props.isComplete;
  }
}
