import { describe, expect, it } from "vitest";
import {
  adminCatalogFacetContext,
  canonicalTestCategory,
  testCategoryFilterValues,
  readableGeographyName,
} from "../src/admin-catalog-filters";
describe("related catalog discovery rules", () => {
  it("offers parent options independently of their selected children while retaining unrelated filters", () => {
    expect(
      adminCatalogFacetContext("universities", "countryReferenceId", {
        continent: "Asia",
        countryReferenceId: "ye",
        regionReferenceId: "ibb",
        cityReferenceId: "city",
        status: "IMPORTED",
      }),
    ).toEqual({ continent: "Asia", status: "IMPORTED" });
    expect(
      adminCatalogFacetContext("majors", "academicFieldId", {
        degreeLevel: "MASTER",
        academicFieldId: "a",
        disciplineId: "b",
        taxonomyNodeId: "c",
      }),
    ).toEqual({ degreeLevel: "MASTER" });
    expect(
      adminCatalogFacetContext("majors", "disciplineId", {
        degreeLevel: "MASTER",
        academicFieldId: "a",
        disciplineId: "b",
        taxonomyNodeId: "c",
      }),
    ).toEqual({ degreeLevel: "MASTER", academicFieldId: "a" });
  });
  it("keeps a selected test category in related country options and resets category children only for category discovery", () => {
    const context = {
      testCategory: "ENGLISH_LANGUAGE",
      degreeLevelId: "master",
      countryIso2Code: "YE",
      status: "PUBLISHED",
    };
    expect(
      adminCatalogFacetContext(
        "international-tests",
        "countryIso2Code",
        context,
      ),
    ).toEqual({
      testCategory: "ENGLISH_LANGUAGE",
      degreeLevelId: "master",
      status: "PUBLISHED",
    });
    expect(
      adminCatalogFacetContext("international-tests", "testCategory", context),
    ).toEqual({ status: "PUBLISHED" });
  });
  it("combines legacy categories without rewriting identities or losing the historical filter values", () => {
    expect(canonicalTestCategory("LANGUAGE_PROFICIENCY")).toBe(
      "ENGLISH_LANGUAGE",
    );
    expect(testCategoryFilterValues("GRAD_ADMISSION")).toEqual([
      "GRADUATE_ADMISSION",
      "GRAD_ADMISSION",
    ]);
    expect(testCategoryFilterValues("NON_ENGLISH_LANGUAGE")).toEqual([
      "NON_ENGLISH_LANGUAGE",
    ]);
  });
  it("renders readable Latin geography without modifying the original text", () => {
    const original = "Al Ḩudaydah";
    expect(readableGeographyName(original)).toBe("Al Hudaydah");
    expect(original).toBe("Al Ḩudaydah");
    expect(readableGeographyName("‘Adan")).toBe("Adan");
    expect(readableGeographyName("Łódź")).toBe("Lodz");
  });
});
