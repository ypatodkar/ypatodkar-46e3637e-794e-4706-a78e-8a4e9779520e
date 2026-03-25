export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  VERIFIED = 'VERIFIED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskCategory {
  FEATURE = 'FEATURE',
  BUG = 'BUG',
  IMPROVEMENT = 'IMPROVEMENT',
  RESEARCH = 'RESEARCH',
  MAINTENANCE = 'MAINTENANCE',
}
