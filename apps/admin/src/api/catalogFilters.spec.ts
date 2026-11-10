import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { adminApiClient } from "./client";
import { catalogFilterApi, catalogFacetContext } from "./catalogFilters";
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("coalesces selectors from the same catalog and context into one authenticated request", async () => {
  const request = vi.spyOn(adminApiClient, "request").mockResolvedValue({
    pages: [
      {
        options: [{ id: "ye", labelAr: "اليمن", labelEn: "Yemen" }],
        nextPage: null,
      },
      { options: [], nextPage: null },
    ],
  });
  const a = catalogFilterApi.options("universities", "countryReferenceId", {
      continent: "Asia",
    }),
    b = catalogFilterApi.options("universities", "regionReferenceId", {
      continent: "Asia",
    });
  await vi.advanceTimersByTimeAsync(15);
  const results = await Promise.all([a, b]);
  expect(request).toHaveBeenCalledTimes(1);
  const url = new URL(String(request.mock.calls[0][0]), "http://local");
  expect(url.pathname).toBe("/admin/catalog-filters/universities");
  expect(JSON.parse(url.searchParams.get("facets")!)).toHaveLength(2);
  expect(results[0].options[0].id).toBe("ye");
});
it("preserves parent context and rejects UI-only state from the request scope", () => {
  expect(
    catalogFacetContext(
      "majors",
      "disciplineId",
      new URLSearchParams(
        "degreeLevel=MASTER&academicFieldId=f&disciplineId=d&view=cards&page=9",
      ),
    ),
  ).toEqual({ degreeLevel: "MASTER", academicFieldId: "f" });
});
