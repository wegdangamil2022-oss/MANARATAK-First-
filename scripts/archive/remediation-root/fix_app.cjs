const fs = require('fs');
let code = fs.readFileSync('apps/api/src/app.ts', 'utf8');

const lazyHelper = `
    const lazyRouter = (name: string) => {
      let router: any = null;
      return (req: any, res: any, next: any) => {
        if (!router) {
          router = container.resolve(name);
        }
        return router(req, res, next);
      };
    };
`;

code = code.replace(/const requireAdminPermission = SecurityMiddlewareFactory.createAdminPermissionGuard;/, lazyHelper + '\n    const requireAdminPermission = SecurityMiddlewareFactory.createAdminPermissionGuard;');
code = code.replace(/container\.resolve\('([a-zA-Z0-9_]+)'\)/g, "lazyRouter('$1')");

fs.writeFileSync('apps/api/src/app.ts', code);
