export interface StudentWorkspaceIntegrationEventDto {
  /** P15 normalized protocol version; absent only for legacy persisted inbox rows. */
  eventVersion?: '1.0';
  eventId: string;
  studentReferenceId: string;
  eventType: string;
  sourceDomain: string;
  sourceReferenceId?: string | null;
  title: string;
  description?: string | null;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
  notification?: {
    category: string;
    title: string;
    message: string;
    actionUrl?: string | null;
  } | null;
}

