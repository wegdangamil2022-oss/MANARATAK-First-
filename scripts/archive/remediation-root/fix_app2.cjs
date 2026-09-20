const fs = require('fs');
let code = fs.readFileSync('apps/api/src/app.ts', 'utf8');

// Remove the inline declaration of lazyRouter
code = code.replace(/    const lazyRouter = \(name: string\) => {[\s\S]*?};\n/, '');

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

code = code.replace(/    v1Router\.use\('\/identities'/, lazyHelper + "\n    v1Router.use('/identities'");

fs.writeFileSync('apps/api/src/app.ts', code);
