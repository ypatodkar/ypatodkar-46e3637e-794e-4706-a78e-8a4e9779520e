import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles, type RequestUser } from '@task-mgmt/auth';
import { UserRole } from '@task-mgmt/data';
import { CurrentUser } from '../common/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogController {
  constructor(private readonly audit: AuditLogService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.audit.findForVisibleOrganizations(user);
  }
}
