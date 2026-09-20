# Phase 06: Source Connector Compliance

## Source Registry Purpose
The Source Registry is the central catalog of all external data sources integrated into the platform. It tracks the origin of data, the connectors used to retrieve it, and the compliance and access rules governing each source. Its purpose is to ensure all data acquisition is traceable, compliant, and consistently managed, preventing unauthorized scraping and maintaining a clear audit trail of data provenance.

## Connector Categories
Data retrieval is categorized into specific connector types, prioritized by reliability and compliance:
- `OFFICIAL_API`: Direct integration with a first-party API provided by the source.
- `OFFICIAL_FEED`: Consumption of standardized syndication feeds (RSS, Atom) published by the source.
- `SITEMAP`: Structured discovery and retrieval using the source's official XML sitemap.
- `JSON_LD`: Extraction of structured semantic data embedded within HTML.
- `STATIC_HTML`: Standard HTTP retrieval of static web pages for parsing.
- `DOCUMENT`: Ingestion of structured files (CSV, NDJSON, PDF, XLSX) hosted by the source.
- `BROWSER_ASSISTED`: Acquisition requiring a browser environment, strictly limited to authorized human review/capture flows.
- `MANUAL_UPLOAD`: Direct user submission of data files via the platform interface.

## Source Access Classification
Every source in the registry must be assigned an access classification to dictate its acquisition strategy:
- `PUBLIC_ALLOWED`: The source is publicly accessible and its `robots.txt` permits automated retrieval.
- `PUBLIC_ROBOTS_RESTRICTED`: The source is public, but automated retrieval is restricted by `robots.txt` or terms of service.
- `AUTHORIZED_ACCOUNT`: Access requires authenticated credentials tied to an authorized account.
- `DATA_AGREEMENT`: Access is governed by a specific data sharing agreement or contract with the source provider.
- `MANUAL_ONLY`: Automated acquisition is forbidden or technically unfeasible; data must be manually uploaded.
- `BLOCKED`: The source is explicitly prohibited from being acquired or processed.

## Compliance Rules
All data acquisition must strictly adhere to the following compliance rules:
1. **Obey robots.txt**: Automated connectors must parse and respect `robots.txt` directives for the target domain.
2. **No CAPTCHA Bypass**: Systems must never attempt to bypass, solve, or circumvent CAPTCHA protections.
3. **No Paywall Bypass**: Connectors must not exploit loopholes, spoof user agents, or clear cookies to bypass paywalls.
4. **No Credential Sharing**: Login credentials must not be shared across isolated tenants or used in violation of platform terms.
5. **No ToS-Violating Scraping**: Automated retrieval must not violate the explicit Terms of Service of the target website.
6. **Protected Source Requirements**: Sources classified as protected or restricted require an `OFFICIAL_API`, a `DATA_AGREEMENT`, an `AUTHORIZED_ACCOUNT`, or must fall back to `MANUAL_UPLOAD`.

## Rate Limit Policy
All automated connectors must enforce rate limits to prevent overwhelming external servers. Default policies include:
- Respecting `Retry-After` headers.
- Implementing exponential backoff for failed requests.
- Enforcing maximum concurrent connections and requests-per-second thresholds per domain.
- Throttling extraction jobs to spread load over time.

## Conditional Request Policy
To minimize bandwidth and server load, connectors must utilize conditional HTTP requests whenever possible:
- **ETag / If-None-Match**: Store ETags from responses and send `If-None-Match` headers on subsequent requests. Skip processing on 304 Not Modified.
- **Last-Modified / If-Modified-Since**: Store `Last-Modified` timestamps and send `If-Modified-Since` headers to fetch only updated content.

## Audit Metadata
For every retrieval operation, the following audit metadata must be recorded and linked to the resulting import job:
- `sourceId`: The unique identifier of the source in the registry.
- `connectorId`: The identifier of the specific connector implementation used.
- `connectorVersion`: The version of the connector at the time of retrieval.
- `sourceUrl`: The exact URL or endpoint accessed.
- `retrievedAt`: The UTC timestamp of the retrieval.
- `httpStatus`: The HTTP status code returned by the source.
- `etag`: The ETag header value (if provided).
- `lastModified`: The Last-Modified header value (if provided).
- `contentHash`: A cryptographic hash of the retrieved payload for drift detection and deduplication.
- `accessClassification`: The access classification under which the retrieval was authorized.
