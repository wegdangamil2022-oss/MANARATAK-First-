WITH issues AS (
      SELECT c."id" AS "referenceId", 'COUNTRY'::text AS "entityType", c."name", c."iso2Code" AS "countryIso2Code", problem.kind
      FROM "ReferenceCountry" c
      LEFT JOIN "ReferenceCurrency" currency ON currency."isoCode"=c."defaultCurrencyCode"
      LEFT JOIN "ReferenceLanguage" language ON language."isoCode"=c."defaultLanguageCode"
      CROSS JOIN LATERAL (VALUES
        ('MISSING_CURRENCY', c."defaultCurrencyCode" IS NULL OR BTRIM(c."defaultCurrencyCode")=''),
        ('INVALID_CURRENCY', c."defaultCurrencyCode" IS NOT NULL AND BTRIM(c."defaultCurrencyCode")<>'' AND (currency."id" IS NULL OR NOT currency."isActive" OR currency."lifecycleState"<>'ACTIVE')),
        ('MISSING_LANGUAGE', c."defaultLanguageCode" IS NULL OR BTRIM(c."defaultLanguageCode")=''),
        ('INVALID_LANGUAGE', c."defaultLanguageCode" IS NOT NULL AND BTRIM(c."defaultLanguageCode")<>'' AND (language."id" IS NULL OR NOT language."isActive" OR language."lifecycleState"<>'ACTIVE'))
      ) problem(kind, present) WHERE problem.present
      UNION ALL
      SELECT c."id", 'CITY', c."name", c."countryIso2Code", problem.kind FROM "ReferenceCity" c
      LEFT JOIN "ReferenceCountry" country ON country."id"=c."countryReferenceId"
      LEFT JOIN "AdministrativeRegion" region ON region."id"=c."administrativeRegionId"
      CROSS JOIN LATERAL (VALUES
        ('MISSING_REGION', c."administrativeRegionId" IS NULL),
        ('MISSING_TIMEZONE', c."timezone" IS NULL OR BTRIM(c."timezone")=''),
        ('BROKEN_COUNTRY', country."id" IS NULL OR country."iso2Code"<>c."countryIso2Code"),
        ('BROKEN_REGION', c."administrativeRegionId" IS NOT NULL AND (region."id" IS NULL OR region."countryIso2Code"<>c."countryIso2Code" OR region."countryReferenceId" IS DISTINCT FROM c."countryReferenceId"))
      ) problem(kind, present) WHERE problem.present
      UNION ALL SELECT o."id" AS "referenceId", $1::text AS "entityType", o."name", o."iso2Code" AS "countryIso2Code", 'AMBIGUOUS_ALIAS'::text AS kind
        FROM "ReferenceCountry" o WHERE EXISTS (SELECT 1 FROM "ReferenceAliasRecord" a
          WHERE a."entityType"=$2 AND a."referenceId"=o."id" AND a."isActive"=TRUE
          AND EXISTS (SELECT 1 FROM "ReferenceAliasRecord" b JOIN "ReferenceCountry" other ON other."id"=b."referenceId"
            WHERE b."entityType"=$3 AND b."isActive"=TRUE AND b."referenceId"<>a."referenceId" AND b."normalizedAlias"=a."normalizedAlias" )) UNION ALL SELECT o."id" AS "referenceId", $4::text AS "entityType", o."name", NULL::text AS "countryIso2Code", 'AMBIGUOUS_ALIAS'::text AS kind
        FROM "ReferenceCurrency" o WHERE EXISTS (SELECT 1 FROM "ReferenceAliasRecord" a
          WHERE a."entityType"=$5 AND a."referenceId"=o."id" AND a."isActive"=TRUE
          AND EXISTS (SELECT 1 FROM "ReferenceAliasRecord" b JOIN "ReferenceCurrency" other ON other."id"=b."referenceId"
            WHERE b."entityType"=$6 AND b."isActive"=TRUE AND b."referenceId"<>a."referenceId" AND b."normalizedAlias"=a."normalizedAlias" )) UNION ALL SELECT o."id" AS "referenceId", $7::text AS "entityType", o."name", NULL::text AS "countryIso2Code", 'AMBIGUOUS_ALIAS'::text AS kind
        FROM "ReferenceLanguage" o WHERE EXISTS (SELECT 1 FROM "ReferenceAliasRecord" a
          WHERE a."entityType"=$8 AND a."referenceId"=o."id" AND a."isActive"=TRUE
          AND EXISTS (SELECT 1 FROM "ReferenceAliasRecord" b JOIN "ReferenceLanguage" other ON other."id"=b."referenceId"
            WHERE b."entityType"=$9 AND b."isActive"=TRUE AND b."referenceId"<>a."referenceId" AND b."normalizedAlias"=a."normalizedAlias" )) UNION ALL SELECT o."id" AS "referenceId", $10::text AS "entityType", o."name", o."countryIso2Code" AS "countryIso2Code", 'AMBIGUOUS_ALIAS'::text AS kind
        FROM "AdministrativeRegion" o WHERE EXISTS (SELECT 1 FROM "ReferenceAliasRecord" a
          WHERE a."entityType"=$11 AND a."referenceId"=o."id" AND a."isActive"=TRUE
          AND EXISTS (SELECT 1 FROM "ReferenceAliasRecord" b JOIN "AdministrativeRegion" other ON other."id"=b."referenceId"
            WHERE b."entityType"=$12 AND b."isActive"=TRUE AND b."referenceId"<>a."referenceId" AND b."normalizedAlias"=a."normalizedAlias" AND other."countryIso2Code"=o."countryIso2Code")) UNION ALL SELECT o."id" AS "referenceId", $13::text AS "entityType", o."name", o."countryIso2Code" AS "countryIso2Code", 'AMBIGUOUS_ALIAS'::text AS kind
        FROM "ReferenceCity" o WHERE EXISTS (SELECT 1 FROM "ReferenceAliasRecord" a
          WHERE a."entityType"=$14 AND a."referenceId"=o."id" AND a."isActive"=TRUE
          AND EXISTS (SELECT 1 FROM "ReferenceAliasRecord" b JOIN "ReferenceCity" other ON other."id"=b."referenceId"
            WHERE b."entityType"=$15 AND b."isActive"=TRUE AND b."referenceId"<>a."referenceId" AND b."normalizedAlias"=a."normalizedAlias" AND other."countryIso2Code"=o."countryIso2Code"))
    ), scoped AS (SELECT * FROM issues WHERE ($16::text IS NULL OR "countryIso2Code"=$17)),
    filtered AS (SELECT * FROM scoped WHERE ($18::text IS NULL OR kind=$19)),
    facets AS (SELECT kind, COUNT(*)::int AS total FROM scoped GROUP BY kind),
    paged AS (SELECT * FROM filtered ORDER BY kind,"entityType","referenceId" LIMIT 25 OFFSET $20)
    SELECT COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY kind,"entityType","referenceId") FROM paged),'[]'::jsonb) AS data,
      COALESCE((SELECT jsonb_object_agg(kind,total) FROM facets),'{}'::jsonb) AS counts,
      (SELECT COUNT(*)::text FROM filtered) AS total, CURRENT_TIMESTAMP AS "asOf"