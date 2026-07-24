import { useAuth } from "@/lib/auth";
import type { User } from "@shared/schema";

export type Permission =
  | "inventory:write"
  | "expenses:write"
  | "applications:write"
  | "harvestLots:write"
  | "users:manage";

const ROLE_PERMISSIONS: Record<User["role"], ReadonlySet<Permission>> = {
  admin: new Set<Permission>([
    "inventory:write",
    "expenses:write",
    "applications:write",
    "harvestLots:write",
    "users:manage",
  ]),
  tecnico: new Set<Permission>([
    "inventory:write",
    "expenses:write",
    "applications:write",
    "harvestLots:write",
  ]),
  encargado: new Set<Permission>([
    "inventory:write",
    "expenses:write",
    "applications:write",
    "harvestLots:write",
  ]),
  finanzas: new Set<Permission>(["expenses:write"]),
  operario: new Set<Permission>([]),
};

export function can(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.has(permission) ?? false;
}

export function usePermissions(): { can: (p: Permission) => boolean } {
  const { user, bypass } = useAuth();
  if (bypass) {
    return { can: () => true };
  }
  return { can: (p: Permission) => can(user, p) };
}
