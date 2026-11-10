import {
  ADMIN_CATALOG_CONTEXT_KEYS,
  adminCatalogFacetContext,
  type AdminCatalogName,
  type AdminCatalogFilterPage,
} from "@manaratak/domain";
import { adminApiClient } from "./client";
import type { CanonicalPickerPage } from "./canonicalPickers";

function catalogContext(
  catalog: AdminCatalogName,
  params: URLSearchParams | Record<string, string>,
): Record<string, string> {
  const source =
    params instanceof URLSearchParams ? Object.fromEntries(params) : params;
  return Object.fromEntries(
    ADMIN_CATALOG_CONTEXT_KEYS[catalog]
      .filter((key) => source[key])
      .sort()
      .map((key) => [key, source[key]]),
  );
}
export function catalogFacetContext(
  catalog: AdminCatalogName,
  facet: string,
  params: URLSearchParams | Record<string, string>,
): Record<string, string> {
  return adminCatalogFacetContext(
    catalog,
    facet,
    catalogContext(catalog, params),
  );
}
type Pending = {
  facet: string;
  search: string;
  page: number;
  resolve: (value: AdminCatalogFilterPage) => void;
  reject: (error: unknown) => void;
};
const batches = new Map<string, Pending[]>();
/** Coalesce initial selectors so a page performs one authenticated discovery read. */
function readOptions(
  catalog: AdminCatalogName,
  facet: string,
  context: Record<string, string>,
  search: string,
  page: number,
): Promise<AdminCatalogFilterPage> {
  const key = catalog + JSON.stringify(context);
  return new Promise((resolve, reject) => {
    const pending = batches.get(key);
    if (pending) {
      pending.push({ facet, search, page, resolve, reject });
      return;
    }
    const queue: Pending[] = [{ facet, search, page, resolve, reject }];
    batches.set(key, queue);
    setTimeout(() => {
      batches.delete(key);
      const run = async () => {
        for (let start = 0; start < queue.length; start += 10) {
          const items = queue.slice(start, start + 10),
            query = new URLSearchParams({ context: JSON.stringify(context) });
          if (items.length === 1) {
            const item = items[0];
            query.set("page", String(item.page));
            if (item.search) query.set("search", item.search);
            item.resolve(
              await adminApiClient.request<AdminCatalogFilterPage>(
                `/admin/catalog-filters/${catalog}/${item.facet}?${query}`,
              ),
            );
          } else {
            query.set(
              "facets",
              JSON.stringify(
                items.map(({ facet, search, page }) => ({
                  facet,
                  search,
                  page,
                })),
              ),
            );
            const result = await adminApiClient.request<{
              pages: AdminCatalogFilterPage[];
            }>(`/admin/catalog-filters/${catalog}?${query}`);
            if (result.pages.length !== items.length)
              throw Error("CATALOG_FACET_RESPONSE_INVALID");
            result.pages.forEach((value, index) => items[index].resolve(value));
          }
        }
      };
      void run().catch((error) => queue.forEach((item) => item.reject(error)));
    }, 10);
  });
}
export const catalogFilterApi = {
  async options(
    catalog: AdminCatalogName,
    facet: string,
    params: URLSearchParams | Record<string, string>,
    search = "",
    page = 1,
  ): Promise<AdminCatalogFilterPage> {
    return readOptions(
      catalog,
      facet,
      catalogContext(catalog, params),
      search.trim(),
      page,
    );
  },
  async picker(
    catalog: AdminCatalogName,
    facet: string,
    params: URLSearchParams | Record<string, string>,
    ar: boolean,
    search = "",
    page = 1,
  ): Promise<CanonicalPickerPage> {
    const result = await catalogFilterApi.options(
      catalog,
      facet,
      params,
      search,
      page,
    );
    return {
      options: result.options.map((row) => ({
        id: row.id,
        label: ar ? row.labelAr : row.labelEn,
        code: row.code,
        metadata: row.metadata,
        lifecycle: "READ_FILTER_OPTION",
      })),
      nextCursor: result.nextPage ? String(result.nextPage) : null,
    };
  },
};
