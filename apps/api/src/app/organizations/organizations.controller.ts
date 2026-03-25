import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles, type RequestUser } from '@task-mgmt/auth';
import { UserRole } from '@task-mgmt/data';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  /** Org hierarchy within the caller’s visibility (Owner: subtree; Admin: single org). */
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.orgs.listVisible(user);
  }
}
