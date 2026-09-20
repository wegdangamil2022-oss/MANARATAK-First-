const html = `<!doctype html>
  <head>
    <script type="module">import { injectIntoGlobalHook } from "/@react-refresh";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;</script>
    <script type="module" src="/@vite/client"></script>
  </head>
</html>`;
console.log(html.replace(/<script type="module" src="\/@vite\/client"><\/script>/, ''));
