import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@task-mgmt/data';
import { RolesGuard } from './roles.guard';

function ctx(user: { role: UserRole }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows any authenticated user when no roles metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(ctx({ role: UserRole.VIEWER }))).toBe(true);
  });

  it('allows Owner on routes that require Admin (inheritance)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(ctx({ role: UserRole.OWNER }))).toBe(true);
  });

  it('allows Admin on routes that require Admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(ctx({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('denies Viewer on routes that require Admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(ctx({ role: UserRole.VIEWER }))).toThrow(
      ForbiddenException
    );
  });
});
