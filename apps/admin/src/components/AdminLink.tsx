import { Link, type LinkProps } from 'react-router-dom';
import { adminPathPermission } from '../navigation/AdminRoutes';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

/** Cross-section navigation uses the same permission as the guarded destination route. */
export function AdminLink(props: LinkProps) {
  const { hasPermission } = useAdminAuthorization();
  const path = typeof props.to === 'string' ? props.to : (props.to.pathname ?? '');
  const permission = adminPathPermission(path);
  const services = path.split(/[?#]/, 1)[0];
  const allowed =
    permission === 'admin:services:manage' &&
    (services === '/services' || services.startsWith('/services/'))
      ? [
          'admin:services:manage',
          'admin:services:requests:view',
          'admin:services:operations:manage',
        ].some(hasPermission)
      : !!permission && hasPermission(permission);
  return allowed ? <Link {...props} /> : null;
}
