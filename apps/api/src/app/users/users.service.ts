import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RequestUser } from '@task-mgmt/auth';
import {
  clampTeamPermissions,
  type TeamPermissionMap,
  UserRole,
} from '@task-mgmt/data';
import { In, Repository } from 'typeorm';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User } from '../entities/user.entity';
import { OrganizationScopeService } from '../organization-scope/organization-scope.service';
import type { UpdateTeamPermissionsDto } from './dto/update-team-permissions.dto';
import { teamPermissionsDtoToPartial } from './dto/update-team-permissions.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly audit: AuditLogService,
    private readonly orgScope: OrganizationScopeService
  ) {}

  async listOrganizationMembers(actor: RequestUser): Promise<
    (Pick<
      User,
      | 'id'
      | 'name'
      | 'email'
      | 'role'
      | 'organizationId'
      | 'teamPermissionOverrides'
    > & {
      organizationName: string;
    })[]
  > {
    const scopeIds = await this.orgScope.visibleOrganizationIds(actor);
    const rows = await this.users.find({
      where: { organizationId: In(scopeIds) },
      select: [
        'id',
        'name',
        'email',
        'role',
        'organizationId',
        'teamPermissionOverrides',
      ],
      order: { name: 'ASC' },
    });
    const orgIds = [...new Set(rows.map((r) => r.organizationId))];
    const names = await this.orgScope.organizationNamesById(orgIds);
    return rows.map((r) => ({
      ...r,
      organizationName: names.get(r.organizationId) ?? '',
    }));
  }

  async updateMemberRole(
    targetUserId: string,
    dto: UpdateUserRoleDto,
    actor: RequestUser
  ): Promise<Pick<User, 'id' | 'name' | 'email' | 'role' | 'organizationId'>> {
    if (![UserRole.ADMIN, UserRole.VIEWER].includes(dto.role)) {
      throw new BadRequestException('Role must be ADMIN or VIEWER');
    }
    const scopeIds = await this.orgScope.visibleOrganizationIds(actor);
    const target = await this.users.findOne({
      where: { id: targetUserId, organizationId: In(scopeIds) },
    });
    if (!target) {
      throw new NotFoundException('User not found in your visible organizations');
    }
    if (target.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot change the Owner role here');
    }
    if (target.id === actor.userId) {
      throw new BadRequestException('Use a different flow to change your own role');
    }
    const previous = target.role;
    target.role = dto.role;
    target.teamPermissionOverrides = null;
    await this.users.save(target);
    await this.audit.record({
      userId: actor.userId,
      organizationId: target.organizationId,
      action: 'UPDATE_USER_ROLE',
      resourceType: 'USER',
      resourceId: target.id,
      result: 'SUCCESS',
      metadata: { previous, next: dto.role },
    });
    return {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      organizationId: target.organizationId,
    };
  }

  async updateMemberTeamPermissions(
    targetUserId: string,
    dto: UpdateTeamPermissionsDto,
    actor: RequestUser
  ): Promise<
    Pick<
      User,
      | 'id'
      | 'name'
      | 'email'
      | 'role'
      | 'organizationId'
      | 'teamPermissionOverrides'
    > & { organizationName: string }
  > {
    const scopeIds = await this.orgScope.visibleOrganizationIds(actor);
    const target = await this.users.findOne({
      where: { id: targetUserId, organizationId: In(scopeIds) },
    });
    if (!target) {
      throw new NotFoundException('User not found in your visible organizations');
    }
    if (target.role === UserRole.OWNER) {
      throw new ForbiddenException('Owner permission matrix is fixed');
    }
    const partial = teamPermissionsDtoToPartial(dto);
    const clamped = clampTeamPermissions(target.role, partial);
    target.teamPermissionOverrides = clamped;
    await this.users.save(target);
    await this.audit.record({
      userId: actor.userId,
      organizationId: target.organizationId,
      action: 'UPDATE_USER_TEAM_PERMISSIONS',
      resourceType: 'USER',
      resourceId: target.id,
      result: 'SUCCESS',
      metadata: { permissions: clamped },
    });
    const orgNames = await this.orgScope.organizationNamesById([
      target.organizationId,
    ]);
    return {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      organizationId: target.organizationId,
      teamPermissionOverrides: clamped,
      organizationName: orgNames.get(target.organizationId) ?? '',
    };
  }
}
