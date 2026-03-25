import axios from 'axios';

describe('API (e2e)', () => {
  it('POST /api/auth/login returns token for demo admin', async () => {
    const res = await axios.post(`/api/auth/login`, {
      email: 'admin@demo.local',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(typeof res.data.access_token).toBe('string');
    expect(res.data.access_token.length).toBeGreaterThan(10);
    expect(res.data.user.email).toBe('admin@demo.local');
    expect(res.data.user.role).toBe('ADMIN');
  });
});
