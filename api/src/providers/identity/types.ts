import type { UserRole } from '@agrosbo/shared/schema.js';

/**
 * Stable internal principal — independent of the authentication provider.
 * The API operates on this after the provider resolves the incoming credential.
 */
export interface IdentityPrincipal {
  /** Provider-specific subject (Cognito `sub` or local user ID). */
  subject: string;
  /** Internal user ID in the `users` table. */
  internalUserId: string;
  /** Organization the user belongs to. */
  organizationId: string;
  /** Farms the user has access to. */
  farmIds: string[];
  /** Role enum value. */
  role: UserRole;
  /** Derived permission set. */
  permissions: ReadonlySet<string>;
  /** Which provider authenticated this principal. */
  authenticationProvider: 'local-session' | 'cognito-jwt';
}

/**
 * Contract for resolving an incoming HTTP request into an IdentityPrincipal.
 * Each provider implements this; the active provider is selected by config.
 */
export interface IdentityProvider {
  /**
   * Resolve the request into a principal, or return null if unauthenticated.
   * Must not throw for missing/invalid credentials — return null instead.
   */
  resolve(req: IdentityResolveInput): Promise<IdentityPrincipal | null>;

  /** Provider identifier for logging/diagnostics. */
  readonly name: string;
}

/**
 * Minimal request-like input the provider needs (decoupled from Express).
 */
export interface IdentityResolveInput {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
}
