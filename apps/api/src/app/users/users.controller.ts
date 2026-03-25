import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Roles, type RequestUser } from '@task-mgmt/auth';
import { UserRole } from '@task-mgmt/data';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { UpdateTeamPermissionsDto } from './dto/update-team-permissions.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** All roles — org members in the actor’s visible scope (assignee labels, pickers). */
  @Get()
  @Roles(UserRole.VIEWER)
  list(@CurrentUser() user: RequestUser) {
    return this.users.listOrganizationMembers(user);
  }

  /** Owner only — promote/demote between Admin and Viewer. */
  @Patch(':id/role')
  @Roles(UserRole.OWNER)
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: RequestUser
  ) {
    return this.users.updateMemberRole(id, dto, user);
  }

  /** Owner only — mock permission matrix for Team UI (clamped to target role). */
  @Patch(':id/team-permissions')
  @Roles(UserRole.OWNER)
  updateTeamPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamPermissionsDto,
    @CurrentUser() user: RequestUser
  ) {
    return this.users.updateMemberTeamPermissions(id, dto, user);
  }
}
