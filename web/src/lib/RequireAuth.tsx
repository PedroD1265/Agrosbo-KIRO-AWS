import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, hasRole } from '@/lib/auth';
import type { User } from '@shared/schema';

interface RequireAuthProps {
  children: ReactNode;
  roles?: Array<User['role']>;
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { user, enforcement, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        Cargando sesión…
      </div>
    );
  }

  if (enforcement === 'on' && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !hasRole(user, ...roles)) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-base font-semibold">Permiso insuficiente</p>
        <p className="text-sm text-muted-foreground">
          Necesitas alguno de estos roles: {roles.join(', ')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
