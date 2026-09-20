# Google AI Studio export repair — 2026-09-15

Reviewed export: ff41ff2c515c09584f7cec9da58a59d3208d5dea.
Last verified complete source: 19d22bddd46981239b20ec84c436d5a9b8831442.

The export deleted 798 tracked files, replaced core/config/domain contracts with
partial stubs, removed runtime guards and tests, changed npm workspace dependency
syntax, and replaced the Studio verifier with unconditional success. It also enabled
prototype fallback on live API failures and widened preview/security behavior.
There were no new Public Web component or public-asset changes in this export.

Restore those source/runtime/CI/data files from the verified revision without
rewriting Git history. Preserve the exported metadata name and description.
The public design and explicit isolated development fixtures remain unchanged.
Remove the export's added duplicate contract stubs and alternate root server;
their originals remain recoverable in the export commit.

For subsequent UI work in Studio, edit Public Web components and assets in place.
Do not replace the complete monorepo with a partial export, synthesize substitute
domain classes, remove source datasets, disable guards, or silently switch live API
errors to fixtures. Use the existing isolated Studio launcher for frontend preview.

No database command, migration, seed, SQL, Supabase operation or secret change is
part of this repair. Source data files are restored as files, not imported.
