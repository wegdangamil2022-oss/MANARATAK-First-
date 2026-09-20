const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/features/admin-preview/AdminUniversitiesPreviewPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/جاهزة للاعتماد/g, 'بيانات مكتملة');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed cards 2.');
