export enum DecisionResult {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED'
}

export class AccessDecision {
  constructor(
    public readonly result: DecisionResult,
    public readonly reasons: string[] = []
  ) {}

  get isGranted(): boolean {
    return this.result === DecisionResult.GRANTED;
  }

  static granted(reason?: string): AccessDecision {
    return new AccessDecision(DecisionResult.GRANTED, reason ? [reason] : []);
  }

  static denied(reason?: string): AccessDecision {
    return new AccessDecision(DecisionResult.DENIED, reason ? [reason] : []);
  }
}
