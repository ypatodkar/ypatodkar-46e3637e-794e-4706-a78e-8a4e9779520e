import { UserRole } from '@task-mgmt/data';
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
