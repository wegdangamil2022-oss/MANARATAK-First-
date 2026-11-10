import express from "express";
import request from "supertest";
import { afterEach, expect, it, vi } from "vitest";
import { AdminCatalogFilterRouter } from "../../../../src/presentation/api/router/AdminCatalogFilterRouter";
import { SecurityMiddlewareFactory } from "../../../../src/presentation/security/SecurityMiddlewareFactory";
afterEach(() => vi.restoreAllMocks());
function build() {
  const options = vi.fn().mockResolvedValue({ options: [], nextPage: null });
  const guards = vi
    .spyOn(SecurityMiddlewareFactory, "createAdminPermissionGuard")
    .mockImplementation((permission) => (req, res, next) => {
      if (req.get("X-Test-Permission") !== permission) {
        res.status(403).end();
        return;
      }
      next();
    });
  const app = express();
  app.use(
    "/facets",
    AdminCatalogFilterRouter.create({
      adminCatalogFilterReadPort: { options },
    }),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => res.status(400).json({ error: String(error) }),
  );
  return { app, options, guards };
}
it("enforces the catalog permission before returning related options", async () => {
  const x = build();
  expect(
    (await request(x.app).get("/facets/universities/countryReferenceId"))
      .status,
  ).toBe(403);
  expect(x.options).not.toHaveBeenCalled();
  expect(
    (
      await request(x.app)
        .get("/facets/universities/countryReferenceId")
        .set("X-Test-Permission", "admin:universities:manage")
    ).status,
  ).toBe(200);
  expect(x.guards).toHaveBeenCalledWith("admin:universities:manage");
});
it("rejects unsupported fields, cross-catalog contexts, malformed JSON and unbounded pages", async () => {
  const x = build(),
    permission = "admin:courses:manage";
  for (const url of [
    "/facets/courses/password",
    "/facets/courses/majorId?context=bad",
    "/facets/courses/majorId?page=1001",
    "/facets/courses/majorId?context=" +
      encodeURIComponent(JSON.stringify({ roleId: "admin" })),
  ])
    expect(
      (await request(x.app).get(url).set("X-Test-Permission", permission))
        .status,
    ).toBe(400);
  expect(x.options).not.toHaveBeenCalled();
});
it("batches a bounded set of facets under one permission scope and forwards the original context", async () => {
  const x = build(),
    context = { countryReferenceId: "ye", regionReferenceId: "ibb" },
    facets = [
      { facet: "regionReferenceId", page: 1 },
      { facet: "cityReferenceId", page: 2, search: "Ibb" },
    ];
  const result = await request(x.app)
    .get("/facets/universities")
    .query({ context: JSON.stringify(context), facets: JSON.stringify(facets) })
    .set("X-Test-Permission", "admin:universities:manage");
  expect(result.status).toBe(200);
  expect(result.body.pages).toHaveLength(2);
  expect(result.headers["cache-control"]).toBe("private, no-store");
  expect(x.options).toHaveBeenNthCalledWith(2, {
    catalog: "universities",
    context,
    ...facets[1],
  });
});
