import { ImportTargetDomain } from '../enums/ImportTargetDomain';
import { MatchStrength } from '../enums/MatchStrength';
import { ConfidenceScore } from './ConfidenceScore';

export interface MatchCandidateProps {
  targetDomain: ImportTargetDomain;
  matchedRecordId?: string;
  deterministicKey?: string;
  strength: MatchStrength;
  matchReason: string;
  confidenceScore?: ConfidenceScore;
}

export class MatchCandidate {
  public readonly targetDomain: ImportTargetDomain;
  public readonly matchedRecordId?: string;
  public readonly deterministicKey?: string;
  public readonly strength: MatchStrength;
  public readonly matchReason: string;
  public readonly confidenceScore?: ConfidenceScore;

  constructor(props: MatchCandidateProps) {
    if (!props.targetDomain) {
      throw new Error('targetDomain is required');
    }
    if (!props.strength) {
      throw new Error('strength is required');
    }
    if (!props.matchReason || props.matchReason.trim() === '') {
      throw new Error('matchReason is required');
    }

    if (props.strength === MatchStrength.EXACT || props.strength === MatchStrength.STRONG) {
      if (!props.matchedRecordId && !props.deterministicKey) {
        throw new Error('matchedRecordId or deterministicKey is required for EXACT or STRONG match strength');
      }
    }

    this.targetDomain = props.targetDomain;
    this.matchedRecordId = props.matchedRecordId;
    this.deterministicKey = props.deterministicKey;
    this.strength = props.strength;
    this.matchReason = props.matchReason;
    this.confidenceScore = props.confidenceScore;
  }
}
