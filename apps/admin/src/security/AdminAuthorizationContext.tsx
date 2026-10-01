import React, { createContext, useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { firstAllowedAdminPath } from '@manaratak/shared';

interface AdminAuthorizationContextValue {
  permissions: string[];
  hasPermission: (required?: string) => boolean;
}

const AdminAuthorizationContext = createContext<AdminAuthorizationContextValue>({
  permissions: [],
  hasPermission: () => false,
});

export function permissionMatches(granted: string, required: string): boolean {
  if (granted === '*' || granted === required) return true;
  if (granted.endsWith(':*')) return required.startsWith(granted.slice(0, -1));
  return false;
}

export function AdminAuthorizationProvider({ permissions, children }: { permissions: string[]; children: React.ReactNode }) {
  const normalized = Array.from(new Set(permissions.filter(Boolean)));
  const hasPermission = (required?: string) => !required || normalized.some(granted => permissionMatches(granted, required));
  return (
    <AdminAuthorizationContext.Provider value={{ permissions: normalized, hasPermission }}>
      {children}
    </AdminAuthorizationContext.Provider>
  );
}

export function useAdminAuthorization() {
  return useContext(AdminAuthorizationContext);
}

export function RequireAdminPermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission, permissions } = useAdminAuthorization();
  const location = useLocation();
  if (!hasPermission(permission)) {
    const fallbackPath = firstAllowedAdminPath(permissions);
    if (!fallbackPath) {
      return <Navigate to="/dashboard" replace state={{ deniedPermission: permission, deniedPath: location.pathname }} />;
    }
    return <Navigate to={fallbackPath} replace state={{ deniedPermission: permission, deniedPath: location.pathname }} />;
  }
  return <>{children}</>;
}
