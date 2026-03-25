import type { TeamPermissionMap } from '@task-mgmt/data';
import { TEAM_PERMISSION_KEYS } from '@task-mgmt/data';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';

class TeamPermissionFlagsDto implements Partial<TeamPermissionMap> {
  @IsOptional()
  @IsBoolean()
  viewTasks?: boolean;

  @IsOptional()
  @IsBoolean()
  editAssignedTasks?: boolean;

  @IsOptional()
  @IsBoolean()
  createTasks?: boolean;

  @IsOptional()
  @IsBoolean()
  editAnyTask?: boolean;

  @IsOptional()
  @IsBoolean()
  deleteTasks?: boolean;

  @IsOptional()
  @IsBoolean()
  verifyTasks?: boolean;

  @IsOptional()
  @IsBoolean()
  viewAuditLog?: boolean;

  @IsOptional()
  @IsBoolean()
  manageTeam?: boolean;
}

export class UpdateTeamPermissionsDto {
  @ValidateNested()
  @Type(() => TeamPermissionFlagsDto)
  permissions!: TeamPermissionFlagsDto;
}

/** Build partial map for clamping (DTO may omit keys). */
export function teamPermissionsDtoToPartial(
  dto: UpdateTeamPermissionsDto
): Partial<TeamPermissionMap> {
  const raw = dto.permissions;
  const out: Partial<TeamPermissionMap> = {};
  for (const k of TEAM_PERMISSION_KEYS) {
    if (raw[k] !== undefined) {
      out[k] = raw[k];
    }
  }
  return out;
}
