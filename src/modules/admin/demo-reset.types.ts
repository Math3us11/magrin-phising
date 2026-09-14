export interface DemoDataSummary {
  auditEvents: number;
  submissions: number;
}

export interface DemoResetResult {
  auditEventsDeleted: number;
  submissionsDeleted: number;
}

export interface DemoResetPersistence {
  getSummary(): Promise<DemoDataSummary>;
  clearData(): Promise<DemoResetResult>;
}

export interface DemoResetOperations {
  getSummary(): Promise<DemoDataSummary>;
  reset(input: unknown): Promise<DemoResetResult>;
}
