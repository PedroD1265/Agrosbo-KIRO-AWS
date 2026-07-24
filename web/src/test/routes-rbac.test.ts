/**
 * Test de QA ejecutado el 2026-07-23 (Verificación de autorización de rutas de servidor)
 * Verifies that requireRole guards on sensitive write endpoints
 * correctly allow/deny based on user role when AUTH_ENFORCEMENT=on.
 */
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-with-more-than-sixteen-chars';
  process.env.AUTH_ENFORCEMENT = 'on';
});

function mockRes() {
  let _status = 200;
  let _body: unknown = null;
  return {
    status(code: number) {
      _status = code;
      return this;
    },
    json(b: unknown) {
      _body = b;
      return this;
    },
    get statusCode() {
      return _status;
    },
    get body() {
      return _body;
    },
  };
}

async function callMiddleware(
  roles: string[],
  userRole: string,
): Promise<{ nextCalled: boolean; status: number }> {
  const { requireRole } = await import('../../../api/src/auth');
  const mw = requireRole(...(roles as any));
  const req: any = { user: { id: 'u', role: userRole, active: true } };
  const res = mockRes();
  let nextCalled = false;
  mw(req, res as any, () => {
    nextCalled = true;
  });
  return { nextCalled, status: res.statusCode };
}

const INVENTORY_WRITE_ROLES = ['admin', 'tecnico', 'encargado'] as const;
const EXPENSE_WRITE_ROLES = ['admin', 'tecnico', 'encargado', 'finanzas'] as const;

describe('Inventory write endpoints — role guards', () => {
  it.each(INVENTORY_WRITE_ROLES)('%s → allowed (next called)', async (role) => {
    const r = await callMiddleware([...INVENTORY_WRITE_ROLES], role);
    expect(r.nextCalled).toBe(true);
  });

  it.each(['operario', 'finanzas'] as const)('%s → denied (403)', async (role) => {
    const r = await callMiddleware([...INVENTORY_WRITE_ROLES], role);
    expect(r.nextCalled).toBe(false);
    expect(r.status).toBe(403);
  });
});

describe('Expense/labor write endpoints — role guards', () => {
  it.each(EXPENSE_WRITE_ROLES)('%s → allowed (next called)', async (role) => {
    const r = await callMiddleware([...EXPENSE_WRITE_ROLES], role);
    expect(r.nextCalled).toBe(true);
  });

  it('operario → denied (403)', async () => {
    const r = await callMiddleware([...EXPENSE_WRITE_ROLES], 'operario');
    expect(r.nextCalled).toBe(false);
    expect(r.status).toBe(403);
  });
});

describe('Applications / harvest-lots write endpoints — role guards', () => {
  it.each(INVENTORY_WRITE_ROLES)('%s → allowed (next called)', async (role) => {
    const r = await callMiddleware([...INVENTORY_WRITE_ROLES], role);
    expect(r.nextCalled).toBe(true);
  });

  it.each(['operario', 'finanzas'] as const)('%s → denied (403)', async (role) => {
    const r = await callMiddleware([...INVENTORY_WRITE_ROLES], role);
    expect(r.nextCalled).toBe(false);
    expect(r.status).toBe(403);
  });
});

describe('User management — admin only', () => {
  it('admin → allowed', async () => {
    const r = await callMiddleware(['admin'], 'admin');
    expect(r.nextCalled).toBe(true);
  });

  it.each(['tecnico', 'encargado', 'finanzas', 'operario'] as const)(
    '%s → denied (403)',
    async (role) => {
      const r = await callMiddleware(['admin'], role);
      expect(r.nextCalled).toBe(false);
      expect(r.status).toBe(403);
    },
  );
});

describe('No user → 401 on all guarded routes', () => {
  it('returns 401 when req.user is missing', async () => {
    const { requireRole } = await import('../../../api/src/auth');
    const mw = requireRole('admin', 'tecnico', 'encargado');
    const req: any = {};
    const res = mockRes();
    let nextCalled = false;
    mw(req, res as any, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});
