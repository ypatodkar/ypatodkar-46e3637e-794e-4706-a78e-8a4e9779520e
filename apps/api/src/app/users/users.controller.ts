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
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Admin or Owner — for assignee pickers and team visibility. */
  @Get()
  @Roles(UserRole.ADMIN)
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
}
