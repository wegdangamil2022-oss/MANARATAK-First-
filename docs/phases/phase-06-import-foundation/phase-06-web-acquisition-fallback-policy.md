# Phase 06: Web Acquisition Fallback Policy

## Preferred Acquisition Order
When attempting to acquire data from a source, connectors must follow this strict priority order, falling back to the next method only if the current one is unavailable or fails:

1. **Official API**: Direct integration with first-party endpoints. (Most reliable, best compliance).
2. **Official Feed**: Syndicated feeds like RSS or Atom.
3. **Sitemap**: Official XML sitemaps for discovery.
4. **JSON-LD**: Embedded semantic structured data.
5. **Static HTML**: Parsing standard static HTTP responses.
6. **Document / Manual Upload**: Ingestion of static files (CSV, PDF) or user-provided uploads.
7. **Browser-Assisted Review**: Authorized human-in-the-loop capture (Lowest priority, highest friction).

## Fallback Rules
- Connectors must automatically attempt the highest-priority acquisition method configured for a source.
- If a method returns HTTP 4xx (unauthorized, forbidden, not found) or 5xx (server error) persistently, or if the expected data structures are entirely missing, the system must degrade to the next configured fallback.
- Fallbacks must be logged to alert administrators of degrading source reliability.

## Handling Protected Sources
When encountering protections such as CAPTCHAs, paywalls, `robots.txt` restrictions, or required logins:
- **CAPTCHA**: Immediately abort the automated request. Do NOT attempt to solve or bypass.
- **Paywall**: Stop processing at the paywall boundary. Do NOT spoof headers or clear cookies to bypass.
- **Robots Restricted**: If `robots.txt` disallows the path, the automated connector must not request it.
- **Login Required**: Abort unless an `AUTHORIZED_ACCOUNT` is explicitly configured and permitted by ToS.

## Explicit Prohibition on Bypassing Protections
The system and its connectors are **strictly forbidden** from bypassing or circumventing any security, anti-bot, or access control mechanisms. All acquisition must be transparent and compliant with standard web protocols and the source's terms.

## Browser-Assisted Mode
Browser-assisted mode is strictly defined as a review and capture mechanism involving **authorized human action only**.
- It is NOT a stealth scraping tool.
- It must not run autonomously in the background to bypass bot detection.
- It is used for manual extraction, debugging, or handling complex authenticated workflows where a user explicitly guides the session.

## Final Fallback State
If all safe, compliant, and automated acquisition methods fail or are blocked by protections, the source must be downgraded. Its status must be updated to `MANUAL_ONLY` (requiring users to upload files) or `BLOCKED` (suspending all acquisition attempts until the issue is resolved).
