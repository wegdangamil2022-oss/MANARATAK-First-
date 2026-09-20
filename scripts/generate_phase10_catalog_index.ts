import fs from 'fs';
import path from 'path';

/**
 * GENERATOR SCRIPT FOR SERVER-SIDE PHASE 10 CATALOG IDENTITY INDEX
 * 
 * Target Output Location:
 * - workspace/catalog-index/phase10CatalogIndex.json
 */

interface CatalogItem {
  id: string;
  displayName: string;
  nameAr: string;
  nameEn: string;
  code: string;
  degreeLevel: string;
  catalogKind: string;
  targetDomain: string;
  collegeOrField: string;
  sourceFileName: string;
  status: string;
  completenessStatus: string;
  sectionCount: number;
  sourceType: string;
  updatedAt: string;
  contentSections: any[];
}

function parseMarkdownFile(filePath: string, level: string, kind: string, prefix: string): CatalogItem[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const items: CatalogItem[] = [];
  let currentCollegeOrField = '';
  const fileName = path.basename(filePath);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      currentCollegeOrField = headerMatch[1].trim();
      continue;
    }
    
    // Match table rows: | CODE | AR | EN | ...
    const rowMatch = line.match(/^\s*\|\s*([A-Z]{3}-\d{4})\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
    if (rowMatch) {
      const code = rowMatch[1].trim();
      if (!code.startsWith(prefix)) {
        continue;
      }
      
      const nameAr = rowMatch[2].trim();
      const nameEn = rowMatch[3].trim();
      
      if (!nameAr) throw new Error(`Missing Arabic name for code ${code} at line ${i+1}`);
      if (!nameEn) throw new Error(`Missing English name for code ${code} at line ${i+1}`);
      
      items.push({
        id: `cat-${code}`,
        displayName: nameAr,
        nameAr,
        nameEn,
        code,
        degreeLevel: level,
        catalogKind: kind,
        targetDomain: "MAJORS",
        collegeOrField: currentCollegeOrField,
        sourceFileName: fileName,
        status: "READY_TO_REVIEW",
        completenessStatus: "NEEDS_REVIEW",
        sectionCount: 0,
        sourceType: "CATALOG_IDENTITY_ONLY",
        updatedAt: fs.statSync(filePath).mtime.toISOString().split('T')[0],
        contentSections: []
      });
    }
  }
  
  return items;
}

async function verifyOrGenerateIndex() {
  const catalogsDir = path.join(process.cwd(), 'workspace/phase-10-major-catalogs');
  
  const bacFile = path.join(catalogsDir, 'MANARATAK_Bachelor_Majors_By_Colleges_v1.0.md');
  const masFile = path.join(catalogsDir, 'MANARATAK_Master_Specializations_By_Academic_Fields_v1.0.md');
  const docFile = path.join(catalogsDir, 'MANARATAK_Doctoral_Specializations_By_Academic_Fields_v1.0.md');
  const felFile = path.join(catalogsDir, 'MANARATAK_Fellowships_By_Professional_Domains_v1.0.md');
  
  const items: CatalogItem[] = [];
  
  items.push(...parseMarkdownFile(bacFile, 'Bachelor', 'BACHELOR', 'MJR'));
  items.push(...parseMarkdownFile(masFile, 'Master', 'MASTER', 'MAS'));
  items.push(...parseMarkdownFile(docFile, 'Doctorate', 'DOCTORATE', 'DOC'));
  items.push(...parseMarkdownFile(felFile, 'Fellowship', 'FELLOWSHIP', 'FEL'));
  
  // Validation
  const codes = items.map(i => i.code);
  const duplicates = codes.filter((item, index) => codes.indexOf(item) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate codes found: ${duplicates.join(', ')}`);
  }
  
  const checkSequence = (prefix: string, count: number) => {
    const fileCodes = items.filter(i => i.code.startsWith(prefix)).map(i => parseInt(i.code.split('-')[1]));
    for (let i = 1; i <= count; i++) {
      if (!fileCodes.includes(i)) {
         throw new Error(`Missing numeric code in sequence: ${prefix}-${i.toString().padStart(4, '0')}`);
      }
    }
  };
  
  const bacItems = items.filter(i => i.code.startsWith('MJR')).length;
  const masItems = items.filter(i => i.code.startsWith('MAS')).length;
  const docItems = items.filter(i => i.code.startsWith('DOC')).length;
  const felItems = items.filter(i => i.code.startsWith('FEL')).length;
  
  console.log(`Parsed Bachelor: ${bacItems} items`);
  console.log(`Parsed Master: ${masItems} items`);
  console.log(`Parsed Doctorate: ${docItems} items`);
  console.log(`Parsed Fellowship: ${felItems} items`);
  
  checkSequence('MJR', bacItems);
  checkSequence('MAS', masItems);
  checkSequence('DOC', docItems);
  checkSequence('FEL', felItems);
  
  const outputPath = path.join(process.cwd(), 'workspace/catalog-index/phase10CatalogIndex.json');
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
  
  console.log(`Server-side catalog index generated at: ${outputPath}`);
  console.log(`Total catalog identities: ${items.length}`);
  const counts: Record<string, number> = { BACHELOR: 0, MASTER: 0, DOCTORATE: 0, FELLOWSHIP: 0 };
  for (const item of items) {
    const k = (item.catalogKind || item.degreeLevel || '').toUpperCase();
    if (counts[k] !== undefined) counts[k]++;
  }
  console.log('Catalog identity counts by level:', counts);
  console.log(`Index file size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

verifyOrGenerateIndex().catch(console.error);
