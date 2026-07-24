import type { IdentityProvider, IdentityPrincipal, IdentityResolveInput } from './types.js';
import type { UserRole } from '@agrosbo/shared/schema.js';

/**
 * Local session identity provider — uses the existing cookie HMAC system.
 * For development and tests only; production MUST use cognito-jwt.
 *
 * This delegates to the existing auth module's decodeToken + loadUser logic
 * but wraps the result into the standard IdentityPrincipal shape.
 */
export class LocalSessionIdentityProvider implements IdentityProvider {
  readonly name = 'local-session';

  private decodeToken: (token: string) => { userId: string; expiresAt: number } | null;
  private loadUser: (userId: string) => Promise<{
    id: string;
    orgId: string;
    role: UserRole;
    active: boolean;
  } | null>;
  private cookieName: string;

  constructor(deps: {
    decodeToken: (token: string) => { userId: string; expiresAt: number } | null;
    loadUser: (userId: string) => Promise<{
      id: string;
      orgId: string;
      role: UserRole;
      active: boolean;
    } | null>;
    cookieName: string;
  }) {
    this.decodeToken = deps.decodeToken;
    this.loadUser = deps.loadUser;
    this.cookieName = deps.cookieName;
  }

  async resolve(req: IdentityResolveInput): Promise<IdentityPrincipal | null> {
    const token = this.extractCookie(req, this.cookieName);
    if (!token) return null;

    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    const user = await this.loadUser(decoded.userId);
    if (!user || !user.active) return null;

    return {
      subject: user.id,
      internalUserId: user.id,
      organizationId: user.orgId,
      farmIds: [], // TODO: populate from farm_memberships when tenancy is implemented
      role: user.role,
      permissions: this.derivePermissions(user.role),
      authenticationProvider: 'local-session',
    };
  }

  private extractCookie(req: IdentityResolveInput, name: string): string | null {
    // Try pre-parsed cookies first
    if (req.cookies?.[name]) {
      return req.cookies[name];
    }
    // Fall back to raw Cookie header parsing
    const header = req.headers['cookie'];
    const raw = typeof header === 'string' ? header : undefined;
    if (!raw) return null;
    for (const part of raw.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('='));
    }
    return null;
  }

  private derivePermissions(role: UserRole): ReadonlySet<string> {
    const ROLE_PERMISSIONS: Record<string, string[]> = {
      admin: [
        'inventory:write',
        'expenses:write',
        'applications:write',
        'harvestLots:write',
        'users:manage',
      ],
      tecnico: ['inventory:write', 'expenses:write', 'applications:write', 'harvestLots:write'],
      encargado: ['inventory:write', 'expenses:write', 'applications:write', 'harvestLots:write'],
      finanzas: ['expenses:write'],
      operario: [],
    };
    return new Set(ROLE_PERMISSIONS[role] ?? []);
  }
}
