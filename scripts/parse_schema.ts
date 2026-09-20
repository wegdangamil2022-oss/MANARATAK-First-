import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'packages/infrastructure/prisma/schema.prisma');
const schema = fs.readFileSync(filePath, 'utf-8');

const modelRegex = /model\s+(\w+)\s+{([\s\S]*?)}/g;
let match;
console.log('--- MODELS RELATED TO INTERNATIONAL TESTS ---');
while ((match = modelRegex.exec(schema)) !== null) {
  const modelName = match[1];
  const body = match[2];
  if (modelName.toLowerCase().includes('test')) {
    console.log(`\nModel: ${modelName}`);
    const fields = body.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//') && !line.startsWith('@@'));
    fields.forEach(f => {
      if (f.includes('@id') || f.includes('relation') || f.includes('Slug') || f.includes('slug') || f.includes('Category') || f.includes('category')) {
        console.log(`  ${f}`);
      }
    });
  }
}
