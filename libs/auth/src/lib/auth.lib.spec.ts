import { ROLES_KEY } from './constants';

describe('auth lib', () => {
  it('exports role metadata key', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
