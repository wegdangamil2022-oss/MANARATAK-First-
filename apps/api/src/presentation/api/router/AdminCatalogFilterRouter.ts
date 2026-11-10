import { Router } from "express";
import { z } from "zod";
import {
  ADMIN_CATALOG_CONTEXT_KEYS,
  ADMIN_CATALOG_FACETS,
  type AdminCatalogName,
  type IAdminCatalogFilterReadPort,
} from "@manaratak/domain";
import { SecurityMiddlewareFactory } from "../../security/SecurityMiddlewareFactory.js";

export class AdminCatalogFilterRouter {
  static create({
    adminCatalogFilterReadPort,
  }: {
    adminCatalogFilterReadPort: IAdminCatalogFilterReadPort;
  }): Router {
    const router = Router();
    for (const catalog of Object.keys(
      ADMIN_CATALOG_FACETS,
    ) as AdminCatalogName[]) {
      const contextSchema = z
        .object(
          Object.fromEntries(
            ADMIN_CATALOG_CONTEXT_KEYS[catalog].map((key) => [
              key,
              z.string().trim().max(200).optional(),
            ]),
          ),
        )
        .strict();
      const querySchema = z
        .object({
          context: z.string().max(6000).default("{}"),
          search: z.string().trim().max(200).optional(),
          page: z.coerce.number().int().min(1).max(1000).default(1),
          facets: z.string().max(4000).optional(),
        })
        .strict();
      router.get(
        ["/" + catalog, "/" + catalog + "/:facet"],
        SecurityMiddlewareFactory.createAdminPermissionGuard(
          "admin:" + catalog + ":manage",
        ),
        (req, res, next) => {
          void (async () => {
            const query = querySchema.parse(req.query);
            let requested: Array<{
              facet: string;
              search?: string;
              page: number;
            }>;
            if (req.params.facet)
              requested = [
                {
                  facet: req.params.facet,
                  search: query.search,
                  page: query.page,
                },
              ];
            else {
              let facets: unknown;
              try {
                facets = JSON.parse(query.facets ?? "null");
              } catch {
                res.status(400).json({ error: "CATALOG_FACETS_INVALID" });
                return;
              }
              requested = z
                .array(
                  z
                    .object({
                      facet: z.string().max(100),
                      search: z.string().max(200).optional(),
                      page: z.number().int().min(1).max(1000),
                    })
                    .strict(),
                )
                .min(1)
                .max(10)
                .parse(facets);
            }
            if (
              requested.some(
                (item) =>
                  !(
                    ADMIN_CATALOG_FACETS[catalog] as readonly string[]
                  ).includes(item.facet),
              )
            ) {
              res.status(400).json({ error: "CATALOG_FACET_NOT_SUPPORTED" });
              return;
            }
            let raw: unknown;
            try {
              raw = JSON.parse(query.context);
            } catch {
              res.status(400).json({ error: "CATALOG_CONTEXT_INVALID" });
              return;
            }
            const parsed = contextSchema.parse(raw),
              context = Object.fromEntries(
                Object.entries(parsed).filter(
                  (entry): entry is [string, string] =>
                    typeof entry[1] === "string" && entry[1] !== "",
                ),
              );
            for (const key of [
              "staleOnly",
              "isPubliclyVisible",
              "hasEnrollments",
            ])
              if (context[key] && !["true", "false"].includes(context[key])) {
                res.status(400).json({ error: "CATALOG_BOOLEAN_INVALID" });
                return;
              }
            for (const key of [
              "deadlineFrom",
              "deadlineTo",
              "cohortFrom",
              "cohortTo",
            ])
              if (context[key] && !Number.isFinite(Date.parse(context[key]))) {
                res.status(400).json({ error: "CATALOG_DATE_INVALID" });
                return;
              }
            res.setHeader("Cache-Control", "private, no-store");
            const pages = await Promise.all(
              requested.map((item) =>
                adminCatalogFilterReadPort.options({
                  catalog,
                  context,
                  ...item,
                }),
              ),
            );
            res.json(req.params.facet ? pages[0] : { pages });
          })().catch(next);
        },
      );
    }
    return router;
  }
}
