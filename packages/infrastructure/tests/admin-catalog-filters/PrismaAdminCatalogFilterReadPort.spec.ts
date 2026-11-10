import { expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaAdminCatalogFilterReadPort } from "../../src/admin-catalog-filters/PrismaAdminCatalogFilterReadPort";
it("returns one category for legacy and current aliases, retaining the publication scope", async () => {
  const groupBy = vi
    .fn()
    .mockResolvedValue([
      { testCategory: "ENGLISH_LANGUAGE" },
      { testCategory: "LANGUAGE_PROFICIENCY" },
    ]);
  const port = new PrismaAdminCatalogFilterReadPort({
    internationalTest: { groupBy },
  } as unknown as PrismaClient);
  const result = await port.options({
    catalog: "international-tests",
    facet: "testCategory",
    context: {
      testCategory: "ENGLISH_LANGUAGE",
      countryIso2Code: "YE",
      status: "PUBLISHED",
    },
  });
  expect(result.options).toEqual([
    {
      id: "ENGLISH_LANGUAGE",
      labelAr: "لغة إنجليزية",
      labelEn: "English language",
    },
  ]);
  expect(groupBy).toHaveBeenCalledWith({
    by: ["testCategory"],
    where: { status: "PUBLISHED" },
  });
});
it("applies a canonical country to region discovery, removes stale child constraints, and presents readable names", async () => {
  const groupBy = vi.fn().mockResolvedValue([{ regionReferenceId: "r" }]),
    raw = vi.fn().mockResolvedValue([
      {
        id: "r",
        ar: "Al Ḩudaydah",
        en: "Al Ḩudaydah",
        code: "YE-HU",
        metadata: {},
      },
    ]);
  const port = new PrismaAdminCatalogFilterReadPort({
    university: { groupBy },
    $queryRaw: raw,
  } as unknown as PrismaClient);
  const result = await port.options({
    catalog: "universities",
    facet: "regionReferenceId",
    context: {
      countryReferenceId: "ye",
      regionReferenceId: "old",
      cityReferenceId: "old-city",
      status: "IMPORTED",
    },
  });
  expect(groupBy).toHaveBeenCalledWith({
    by: ["regionReferenceId"],
    where: { countryReferenceId: "ye", status: "IMPORTED" },
  });
  expect(result.options[0]).toMatchObject({
    id: "r",
    labelAr: "Al Hudaydah",
    labelEn: "Al Hudaydah",
  });
});
it("keeps pagination explicit when a related reference catalog contains more than one page", async () => {
  const groupBy = vi.fn().mockResolvedValue(
      Array.from({ length: 26 }, (_, i) => ({
        countryReferenceId: String(i),
      })),
    ),
    raw = vi.fn().mockResolvedValue(
      Array.from({ length: 26 }, (_, i) => ({
        id: String(i),
        ar: "دولة " + i,
        en: "Country " + i,
        code: "C" + i,
        metadata: {},
      })),
    );
  const port = new PrismaAdminCatalogFilterReadPort({
    university: { groupBy },
    $queryRaw: raw,
  } as unknown as PrismaClient);
  const result = await port.options({
    catalog: "universities",
    facet: "countryReferenceId",
    context: {},
    page: 1,
  });
  expect(result.options).toHaveLength(25);
  expect(result.nextPage).toBe(2);
});
it("rejects unsupported facets before reading any database records", async () => {
  const raw = vi.fn(),
    port = new PrismaAdminCatalogFilterReadPort({
      $queryRaw: raw,
    } as unknown as PrismaClient);
  await expect(
    port.options({ catalog: "courses", facet: "password", context: {} }),
  ).rejects.toThrow("NOT_SUPPORTED");
  expect(raw).not.toHaveBeenCalled();
});
it("uses the saved profile Arabic name when a related major root has no Arabic label", async () => {
  const majorGroups = vi.fn().mockResolvedValue([{ majorId: "m" }]),
    raw = vi.fn().mockResolvedValue([
      {
        id: "m",
        ar: "الهندسة المدنية",
        en: "Civil Engineering",
        code: "MJR-1",
        metadata: {},
      },
    ]);
  const port = new PrismaAdminCatalogFilterReadPort({
    scholarshipMajorTarget: { groupBy: majorGroups },
    scholarshipEligibilityItem: { groupBy: vi.fn().mockResolvedValue([]) },
    $queryRaw: raw,
  } as unknown as PrismaClient);
  const result = await port.options({
    catalog: "scholarships",
    facet: "majorId",
    context: { degreeLevelId: "bachelor" },
  });
  expect(result.options[0]).toMatchObject({
    id: "m",
    labelAr: "الهندسة المدنية",
  });
  expect(raw.mock.calls[0][0].text).toContain('FROM "MajorLevelProfile"');
  expect(raw.mock.calls[0][0].values).toContain("bachelor");
  expect(
    majorGroups.mock.calls[0][0].where.major.levelProfiles.some.degreeLevelId,
  ).toBe("bachelor");
});
it("translates language display and Arabic search while preserving the exact source filter value", async () => {
  const port = new PrismaAdminCatalogFilterReadPort({
    course: {
      groupBy: vi
        .fn()
        .mockResolvedValue([
          { learningLanguage: "English", originType: "EXTERNAL_LINKED_COURSE" },
        ]),
    },
    referenceLanguage: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ name: "English", nameAr: "الإنجليزية" }]),
    },
  } as unknown as PrismaClient);
  const result = await port.options({
    catalog: "courses",
    facet: "learningLanguage",
    context: {},
    search: "الإنجليزية",
  });
  expect(result.options).toEqual([
    { id: "English", labelAr: "الإنجليزية", labelEn: "English" },
  ]);
});
