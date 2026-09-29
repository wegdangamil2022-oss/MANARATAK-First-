import fs from 'fs';
import { execSync } from 'child_process';

const configPath = '/etc/nginx/nginx.conf';
const originalConfig = fs.readFileSync(configPath, 'utf8');

// Insert the location /api/ block before location /
const targetMarker = '# Serve the app for all other paths.';
const apiBlock = `        # Exempt API paths from the Google AI Studio auth bridge cookie check.
        # This prevents third-party cookie/iframe blocking from dropping API requests.
        location /api/ {
            proxy_pass http://localhost:3000;
            proxy_set_header Host localhost:3000;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_intercept_errors on;
            error_page 502 503 504 = /warmup.html;
            add_header Content-Security-Policy "frame-ancestors 'self' https://*.google.com https://localhost.corp.google.com:26001;";
        }

        `;

if (!originalConfig.includes('location /api/')) {
  console.log('Inserting /api/ exemption block into Nginx config...');
  const newConfig = originalConfig.replace(targetMarker, apiBlock + targetMarker);
  fs.writeFileSync(configPath, newConfig, 'utf8');
  console.log('Nginx config updated. Testing configuration syntax...');
  
  try {
    const testOutput = execSync('nginx -t', { encoding: 'utf8' });
    console.log('Nginx syntax check successful:', testOutput);
    
    console.log('Reloading Nginx configuration...');
    const reloadOutput = execSync('nginx -s reload', { encoding: 'utf8' });
    console.log('Nginx reloaded successfully:', reloadOutput);
  } catch (error: any) {
    console.error('Nginx action failed. Reverting configuration...', error.message);
    fs.writeFileSync(configPath, originalConfig, 'utf8');
    process.exit(1);
  }
} else {
  console.log('Nginx config already has /api/ location block.');
}
