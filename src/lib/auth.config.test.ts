import { describe, it } from 'node:test';
import assert from 'node:assert';
import { authConfig } from './auth.config.ts';

describe('authConfig.callbacks.authorized', () => {
  const authorized = authConfig.callbacks?.authorized;

  if (!authorized) {
    throw new Error('authorized callback is not defined');
  }

  it('should allow access to public routes for unauthenticated users', async () => {
    const request = {
      nextUrl: { pathname: '/about' },
    } as any;
    const auth = null;

    const result = await authorized({ auth, request });
    assert.strictEqual(result, true);
  });

  it('should redirect unauthenticated users from /dashboard', async () => {
    const request = {
      nextUrl: { pathname: '/dashboard/overview' },
    } as any;
    const auth = null;

    const result = await authorized({ auth, request });
    assert.strictEqual(result, false);
  });

  it('should redirect unauthenticated users from /api/protected', async () => {
    const request = {
      nextUrl: { pathname: '/api/protected/data' },
    } as any;
    const auth = null;

    const result = await authorized({ auth, request });
    assert.strictEqual(result, false);
  });

  it('should allow authenticated users to access /dashboard', async () => {
    const request = {
      nextUrl: { pathname: '/dashboard/overview' },
    } as any;
    const auth = { user: { id: '1' } } as any;

    const result = await authorized({ auth, request });
    assert.strictEqual(result, true);
  });

  it('should allow authenticated users to access /api/protected', async () => {
    const request = {
      nextUrl: { pathname: '/api/protected/data' },
    } as any;
    const auth = { user: { id: '1' } } as any;

    const result = await authorized({ auth, request });
    assert.strictEqual(result, true);
  });
});
