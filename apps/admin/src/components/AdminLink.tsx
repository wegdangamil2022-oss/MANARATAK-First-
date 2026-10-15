import { Link, type LinkProps } from 'react-router-dom';
import { adminPathPermission } from '../navigation/AdminRoutes';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

/** Cross-section navigation uses the same permission as the guarded destination route. */
export function AdminLink(props: LinkProps) {
  const { hasPermission } = useAdminAuthorization();
  const path = typeof props.to === 'string' ? props.to : props.to.pathname ?? '';
  const permission = adminPathPermission(path);
  return permission && hasPermission(permission) ? <Link {...props} /> : null;
}
