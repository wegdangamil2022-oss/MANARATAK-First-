import fs from 'fs';
import path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { MajorFilters, PaginatedMajorResult } from '@manaratak/domain';

export interface CatalogItemDto {
  id: string;
  profileId?: string;
  displayName: string;
  nameAr?: string;
  nameEn?: string;
  code: string;
  degreeLevel: string;
  catalogKind: string;
  targetDomain: string;
  collegeOrField?: string;
  academicFieldOrDiscipline?: string;
  collegeOrFaculty?: string;
  classificationCode?: string;
  sourceFileName?: string;
  status: string;
  completenessStatus?: string;
  sectionCount?: number;
  sourceType?: string;
  updatedAt?: string;
  hasDbDetails?: boolean;
}

export interface Phase10CatalogRepositoryOptions {
  catalogPath?: string;
  productionLike?: boolean;
}

export class Phase10CatalogRepository {
  private static cachedCatalog: { items: CatalogItemDto[]; mtimeMs: number } | null = null;
  private static cachedDetails: Map<
    string,
    { sections: any[]; sourceFileName: string; collegeOrFaculty?: string }
  > | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly options: Phase10CatalogRepositoryOptions = {},
  ) {}

  public loadCatalog(): CatalogItemDto[] {
    const possiblePaths = [
      ...(this.options.catalogPath ? [path.resolve(this.options.catalogPath)] : []),
      '/app/applet/workspace/catalog-index/phase10CatalogIndex.json',
    ];

    let currentDir = process.cwd();
    for (let i = 0; i < 6; i++) {
      possiblePaths.push(path.join(currentDir, 'workspace/catalog-index/phase10CatalogIndex.json'));
      const parent = path.dirname(currentDir);
      if (parent === currentDir) break;
      currentDir = parent;
    }

    if (typeof __dirname !== 'undefined') {
      let dir = __dirname;
      for (let i = 0; i < 6; i++) {
        possiblePaths.push(path.join(dir, 'workspace/catalog-index/phase10CatalogIndex.json'));
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }

    let items: CatalogItemDto[] = [];

    let currentMtimeMs = 0;

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const stats = fs.statSync(p);
          currentMtimeMs = stats.mtimeMs;

          if (
            Phase10CatalogRepository.cachedCatalog &&
            Phase10CatalogRepository.cachedCatalog.mtimeMs === currentMtimeMs
          ) {
            return Phase10CatalogRepository.cachedCatalog.items;
          }

          const content = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            items = parsed;
            break;
          }
        } catch (err) {
          console.error(`Failed reading catalog index at ${p}:`, err);
        }
      }
    }

    if (items.length > 0) {
      console.log('[Phase10CatalogRepository.loadCatalog] LOADED items count:', items.length);
      Phase10CatalogRepository.cachedCatalog = { items, mtimeMs: currentMtimeMs };
      return items;
    }

    throw new Error(
      'Phase10CatalogRepository: Failed to load complete catalog index from any known path. Will not fallback to DB-only state.',
    );
  }

  public async listCatalog(filters: MajorFilters & { catalog?: string }): Promise<PaginatedMajorResult<CatalogItemDto>> {
    const page=filters.page??1,pageSize=filters.pageSize??50;
    if(!Number.isSafeInteger(page)||page<1||page>1000||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100)throw new Error('MAJOR_CATALOG_PAGE_INVALID');
    const rawCatalog=this.loadCatalog();if(rawCatalog.length>5000)throw new Error('MAJOR_SOURCE_CATALOG_SCOPE_TOO_LARGE');
    const details=this.loadDetails();
    const source=rawCatalog.map(item=>{const detail=details.get(item.code);return detail?{...item,collegeOrField:detail.collegeOrFaculty||item.collegeOrField,collegeOrFaculty:detail.collegeOrFaculty||item.collegeOrFaculty,sectionCount:detail.sections.length,sourceType:'DETAIL_DOSSIER',sourceFileName:detail.sourceFileName}:item;});
    // Enrichment, filters, counts and paging happen in SQL. Only one bounded page leaves PostgreSQL.
    const order=Prisma.raw(({UPDATED_DESC:"item->>'updatedAt' DESC NULLS LAST",NAME_AR:"coalesce(item->>'nameAr',item->>'displayName') COLLATE \"C\" ASC",NAME_EN:"coalesce(item->>'nameEn',item->>'displayName') COLLATE \"C\" ASC",DEGREE:"item->>'degreeLevel' ASC",STATUS:"item->>'status' ASC"} as const)[filters.sort??'UPDATED_DESC']);
    const cte=Prisma.sql`WITH source AS (SELECT item,ordinality AS position FROM jsonb_array_elements(${JSON.stringify(source)}::jsonb) WITH ORDINALITY AS src(item,ordinality)),
      collisions AS (SELECT p.code FROM source JOIN "MajorLevelProfile" p ON p.code=source.item->>'code' GROUP BY p.code HAVING COUNT(*)>1),
      enriched AS (SELECT source.position,source.item || CASE WHEN p.id IS NULL THEN jsonb_build_object('hasDbDetails',false)
        ELSE jsonb_strip_nulls(jsonb_build_object('id',p."majorId",'profileId',p.id,'hasDbDetails',true,
          'displayName',COALESCE(p."localizedNameAr",p."displayName",source.item->>'displayName'),
          'nameAr',p."localizedNameAr",'nameEn',p."localizedNameEn",'status',p.status,'completenessStatus',p."completenessStatus",'updatedAt',p."updatedAt"::text)) END AS item
        FROM source LEFT JOIN "MajorLevelProfile" p ON p.code=source.item->>'code'),
      supplemental AS (SELECT 5001::bigint AS position,jsonb_strip_nulls(jsonb_build_object('id',m.id,'profileId',p.id,'hasDbDetails',true,'code',p.code,'classificationCode',p.code,'displayName',COALESCE(p."localizedNameAr",p."displayName",m."displayName"),'nameAr',p."localizedNameAr",'nameEn',p."localizedNameEn",'degreeLevel',p.level,'catalogKind',p.level,'targetDomain','MAJORS','status',p.status,'completenessStatus',p."completenessStatus",'collegeOrField',COALESCE(p."collegeContext",f."canonicalName",d."canonicalName"),'academicFieldOrDiscipline',COALESCE(f."canonicalName",d."canonicalName"),'collegeOrFaculty',p."collegeContext",'sourceType','DISCOVERY_QUEUE','updatedAt',p."updatedAt"::text)) AS item
        FROM "MajorLevelProfile" p JOIN "Major" m ON m.id=p."majorId" LEFT JOIN "AcademicTaxonomyNode" f ON f.id=COALESCE(p."academicFieldId",m."academicFieldId") LEFT JOIN "AcademicTaxonomyNode" d ON d.id=COALESCE(p."disciplineId",m."disciplineId") WHERE p.code IS NOT NULL AND NOT EXISTS(SELECT 1 FROM source WHERE source.item->>'code'=p.code)
        UNION ALL SELECT 5002::bigint,jsonb_strip_nulls(jsonb_build_object('id',m.id,'hasDbDetails',true,'code',m."publicId",'displayName',COALESCE(m."localizedNameAr",m."displayName"),'nameAr',m."localizedNameAr",'nameEn',m."localizedNameEn",'degreeLevel',m."optionalFields"->>'degreeLevel','catalogKind',m."optionalFields"->>'degreeLevel','targetDomain','MAJORS','status',m.status,'completenessStatus',m."completenessStatus",'updatedAt',m."updatedAt"::text))
        FROM "Major" m WHERE NOT EXISTS(SELECT 1 FROM "MajorLevelProfile" p WHERE p."majorId"=m.id) AND NOT EXISTS(SELECT 1 FROM source WHERE source.item->>'code'=m."publicId")),
      matching AS (SELECT * FROM (SELECT * FROM enriched UNION ALL SELECT * FROM supplemental) catalog WHERE
        (${filters.degreeLevel??null}::text IS NULL OR UPPER(COALESCE(item->>'catalogKind',item->>'degreeLevel'))=UPPER(${filters.degreeLevel??null}))
        AND (${filters.status??null}::text IS NULL OR item->>'status'=${filters.status??null})
        AND (${filters.completenessStatus??null}::text IS NULL OR item->>'completenessStatus'=${filters.completenessStatus??null})
        AND (${filters.academicFieldOrDiscipline??null}::text IS NULL OR COALESCE(item->>'collegeOrField','') ILIKE ${'%'+(filters.academicFieldOrDiscipline??'')+'%'} OR COALESCE(item->>'academicFieldOrDiscipline','') ILIKE ${'%'+(filters.academicFieldOrDiscipline??'')+'%'})
        AND (${filters.search??null}::text IS NULL OR concat_ws(' ',item->>'code',item->>'displayName',item->>'nameAr',item->>'nameEn',item->>'collegeOrField') ILIKE ${'%'+(filters.search??'')+'%'})),
      paged AS (SELECT item,row_number() OVER(ORDER BY ${order},position,item->>'code',item->>'id') AS rank FROM matching ORDER BY ${order},position,item->>'code',item->>'id' LIMIT ${pageSize} OFFSET ${(page-1)*pageSize})
      SELECT COALESCE((SELECT jsonb_agg(item ORDER BY rank) FROM paged),'[]'::jsonb) AS data,(SELECT COUNT(*)::text FROM matching) AS total,(SELECT COUNT(*)::int FROM collisions) AS "ambiguousCodes"`;
    const rows=await this.prisma.$queryRaw<Array<{data:CatalogItemDto[];total:string;ambiguousCodes:number}>>(cte);
    if(!rows[0])throw new Error('MAJOR_CATALOG_READ_UNAVAILABLE');
    if(rows[0].ambiguousCodes>0)throw new Error('MAJOR_SOURCE_CODE_CONFLICT');
    const total=Number(rows[0].total);return {data:rows[0].data,total,page,pageSize,countUnit:'SOURCE_CATALOG_ENTRY',totalPages:Math.ceil(total/pageSize)};
  }

  public maxCodeNumber(prefix: 'MJR' | 'MAS' | 'DOC' | 'FEL'): number {
    let max = 0;
    for (const item of this.loadCatalog()) {
      const match = item.code?.match(new RegExp(`^${prefix}-([0-9]+)$`));
      if (match) max = Math.max(max, Number(match[1]));
    }
    return max;
  }


  public getCatalogItem(id: string): CatalogItemDto | null {
    const code = id.replace(/^cat-/, '');
    const item = this.loadCatalog().find(
      (candidate) => candidate.id === id || candidate.code === code,
    );
    if (!item) return null;
    const detail = this.loadDetails().get(item.code);
    return {
      ...item,
      collegeOrField: detail?.collegeOrFaculty || item.collegeOrField,
      collegeOrFaculty: detail?.collegeOrFaculty || item.collegeOrFaculty,
      sectionCount: detail?.sections.length ?? item.sectionCount ?? 0,
      sourceType: detail ? 'DETAIL_DOSSIER' : item.sourceType,
      sourceFileName: detail?.sourceFileName || item.sourceFileName,
      hasDbDetails: false,
    };
  }

  public getCatalogContentSections(id: string): any[] {
    const code = id.replace(/^cat-/, '');
    return this.loadDetails().get(code)?.sections ?? [];
  }

  public getCatalogSource(id: string): any[] {
    const item = this.getCatalogItem(id);
    if (!item) return [];
    return [
      {
        sourceType: item.sourceType,
        sourceName: item.sourceFileName,
        sourceUri: `workspace/phase-10-major-detail-dossiers/${item.sourceFileName}`,
      },
    ];
  }

  public listCollegeFacets(degreeLevel?: string) {
    const target = degreeLevel?.toUpperCase();
    const groups = new Map<string, { name: string; degrees: Set<string>; majorCount: number }>();
    for (const base of this.loadCatalog()) {
      const detail = this.loadDetails().get(base.code);
      const item = detail
        ? {
            ...base,
            collegeOrField: detail.collegeOrFaculty || base.collegeOrField,
            collegeOrFaculty: detail.collegeOrFaculty || base.collegeOrFaculty,
          }
        : base;
      const degree = item.degreeLevel || item.catalogKind;
      if (target && degree.toUpperCase() !== target) continue;
      const name = item.collegeOrFaculty || item.collegeOrField || item.academicFieldOrDiscipline;
      if (!name?.trim()) continue;
      const current = groups.get(name) ?? { name, degrees: new Set<string>(), majorCount: 0 };
      current.degrees.add(degree);
      current.majorCount += 1;
      groups.set(name, current);
    }
    return [...groups.values()]
      .map((group) => ({
        name: group.name,
        supportedDegrees: [...group.degrees].sort(),
        majorCount: group.majorCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  private loadDetails() {
    if (Phase10CatalogRepository.cachedDetails) return Phase10CatalogRepository.cachedDetails;
    const result = new Map<
      string,
      { sections: any[]; sourceFileName: string; collegeOrFaculty?: string }
    >();
    const roots = this.findWorkspaceRoots()
      .map((root) => path.join(root, 'phase-10-major-detail-dossiers'))
      .filter((root) => fs.existsSync(root));
    for (const root of roots.slice(0, 1)) {
      for (const filePath of this.walkMarkdown(root)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const recordPattern = /^#\s+\d+\.\s+.+?(?=^#\s+\d+\.|(?![\s\S]))/gms;
        for (const match of content.matchAll(recordPattern)) {
          const record = match[0];
          const code = record.match(/\b(?:MJR|MAS|DOC|FEL)-\d{4}\b/)?.[0];
          if (!code) continue;
          const collegeOrFaculty = record
            .match(/^\|\s*(?:الكلية|المجال الأكاديمي|المجال المهني)\s*\|\s*([^|]+)\|/m)?.[1]
            ?.trim();
          const headings = [...record.matchAll(/^##\s+(.+)$/gm)];
          const sections = headings
            .map((heading, index) => {
              const start = (heading.index ?? 0) + heading[0].length;
              const end = headings[index + 1]?.index ?? record.length;
              return {
                id: `${code}-${index + 1}`,
                sectionKey: `${String(index + 1).padStart(2, '0')}-${heading[1].trim()}`,
                title: heading[1].replace(/^\d+(?:\.\d+)*[).:-]?\s*/, '').trim(),
                content: record.slice(start, end).trim(),
                reviewStatus: 'NEEDS_REVIEW',
              };
            })
            .filter((section) => section.content);
          result.set(code, { sections, sourceFileName: path.basename(filePath), collegeOrFaculty });
        }
      }
    }
    Phase10CatalogRepository.cachedDetails = result;
    return result;
  }

  private findWorkspaceRoots() {
    const roots: string[] = [];
    let current = process.cwd();
    for (let i = 0; i < 7; i++) {
      roots.push(path.join(current, 'workspace'));
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return roots;
  }
  private walkMarkdown(root: string): string[] {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? this.walkMarkdown(path.join(root, entry.name))
          : entry.name.toLowerCase().endsWith('.md')
            ? [path.join(root, entry.name)]
            : [],
      );
  }
}
