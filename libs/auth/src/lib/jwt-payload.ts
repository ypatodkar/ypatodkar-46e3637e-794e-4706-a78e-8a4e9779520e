import type { UserRole } from '@task-mgmt/data';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: UserRole;
}

export interface RequestUser {
  userId: string;
  email: string;
  organizationId: string;
  role: UserRole;
}
