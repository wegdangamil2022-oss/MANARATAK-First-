export interface CreateMonitorDto {
  reference: string;
  ownerReference: string;
  definition: {
    targets: Array<{ type: string; address: string }>;
    frequencySeconds: number;
    requirements: Record<string, any>;
  };
  stateDefinition: {
    states: string[];
  };
  intent: {
    purpose: string;
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  metadata: Record<string, string>;
}

export interface UpdateMonitorDefinitionDto {
  definition: {
    targets: Array<{ type: string; address: string }>;
    frequencySeconds: number;
    requirements: Record<string, any>;
  };
  stateDefinition: {
    states: string[];
  };
  intent: {
    purpose: string;
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface MonitorResponseDto {
  reference: string;
  ownerReference: string;
  version: string;
  lifecycleState: string;
  intent: {
    purpose: string;
    criticality: string;
  };
  targets: Array<{ type: string; address: string }>;
  frequencySeconds: number;
  states: string[];
  metadata: Record<string, string>;
}
