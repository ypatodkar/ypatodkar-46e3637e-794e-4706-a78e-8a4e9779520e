import { UserRole } from './enums';

export const TEAM_PERMISSION_KEYS = [
  'viewTasks',
  'editAssignedTasks',
  'createTasks',
  'editAnyTask',
  'deleteTasks',
  'verifyTasks',
  'viewAuditLog',
  'manageTeam',
] as const;

export type TeamPermissionKey = (typeof TEAM_PERMISSION_KEYS)[number];

export type TeamPermissionMap = Record<TeamPermissionKey, boolean>;

export const TEAM_PERMISSION_LABELS: Record<TeamPermissionKey, string> = {
  viewTasks: 'View tasks in the organization',
  editAssignedTasks: 'Update assigned tasks (status & order)',
  createTasks: 'Create new tasks',
  editAnyTask: 'Edit any task (not only assigned)',
  deleteTasks: 'Delete tasks',
  verifyTasks: 'Move tasks to Verified',
  viewAuditLog: 'View audit log',
  manageTeam: 'Manage team & roles (Owner scope)',
};

export function defaultTeamPermissionsForRole(
  role: UserRole
): TeamPermissionMap {
  const off = Object.fromEntries(
    TEAM_PERMISSION_KEYS.map((k) => [k, false])
  ) as TeamPermissionMap;
  switch (role) {
    case UserRole.OWNER:
      return Object.fromEntries(
        TEAM_PERMISSION_KEYS.map((k) => [k, true])
      ) as TeamPermissionMap;
    case UserRole.ADMIN:
      return {
        ...off,
        viewTasks: true,
        editAssignedTasks: true,
        createTasks: true,
        editAnyTask: true,
        deleteTasks: true,
        verifyTasks: true,
        viewAuditLog: true,
        manageTeam: false,
      };
    case UserRole.VIEWER:
    default:
      return {
        ...off,
        viewTasks: true,
        editAssignedTasks: true,
      };
  }
}

/**
 * Caps flags to the role maximum: keys the role cannot have stay false;
 * keys allowed may be toggled on/off (undefined → use default for that role).
 */
export function clampTeamPermissions(
  role: UserRole,
  input: Partial<TeamPermissionMap> | null | undefined
): TeamPermissionMap {
  const max = defaultTeamPermissionsForRole(role);
  const out = {} as TeamPermissionMap;
  for (const key of TEAM_PERMISSION_KEYS) {
    if (!max[key]) {
      out[key] = false;
    } else {
      const v = input?.[key];
      out[key] = v === undefined ? max[key] : Boolean(v);
    }
  }
  if (role === UserRole.VIEWER && !out.viewTasks) {
    out.editAssignedTasks = false;
  }
  return out;
}

export function effectiveTeamPermissions(
  role: UserRole,
  stored: Partial<TeamPermissionMap> | null | undefined
): TeamPermissionMap {
  if (!stored || Object.keys(stored).length === 0) {
    return defaultTeamPermissionsForRole(role);
  }
  return clampTeamPermissions(role, stored);
}
