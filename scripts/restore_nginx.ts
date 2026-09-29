import fs from 'fs';
import { execSync } from 'child_process';

const configPath = '/etc/nginx/nginx.conf';
const currentConfig = fs.readFileSync(configPath, 'utf8');

// Find the location /api/ block and remove it
const regex = /\s*# Exempt API paths from the Google AI Studio auth bridge cookie check\..*?location \/api\/ \{.*?\}\s*\n\s*/s;

if (currentConfig.includes('location /api/')) {
  console.log('Found /api/ bypass in Nginx config. Removing it...');
  const restoredConfig = currentConfig.replace(regex, '\n\n        ');
  fs.writeFileSync(configPath, restoredConfig, 'utf8');
  console.log('Nginx config updated. Testing configuration syntax...');
  
  try {
    const testOutput = execSync('nginx -t', { encoding: 'utf8' });
    console.log('Nginx syntax check successful:', testOutput);
    
    console.log('Reloading Nginx configuration...');
    const reloadOutput = execSync('nginx -s reload', { encoding: 'utf8' });
    console.log('Nginx reloaded successfully:', reloadOutput);
  } catch (error: any) {
    console.error('Nginx action failed.', error.message);
    process.exit(1);
  }
} else {
  console.log('Nginx config does not have the /api/ bypass block.');
}
