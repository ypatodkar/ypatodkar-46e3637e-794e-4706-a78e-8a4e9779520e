import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@task-mgmt/data';
import { ROLES_KEY } from './constants';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
