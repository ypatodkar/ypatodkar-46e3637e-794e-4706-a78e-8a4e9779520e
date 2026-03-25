import type { TaskCategory, TaskPriority, TaskStatus, UserRole } from './enums';
import type { TeamPermissionMap } from './team-permissions';

export interface AuthUserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

/** Organization row for building the Team tree (visible scope). */
export interface OrganizationTreeRow {
  id: string;
  name: string;
  parentOrganizationId: string | null;
}

/** Org member row for assignee picker and team management (no secrets). */
export interface OrgUserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
  /** Mock permission overlay; merged with role defaults on the server when present. */
  teamPermissionOverrides?: TeamPermissionMap | null;
}

export interface TaskView {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string | null;
  sortOrder: number;
  creatorId: string;
  assigneeId: string | null;
  organizationId: string;
  /** Present when API includes it (e.g. Owner rollup across child orgs). */
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogView {
  id: string;
  userId: string;
  organizationId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  /** Resolved from users table when present (API audit list). */
  userName?: string;
  userEmail?: string;
  /** Resolved from organizations table when present (API audit list). */
  organizationName?: string;
}
