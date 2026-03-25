import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type RequestUser } from '@task-mgmt/auth';
import { UserRole } from '@task-mgmt/data';

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.VIEWER]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.OWNER]: 3,
};

/** Owner ≥ Admin ≥ Viewer for route access (role inheritance). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const user = context.switchToHttp().getRequest().user as RequestUser;
    if (!user) {
      throw new ForbiddenException();
    }
    const userRank = ROLE_RANK[user.role];
    const ok = required.some((need) => userRank >= ROLE_RANK[need]);
    if (!ok) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
