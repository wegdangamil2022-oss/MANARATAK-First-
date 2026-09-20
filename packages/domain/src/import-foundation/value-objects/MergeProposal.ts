import { ImportTargetDomain } from '../enums/ImportTargetDomain';
import { MergeProposalStatus } from '../enums/MergeProposalStatus';
import { MatchCandidate } from './MatchCandidate';
import { FieldDiff } from './FieldDiff';
import { CompletenessReport } from './CompletenessReport';
import { FieldDiffType } from '../enums/FieldDiffType';

export interface MergeProposalProps {
  proposalId: string;
  handoffId: string;
  targetDomain: ImportTargetDomain;
  matchCandidate?: MatchCandidate;
  fieldDiffs: FieldDiff[];
  completenessReport: CompletenessReport;
  status: MergeProposalStatus;
  requiresReview: boolean;
  createdAt: Date;
}

export class MergeProposal {
  public readonly proposalId: string;
  public readonly handoffId: string;
  public readonly targetDomain: ImportTargetDomain;
  public readonly matchCandidate?: MatchCandidate;
  public readonly fieldDiffs: FieldDiff[];
  public readonly completenessReport: CompletenessReport;
  public readonly status: MergeProposalStatus;
  public readonly requiresReview: boolean;
  public readonly createdAt: Date;

  constructor(props: MergeProposalProps) {
    if (!props.proposalId || props.proposalId.trim() === '') {
      throw new Error('proposalId is required');
    }
    if (!props.handoffId || props.handoffId.trim() === '') {
      throw new Error('handoffId is required');
    }
    if (!props.targetDomain) {
      throw new Error('targetDomain is required');
    }
    if (!props.fieldDiffs) {
      throw new Error('fieldDiffs is required');
    }
    if (!props.completenessReport) {
      throw new Error('completenessReport is required');
    }
    if (!props.status) {
      throw new Error('status is required');
    }
    if (!props.createdAt) {
      throw new Error('createdAt is required');
    }

    const hasConflict = props.fieldDiffs.some(fd => fd.diffType === FieldDiffType.CONFLICT);
    if (hasConflict && !props.requiresReview) {
      throw new Error('requiresReview must be true if any FieldDiff has a conflict');
    }

    this.proposalId = props.proposalId;
    this.handoffId = props.handoffId;
    this.targetDomain = props.targetDomain;
    this.matchCandidate = props.matchCandidate;
    this.fieldDiffs = props.fieldDiffs;
    this.completenessReport = props.completenessReport;
    this.status = props.status;
    this.requiresReview = props.requiresReview;
    this.createdAt = props.createdAt;
  }

  public canAutoMerge(): false {
    return false;
  }

  public canAutoPublish(): false {
    return false;
  }

  public hasConflicts(): boolean {
    return this.fieldDiffs.some(fd => fd.diffType === FieldDiffType.CONFLICT);
  }
}
