export interface PolicyProps {
  id: string;
  name: string;
  description: string;
  ruleType: string;
  ruleConfiguration: string;
}

export class Policy {
  constructor(private readonly props: PolicyProps) {}

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get ruleType(): string { return this.props.ruleType; }
  get ruleConfiguration(): string { return this.props.ruleConfiguration; }

  updateConfiguration(ruleType: string, ruleConfiguration: string): void {
    this.props.ruleType = ruleType;
    this.props.ruleConfiguration = ruleConfiguration;
  }
}
