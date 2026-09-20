const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/src/features/admin-preview/AdminUniversitiesPreviewPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target1 = `  const STATS_CARDS = [
    'كل الجامعات',
    'بانتظار المراجعة',
    'بيانات ناقصة',
    'تحتاج تحققاً من المصدر',
    'جاهزة للاعتماد',
    'معتمدة',
    'منشورة',
    'مرفوضة أو مؤرشفة',
  ];`;

const replacement1 = `  const STATS_CARDS = [
    'كل الجامعات',
    'بيانات ناقصة',
    'جاهزة للاعتماد',
    'معتمدة',
    'منشورة',
    'مرفوضة أو مؤرشفة',
  ];`;

const target2 = `  function mapApiStatusToCard(status?: string, completeness?: string, verification?: string) {
    if (status === 'PUBLISHED') return 'منشورة';
    if (status === 'ARCHIVED') return 'مرفوضة أو مؤرشفة';
    if (completeness === 'incomplete') return 'بيانات ناقصة';
    if (verification === 'needs_verification') return 'تحتاج تحققاً من المصدر';
    if (status === 'READY_TO_REVIEW') return 'بانتظار المراجعة';
    if (status === 'READY_TO_PUBLISH') return 'جاهزة للاعتماد';
    if (status === 'IMPORTED') return 'بانتظار المراجعة';
    return 'بانتظار المراجعة';
  }`;

const replacement2 = `  function mapApiStatusToCard(status?: string, completeness?: string, verification?: string) {
    if (status === 'PUBLISHED') return 'منشورة';
    if (status === 'ARCHIVED') return 'مرفوضة أو مؤرشفة';
    if (completeness === 'incomplete') return 'بيانات ناقصة';
    if (status === 'READY_TO_PUBLISH') return 'جاهزة للاعتماد';
    return 'غير مصنف';
  }`;

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed cards.');
