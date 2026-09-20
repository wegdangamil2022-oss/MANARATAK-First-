# MANARATAK Multilingual SEO Contract

## Scope

This contract governs public SEO metadata for Arabic and English.

It does not define dynamic-data translation storage or entity identity.

## Canonical URL

Every indexable public page has one locale-specific canonical URL.

Example:

```text
Arabic:
https://<public-host>/ar/universities/example

English:
https://<public-host>/en/universities/example
```

The same University identity is represented by both URLs.

## hreflang

Every localized page emits:

```text
ar
en
x-default
```

`x-default` points to the Arabic representation because Arabic is the platform default.

## Open Graph locale

```text
ar -> ar_AR
en -> en_US
```

The alternate Open Graph locale must also be emitted.

## URL identity rules

Canonical and alternate URLs:

- include locale prefix;
- use the same non-locale pathname;
- exclude search/query parameters from canonical identity;
- exclude hash fragments from canonical identity;
- never infer a different entity;
- never invent a translated slug.

## Base URL

Use:

```text
VITE_PUBLIC_WEB_URL
```

when configured.

Browser runtime may use `window.location.origin` as a safe local fallback for rendered metadata.

Sitemap generation requires an explicit absolute base URL.

## Sitemap

TR-WP04 generates only static, indexable public route entries.

Dynamic entity sitemap entries are deferred until localized public projections are complete.

Do not emit fake University/Major/Test/Scholarship slugs merely to make the sitemap appear complete.

## Non-indexable / excluded source areas

Do not add these to the static sitemap:

```text
/admin
/student/*
/login
/search
/compare
local preview routes
```

Their indexing policy can be strengthened separately if product requirements change.
