import { TaskStatus, UserRole } from './enums';

describe('data enums', () => {
  it('matches API contract', () => {
    expect(UserRole.OWNER).toBe('OWNER');
    expect(TaskStatus.VERIFIED).toBe('VERIFIED');
  });
});
