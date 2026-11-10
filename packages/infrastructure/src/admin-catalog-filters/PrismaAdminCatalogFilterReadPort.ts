import { Prisma, PrismaClient } from "@prisma/client";
import {
  ADMIN_CATALOG_FACETS,
  adminCatalogFacetContext,
  canonicalTestCategory,
  readableGeographyName,
  type AdminCatalogFilterRequest,
  type AdminCatalogFilterOption,
  type AdminCatalogFilterPage,
  type IAdminCatalogFilterReadPort,
  type MajorFilters,
  type UniversityFilters,
  type ScholarshipFilters,
  type InternationalTestFilters,
  type CourseFilters,
} from "@manaratak/domain";
import { PrismaUniversityRepository } from "../universities/PrismaUniversityRepository";
import { PrismaMajorRepository } from "../majors/PrismaMajorRepository";
import { PrismaScholarshipRepository } from "../scholarships/PrismaScholarshipRepository";
import { PrismaInternationalTestRepository } from "../international-tests/PrismaInternationalTestRepository";
import { PrismaCourseRepository } from "../courses/PrismaCourseRepository";

type ReferenceKind =
  | "country"
  | "region"
  | "city"
  | "language"
  | "currency"
  | "degree"
  | "taxonomy"
  | "major"
  | "university"
  | "test"
  | "provider";
const sources: Record<ReferenceKind, Prisma.Sql> = {
  country: Prisma.sql`SELECT id,"nameAr" AS ar,name AS en,"iso2Code" AS code,jsonb_build_object('region',region) AS metadata FROM "ReferenceCountry"`,
  region: Prisma.sql`SELECT id,name AS ar,name AS en,"regionCode" AS code,jsonb_build_object('countryIso2Code',"countryIso2Code") AS metadata FROM "AdministrativeRegion"`,
  city: Prisma.sql`SELECT id,"nameAr" AS ar,name AS en,NULL::text AS code,'{}'::jsonb AS metadata FROM "ReferenceCity"`,
  language: Prisma.sql`SELECT id,"nameAr" AS ar,name AS en,"isoCode" AS code,'{}'::jsonb AS metadata FROM "ReferenceLanguage"`,
  currency: Prisma.sql`SELECT id,"nameAr" AS ar,name AS en,"isoCode" AS code,'{}'::jsonb AS metadata FROM "ReferenceCurrency"`,
  degree: Prisma.sql`SELECT id,"nameAr" AS ar,"nameEn" AS en,"canonicalCode" AS code,'{}'::jsonb AS metadata FROM "DegreeLevel"`,
  taxonomy: Prisma.sql`SELECT id,"localizedNames"->>'ar' AS ar,COALESCE("localizedNames"->>'en',"canonicalName") AS en,"canonicalCode" AS code,jsonb_build_object('nodeType',"nodeType",'standardType',"standardType") AS metadata FROM "AcademicTaxonomyNode"`,
  major: Prisma.sql`SELECT id,COALESCE("localizedNameAr","displayName") AS ar,COALESCE("localizedNameEn","displayName") AS en,"publicId" AS code,'{}'::jsonb AS metadata FROM "Major"`,
  university: Prisma.sql`SELECT id,"displayName" AS ar,"displayName" AS en,"publicId" AS code,'{}'::jsonb AS metadata FROM "University"`,
  test: Prisma.sql`SELECT id,COALESCE("localizedNameAr","displayName","canonicalName") AS ar,COALESCE("localizedNameEn","displayName","canonicalName") AS en,"publicId" AS code,'{}'::jsonb AS metadata FROM "InternationalTest"`,
  provider: Prisma.sql`SELECT id,"displayName" AS ar,"displayName" AS en,NULL::text AS code,'{}'::jsonb AS metadata FROM "ExternalCourseProvider"`,
};
const categories: Record<string, [string, string]> = {
  ENGLISH_LANGUAGE: ["لغة إنجليزية", "English language"],
  NON_ENGLISH_LANGUAGE: ["لغة غير إنجليزية", "Non-English language"],
  GENERAL_UNDERGRADUATE_ADMISSION: [
    "قبول جامعي عام",
    "Undergraduate admission",
  ],
  GRADUATE_ADMISSION: ["قبول دراسات عليا", "Graduate admission"],
  NATIONAL_INTERNATIONAL_ADMISSION: [
    "قبول وطني/دولي",
    "National / international admission",
  ],
  SPECIALIZED_ADMISSION: ["قبول تخصصي", "Specialized admission"],
  PROFESSIONAL_LICENSING_CERTIFICATION: [
    "ترخيص/اعتماد مهني",
    "Professional licensing",
  ],
  ACADEMIC_PLACEMENT: ["تحديد مستوى أكاديمي", "Academic placement"],
  OTHER: ["أخرى", "Other"],
};
const continents: Record<string, string> = {
  Africa: "أفريقيا",
  Asia: "آسيا",
  Europe: "أوروبا",
  "North America": "أمريكا الشمالية",
  "South America": "أمريكا الجنوبية",
  Oceania: "أوقيانوسيا",
  UNSPECIFIED: "غير محددة في المرجع",
};
const dedupe = (values: Array<string | null | undefined>) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

/** Uses exactly the list predicates; reads identifiers and labels, never source dossiers. */
export class PrismaAdminCatalogFilterReadPort implements IAdminCatalogFilterReadPort {
  constructor(private readonly prisma: PrismaClient) {}
  async options(
    request: AdminCatalogFilterRequest,
  ): Promise<AdminCatalogFilterPage> {
    const { catalog, facet } = request;
    if (!(ADMIN_CATALOG_FACETS[catalog] as readonly string[]).includes(facet))
      throw Error("CATALOG_FACET_NOT_SUPPORTED");
    if (
      !Number.isInteger(request.page ?? 1) ||
      (request.page ?? 1) < 1 ||
      (request.page ?? 1) > 1000
    )
      throw Error("CATALOG_FACET_PAGE_INVALID");
    const context = adminCatalogFacetContext(catalog, facet, request.context);
    if (catalog === "universities") return this.universities(request, context);
    if (catalog === "majors") return this.majors(request, context);
    if (catalog === "international-tests") return this.tests(request, context);
    if (catalog === "courses") return this.courses(request, context);
    return this.scholarships(request, context);
  }
  private page(
    request: AdminCatalogFilterRequest,
    options: AdminCatalogFilterOption[],
  ): AdminCatalogFilterPage {
    const normalize = (value: string) =>
      readableGeographyName(value).replace(/['-]/gu, "").toLocaleLowerCase();
    const search = normalize(request.search ?? "");
    const filtered = options
      .filter(
        (row) =>
          !search ||
          [row.labelAr, row.labelEn, row.code].some(
            (label) => label && normalize(label).includes(search),
          ),
      )
      .sort(
        (a, b) =>
          a.labelAr.localeCompare(b.labelAr, "ar") || a.id.localeCompare(b.id),
      );
    const start = ((request.page ?? 1) - 1) * 25;
    return {
      options: filtered.slice(start, start + 25),
      nextPage: start + 25 < filtered.length ? (request.page ?? 1) + 1 : null,
    };
  }
  private async references(
    request: AdminCatalogFilterRequest,
    kind: ReferenceKind,
    ids: string[],
  ): Promise<AdminCatalogFilterPage> {
    if (!ids.length) return { options: [], nextPage: null };
    const source =
      kind === "major" ? this.majorLabels(request, dedupe(ids)) : sources[kind];
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        ar: string | null;
        en: string;
        code: string | null;
        metadata: Record<string, string | null>;
      }>
    >(Prisma.sql`
      SELECT r.* FROM (${source}) r WHERE r.id = ANY(${dedupe(ids)}::text[])
      AND (${kind === "region" ? "" : (request.search ?? "")}='' OR strpos(lower(concat_ws(' ',r.ar,r.en,r.code)),lower(${request.search ?? ""}))>0)
      ORDER BY COALESCE(NULLIF(r.ar,''),r.en) COLLATE "C",r.id LIMIT ${kind === "region" ? ids.length + 1 : 26} OFFSET ${kind === "region" ? 0 : ((request.page ?? 1) - 1) * 25}`);
    const options = rows.map((row) => {
      let labelEn = readableGeographyName(row.en),
        labelAr = row.ar || row.en;
      if (kind === "region") {
        labelEn =
          row.code === "YE-SA"
            ? "Sana'a City (Capital Secretariat)"
            : row.code === "YE-SN"
              ? "Sana'a Governorate"
              : readableGeographyName(row.en);
        labelAr = labelEn;
      } else if (kind !== "city") labelEn = row.en;
      return {
        id: row.id,
        labelAr,
        labelEn,
        code: row.code ?? undefined,
        metadata: row.metadata,
      };
    });
    return kind === "region"
      ? this.page(request, options)
      : {
          options: options.slice(0, 25),
          nextPage: rows.length > 25 ? (request.page ?? 1) + 1 : null,
        };
  }
  private majorLabels(
    request: AdminCatalogFilterRequest,
    ids: string[],
  ): Prisma.Sql {
    return Prisma.sql`WITH profiles AS MATERIALIZED (
      SELECT p.*,d."nameAr" AS "degreeAr",d."nameEn" AS "degreeEn"
      FROM "MajorLevelProfile" p LEFT JOIN "DegreeLevel" d ON d.id=p."degreeLevelId"
      WHERE p."majorId" = ANY(${ids}::text[])
        AND (${request.context.degreeLevelId ?? null}::text IS NULL OR p."degreeLevelId"=${request.context.degreeLevelId ?? null})
        AND (${request.context.degreeLevel ?? null}::text IS NULL OR p.level=${request.context.degreeLevel ?? null})
    ), names AS (
      SELECT DISTINCT ON ("majorId") "majorId","localizedNameAr","localizedNameEn" FROM profiles
      ORDER BY "majorId",(NULLIF("localizedNameAr",'') IS NULL),CASE level WHEN 'BACHELOR' THEN 0 WHEN 'MASTER' THEN 1 ELSE 2 END,id
    ), degrees AS (
      SELECT "majorId",string_agg(DISTINCT "degreeAr",' / ' ORDER BY "degreeAr") AS ar,
        string_agg(DISTINCT "degreeEn",' / ' ORDER BY "degreeEn") AS en FROM profiles GROUP BY "majorId"
    ), labels AS (
      SELECT m.id,COALESCE(NULLIF(m."localizedNameAr",''),NULLIF(n."localizedNameAr",''),m."displayName") AS ar,
        COALESCE(NULLIF(m."localizedNameEn",''),NULLIF(n."localizedNameEn",''),m."displayName") AS en,
        m."publicId" AS code,d.ar AS "degreeAr",d.en AS "degreeEn"
      FROM "Major" m LEFT JOIN names n ON n."majorId"=m.id LEFT JOIN degrees d ON d."majorId"=m.id
      WHERE m.id = ANY(${ids}::text[])
    ) SELECT id,
      ar || CASE WHEN count(*) OVER (PARTITION BY ar)>1 THEN COALESCE(' — '||"degreeAr",'') ELSE '' END ||
        CASE WHEN count(*) OVER (PARTITION BY ar,"degreeAr")>1 THEN ' ('||code||')' ELSE '' END AS ar,
      en || CASE WHEN count(*) OVER (PARTITION BY en)>1 THEN COALESCE(' — '||"degreeEn",'') ELSE '' END ||
        CASE WHEN count(*) OVER (PARTITION BY en,"degreeEn")>1 THEN ' ('||code||')' ELSE '' END AS en,
      code,jsonb_build_object('degreeAr',"degreeAr",'degreeEn',"degreeEn") AS metadata FROM labels`;
  }
  private async ancestors(ids: string[], nodeType: string): Promise<string[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      WITH RECURSIVE nodes(id) AS (SELECT id FROM "AcademicTaxonomyNode" WHERE id = ANY(${ids}::text[]) AND status='ACTIVE'
        UNION SELECT e."parentNodeId" FROM "AcademicTaxonomyEdge" e JOIN nodes n ON n.id=e."childNodeId")
      SELECT n.id FROM nodes x JOIN "AcademicTaxonomyNode" n ON n.id=x.id WHERE n."nodeType"=${nodeType} AND n.status='ACTIVE'`);
    return rows.map((row) => row.id);
  }
  private async universities(
    request: AdminCatalogFilterRequest,
    context: Record<string, string>,
  ) {
    const where = new PrismaUniversityRepository(this.prisma).adminFilterWhere(
      context as UniversityFilters,
    );
    const fields = {
      continent: "countryReferenceId",
      countryReferenceId: "countryReferenceId",
      regionReferenceId: "regionReferenceId",
      cityReferenceId: "cityReferenceId",
      institutionType: "institutionType",
    } as const;
    const field = fields[request.facet as keyof typeof fields];
    if (
      ["regionReferenceId", "cityReferenceId"].includes(request.facet) &&
      !context.countryReferenceId
    )
      return { options: [], nextPage: null };
    const groups = await this.prisma.university.groupBy({ by: [field], where });
    const ids = dedupe(groups.map((group) => group[field]));
    if (request.facet === "institutionType")
      return this.page(
        request,
        ids.map((id) => ({
          id,
          labelAr:
            (
              {
                UNIVERSITY: "جامعة",
                COLLEGE: "كلية",
                INSTITUTE: "معهد",
                ACADEMY: "أكاديمية",
                OTHER: "أخرى",
              } as Record<string, string>
            )[id] ?? id,
          labelEn: id,
        })),
      );
    if (request.facet === "continent") {
      const countries = await this.prisma.referenceCountry.findMany({
        where: { id: { in: ids } },
        select: { region: true },
      });
      const regions = dedupe(countries.map((row) => row.region));
      if (
        countries.some((row) => !row.region) ||
        groups.some((row) => !row.countryReferenceId)
      )
        regions.push("UNSPECIFIED");
      return this.page(
        request,
        dedupe(regions).map((id) => ({
          id,
          labelAr: continents[id] ?? id,
          labelEn: id,
        })),
      );
    }
    return this.references(
      request,
      request.facet === "countryReferenceId"
        ? "country"
        : request.facet === "regionReferenceId"
          ? "region"
          : "city",
      ids,
    );
  }
  private async majors(
    request: AdminCatalogFilterRequest,
    context: Record<string, string>,
  ) {
    const query = new PrismaMajorRepository(this.prisma).adminFilterRows(
      context as MajorFilters,
    );
    const field =
      request.facet === "academicFieldId"
        ? Prisma.sql`r."fieldId"`
        : request.facet === "disciplineId"
          ? Prisma.sql`r."disciplineId"`
          : Prisma.sql`c."taxonomyNodeId"`;
    const joins =
      request.facet === "taxonomyNodeId"
        ? Prisma.sql`JOIN "MajorClassificationMapping" c ON c."majorId"=r."majorId" AND (c."profileId"=r."profileId" OR c."profileId" IS NULL)`
        : Prisma.empty;
    const kind =
      request.facet === "academicFieldId"
        ? "ACADEMIC_FIELD"
        : request.facet === "disciplineId"
          ? "DISCIPLINE"
          : "PROGRAM_AREA";
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`${query} SELECT DISTINCT n.id FROM filtered r ${joins} JOIN "AcademicTaxonomyNode" n ON n.id=${field} WHERE n."nodeType"=${kind} AND n.status='ACTIVE'`,
    );
    return this.references(
      request,
      "taxonomy",
      rows.map((row) => row.id),
    );
  }
  private async tests(
    request: AdminCatalogFilterRequest,
    context: Record<string, string>,
  ) {
    const filters = {
      ...context,
      ...(context.staleOnly ? { staleOnly: context.staleOnly === "true" } : {}),
      ...(context.isPubliclyVisible
        ? { isPubliclyVisible: context.isPubliclyVisible === "true" }
        : {}),
    } as InternationalTestFilters;
    const where = await new PrismaInternationalTestRepository(
      this.prisma,
    ).adminFilterWhere(filters);
    if (request.facet === "testCategory") {
      const groups = await this.prisma.internationalTest.groupBy({
        by: ["testCategory"],
        where,
      });
      return this.page(
        request,
        dedupe(
          groups.map(
            (row) =>
              row.testCategory && canonicalTestCategory(row.testCategory),
          ),
        ).map((id) => ({
          id,
          labelAr: categories[id]?.[0] ?? id,
          labelEn: categories[id]?.[1] ?? id,
        })),
      );
    }
    const tests = await this.prisma.internationalTest.findMany({
      where,
      select: { id: true },
      take: 50001,
    });
    if (tests.length > 50000) throw Error("CATALOG_FACET_SCOPE_TOO_LARGE");
    const ids = tests.map((row) => row.id);
    if (!ids.length) return { options: [], nextPage: null };
    if (request.facet === "providerName") {
      const rows = await this.prisma.internationalTest.findMany({
        where,
        select: {
          providerName: true,
          provider: { select: { displayName: true } },
        },
      });
      return this.page(
        request,
        dedupe(
          rows.map((row) => row.provider?.displayName || row.providerName),
        ).map((id) => ({ id, labelAr: id, labelEn: id })),
      );
    }
    if (request.facet === "countryIso2Code") {
      const rows = await this.prisma.$queryRaw<
        Array<{ id: string }>
      >(Prisma.sql`
        SELECT DISTINCT "canonicalReferenceId" AS id FROM "InternationalTestCountryRelationship" WHERE "testId" = ANY(${ids}::text[]) AND "canonicalReferenceId" IS NOT NULL
        UNION SELECT c.id FROM "InternationalTestAvailability" a JOIN "ReferenceCountry" c ON a."availableCountryIds" @> jsonb_build_array(c.id) WHERE a."testId" = ANY(${ids}::text[])`);
      const result = await this.references(
        request,
        "country",
        rows.map((row) => row.id),
      );
      return {
        ...result,
        options: result.options.map((row) => ({
          ...row,
          id: row.code ?? row.id,
        })),
      };
    }
    if (request.facet === "languageReferenceId") {
      const rows =
        await this.prisma.internationalTestLanguageRelationship.groupBy({
          by: ["canonicalReferenceId"],
          where: { testId: { in: ids }, canonicalReferenceId: { not: null } },
        });
      return this.references(
        request,
        "language",
        dedupe(rows.map((row) => row.canonicalReferenceId)),
      );
    }
    if (request.facet === "degreeLevelId") {
      const rows =
        await this.prisma.internationalTestDegreeRelationship.groupBy({
          by: ["degreeLevelId"],
          where: { testId: { in: ids }, degreeLevelId: { not: null } },
        });
      return this.references(
        request,
        "degree",
        dedupe(rows.map((row) => row.degreeLevelId)),
      );
    }
    const nodes =
      await this.prisma.internationalTestAcademicTaxonomyRelationship.groupBy({
        by: ["taxonomyNodeId"],
        where: { testId: { in: ids } },
      });
    return this.references(
      request,
      "taxonomy",
      await this.ancestors(
        nodes.map((row) => row.taxonomyNodeId),
        "ACADEMIC_FIELD",
      ),
    );
  }
  private async courses(
    request: AdminCatalogFilterRequest,
    context: Record<string, string>,
  ) {
    const filters = {
      ...context,
      ...(context.hasEnrollments
        ? { hasEnrollments: context.hasEnrollments === "true" }
        : {}),
    } as CourseFilters;
    const where = await new PrismaCourseRepository(
      this.prisma,
    ).adminFilterWhere(filters);
    if (request.facet === "taxonomyNodeId") {
      const nodes = await this.prisma.courseAcademicTaxonomyLink.groupBy({
        by: ["taxonomyNodeId"],
        where: {
          course: { is: where },
          reviewState: "APPROVED",
          taxonomyNode: { status: "ACTIVE" },
        },
      });
      return this.references(
        request,
        "taxonomy",
        await this.ancestors(
          nodes.map((row) => row.taxonomyNodeId),
          "ACADEMIC_FIELD",
        ),
      );
    }
    if (request.facet === "majorId") {
      const rows = await this.prisma.courseMajorProjection.groupBy({
        by: ["majorId"],
        where: { course: { is: where }, projectionState: "APPROVED" },
      });
      return this.references(
        request,
        "major",
        dedupe(rows.map((row) => row.majorId)),
      );
    }
    if (request.facet === "externalProviderId") {
      const rows = await this.prisma.course.groupBy({
        by: ["externalProviderId"],
        where,
      });
      return this.references(
        request,
        "provider",
        dedupe(rows.map((row) => row.externalProviderId)),
      );
    }
    const rows = await this.prisma.course.groupBy({
      by:
        request.facet === "learningLanguage"
          ? ["learningLanguage", "learningLanguageRaw", "originType"]
          : ["difficultyLevel", "studyLevelRaw", "originType"],
      where,
    });
    const values = dedupe(
      rows.map((row) =>
        request.facet === "learningLanguage"
          ? row.learningLanguage?.trim() ||
            (row.originType === "EXTERNAL_LINKED_COURSE"
              ? row.learningLanguageRaw?.trim()
              : null)
          : row.difficultyLevel?.trim() ||
            (row.originType === "EXTERNAL_LINKED_COURSE"
              ? row.studyLevelRaw?.trim()
              : null),
      ),
    );
    if (request.facet === "learningLanguage") {
      const languages = await this.prisma.referenceLanguage.findMany({
        select: { name: true, nameAr: true },
      });
      const names: Record<string, string> = {
        "multiple languages": "عدة لغات",
        "several languages": "عدة لغات",
        multilingual: "متعددة اللغات",
        "not officially specified": "غير محددة رسميًا",
        "not specified": "غير محددة",
        unknown: "غير معلومة",
        "sign language": "لغة الإشارة",
        "bahasa malaysia": "الملايوية",
        "bahasa indonesia": "الإندونيسية",
        bahasa: "باهاسا",
        bangla: "البنغالية",
        klingon: "الكلينغونية",
        "chinese simplified": "الصينية المبسطة",
        "simplified chinese": "الصينية المبسطة",
        "chinese traditional": "الصينية التقليدية",
        "traditional chinese": "الصينية التقليدية",
        "brazilian portuguese": "البرتغالية البرازيلية",
        português: "البرتغالية",
        italiano: "الإيطالية",
        español: "الإسبانية",
        "english uk": "الإنجليزية البريطانية",
        "target language": "اللغة المستهدفة",
        subtitles: "ترجمة مرئية",
        interface: "واجهة",
        available: "متاحة",
        materials: "المواد",
        languages: "لغات",
        versions: "نسخ",
        also: "أيضًا",
        via: "عبر",
        channel: "قناة",
        brazil: "البرازيل",
        brazilian: "البرازيلية",
        mandarin: "المندرينية",
        eu: "الاتحاد الأوروبي",
      };
      for (const language of languages)
        if (language.nameAr)
          names[language.name.toLocaleLowerCase()] = language.nameAr;
      const terms = Object.keys(names)
        .sort((a, b) => b.length - a.length)
        .map((term) => term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"));
      const pattern = new RegExp("\\b(?:" + terms.join("|") + ")\\b", "giu");
      return this.page(
        request,
        values.map((id) => ({
          id,
          labelAr: id.replace(
            pattern,
            (term) => names[term.toLocaleLowerCase()] ?? term,
          ),
          labelEn: id,
        })),
      );
    }
    return this.page(
      request,
      values.map((id) => ({ id, labelAr: id, labelEn: id })),
    );
  }
  private async scholarships(
    request: AdminCatalogFilterRequest,
    context: Record<string, string>,
  ) {
    const filters = {
      ...context,
      ...(context.deadlineFrom
        ? { deadlineFrom: new Date(context.deadlineFrom) }
        : {}),
      ...(context.deadlineTo
        ? { deadlineTo: new Date(context.deadlineTo) }
        : {}),
    } as ScholarshipFilters;
    const where = await new PrismaScholarshipRepository(
      this.prisma,
    ).adminFilterWhere(filters);
    if (
      request.facet === "countryReferenceId" ||
      request.facet === "studyLanguageReferenceId"
    ) {
      const field =
        request.facet === "countryReferenceId"
          ? "countryReferenceId"
          : "studyLanguageReferenceId";
      const rows = await this.prisma.scholarship.groupBy({
        by: [field],
        where,
      });
      return this.references(
        request,
        field === "countryReferenceId" ? "country" : "language",
        dedupe(rows.map((row) => row[field])),
      );
    }
    if (request.facet === "degreeLevelId") {
      const rows = await this.prisma.scholarshipDegreeTarget.groupBy({
        by: ["degreeLevelId"],
        where: { scholarship: { is: where } },
      });
      return this.references(
        request,
        "degree",
        dedupe(rows.map((row) => row.degreeLevelId)),
      );
    }
    if (request.facet === "currencyReferenceId") {
      const rows = await this.prisma.scholarshipBenefit.groupBy({
        by: ["currencyReferenceId"],
        where: { scholarship: { is: where } },
      });
      return this.references(
        request,
        "currency",
        dedupe(rows.map((row) => row.currencyReferenceId)),
      );
    }
    if (request.facet === "universityId") {
      const rows = await this.prisma.scholarshipUniversityLink.groupBy({
        by: ["universityId"],
        where: { scholarship: { is: where } },
      });
      return this.references(
        request,
        "university",
        dedupe(rows.map((row) => row.universityId)),
      );
    }
    if (request.facet === "majorId") {
      const [targets, eligibility] = await Promise.all([
        this.prisma.scholarshipMajorTarget.groupBy({
          by: ["majorId"],
          where: {
            scholarship: { is: where },
            ...(context.degreeLevelId
              ? {
                  major: {
                    levelProfiles: {
                      some: { degreeLevelId: context.degreeLevelId },
                    },
                  },
                }
              : {}),
          },
        }),
        this.prisma.scholarshipEligibilityItem.groupBy({
          by: ["majorId"],
          where: {
            scholarship: { is: where },
            ...(context.degreeLevelId
              ? {
                  major: {
                    levelProfiles: {
                      some: { degreeLevelId: context.degreeLevelId },
                    },
                  },
                }
              : {}),
          },
        }),
      ]);
      return this.references(
        request,
        "major",
        dedupe([...targets, ...eligibility].map((row) => row.majorId)),
      );
    }
    const owners = await this.prisma.scholarship.findMany({
      where,
      select: { id: true },
      take: 50001,
    });
    if (owners.length > 50000) throw Error("CATALOG_FACET_SCOPE_TOO_LARGE");
    const ids = owners.map((row) => row.id);
    if (!ids.length) return { options: [], nextPage: null };
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "internationalTestId" AS id FROM "ScholarshipEligibilityItem" WHERE "scholarshipId" = ANY(${ids}::text[]) AND "internationalTestId" IS NOT NULL
      UNION SELECT "internationalTestId" FROM "ScholarshipRequiredDocument" WHERE "scholarshipId" = ANY(${ids}::text[]) AND "internationalTestId" IS NOT NULL
      UNION SELECT jsonb_array_elements_text(COALESCE("optionalFields"#>'{metadata,sourceRelationships,testIds}','[]'::jsonb)) FROM "Scholarship" WHERE id = ANY(${ids}::text[])`);
    return this.references(request, "test", dedupe(rows.map((row) => row.id)));
  }
}
