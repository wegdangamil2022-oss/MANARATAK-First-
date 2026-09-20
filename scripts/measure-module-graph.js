import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function fetchUrl(urlPath) {
  return new Promise((resolve) => {
    http.get(BASE_URL + urlPath, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const contentLength = parseInt(res.headers['content-length'] || '0', 10) || Buffer.byteLength(data);
        resolve({ statusCode: res.statusCode, data, bytes: contentLength, contentType: res.headers['content-type'] });
      });
    }).on('error', (err) => {
      resolve({ statusCode: 500, data: '', bytes: 0, contentType: '' });
    });
  });
}

function extractImports(code, baseUrlPath, includeDynamic = false) {
  const imports = new Set();
  
  // Regular expressions for static import/export statements
  const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.add(resolveImport(match[1], baseUrlPath));
  }

  if (includeDynamic) {
    const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(code)) !== null) {
      imports.add(resolveImport(match[1], baseUrlPath));
    }
  }
  return Array.from(imports);
}

function resolveImport(specifier, currentPath) {
  if (specifier.startsWith('http://') || specifier.startsWith('https://')) {
    return specifier;
  }
  if (specifier.startsWith('/')) {
    return specifier;
  }
  if (specifier.startsWith('.')) {
    const dir = currentPath.substring(0, currentPath.lastIndexOf('/'));
    const parts = (dir + '/' + specifier).split('/');
    const resolved = [];
    for (const p of parts) {
      if (p === '.' || p === '') continue;
      if (p === '..') resolved.pop();
      else resolved.push(p);
    }
    return '/' + resolved.join('/');
  }
  return specifier;
}

async function measureGraph(includeDynamic = false) {
  const visited = new Set();
  const queue = ['/src/main.tsx'];
  let totalRequests = 0;
  let totalBytes = 0;
  let srcModules = 0;
  let nodeModules = 0;
  let adminPreviewModules = 0;
  let intlTestContentModules = 0;
  let rawMdRequests = 0;
  let viteClientRequests = 0;
  let duplicates = 0;

  while (queue.length > 0) {
    const urlPath = queue.shift();
    if (visited.has(urlPath)) {
      duplicates++;
      continue;
    }
    visited.add(urlPath);
    totalRequests++;

    const res = await fetchUrl(urlPath);
    totalBytes += res.bytes;

    if (urlPath.includes('/src/')) srcModules++;
    if (urlPath.includes('/node_modules/') || urlPath.includes('/.vite/')) nodeModules++;
    if (urlPath.includes('admin-preview')) adminPreviewModules++;
    if (urlPath.includes('markdown-content')) intlTestContentModules++;
    if (urlPath.includes('.md?raw') || urlPath.includes('.md?import')) rawMdRequests++;
    if (urlPath.includes('/@vite/client')) viteClientRequests++;

    if (res.contentType && (res.contentType.includes('javascript') || res.contentType.includes('typescript') || urlPath.endsWith('.tsx') || urlPath.endsWith('.ts') || urlPath.endsWith('.js'))) {
      const specifiers = extractImports(res.data, urlPath, includeDynamic);
      for (const spec of specifiers) {
        if (spec.startsWith('/') && !visited.has(spec)) {
          queue.push(spec);
        }
      }
    }
  }

  return {
    totalRequests,
    totalBytes,
    srcModules,
    nodeModules,
    adminPreviewModules,
    intlTestContentModules,
    rawMdRequests,
    viteClientRequests,
    duplicates
  };
}

async function run() {
  console.log('=== REAL BROWSER INITIAL PAGE LOAD REPORT (Eager Static Graph) ===');
  const initialLoad = await measureGraph(false);
  console.log(`Total Module Requests: ${initialLoad.totalRequests}`);
  console.log(`Total Transferred Bytes: ${initialLoad.totalBytes} bytes (${(initialLoad.totalBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`/src/... Modules: ${initialLoad.srcModules}`);
  console.log(`Node/Vite Cache Modules: ${initialLoad.nodeModules}`);
  console.log(`Admin Preview Modules: ${initialLoad.adminPreviewModules}`);
  console.log(`International Test Content Modules: ${initialLoad.intlTestContentModules}`);
  console.log(`.md?raw Requests: ${initialLoad.rawMdRequests}`);
  console.log(`/@vite/client Requests: ${initialLoad.viteClientRequests}`);

  console.log('\n=== FULL GRAPH (If All Dynamic Routes Traversed) ===');
  const fullGraph = await measureGraph(true);
  console.log(`Total Module Requests: ${fullGraph.totalRequests}`);
  console.log(`Total Transferred Bytes: ${fullGraph.totalBytes} bytes (${(fullGraph.totalBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Admin Preview Modules: ${fullGraph.adminPreviewModules}`);
  console.log(`International Test Content Modules: ${fullGraph.intlTestContentModules}`);
}

run();
