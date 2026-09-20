# MANARATAK UI Translation Key Conventions

## Scope

These conventions apply to **UI/system copy** in:

- `apps/web`
- `apps/admin`

They do not govern dynamic University, Major, Test, Scholarship, Course, or CMS entity content stored in domain/database structures.

## Canonical resources

Public Web:

```text
apps/web/src/i18n/en.ts
apps/web/src/i18n/ar.ts
```

Admin:

```text
apps/admin/src/i18n/en.ts
apps/admin/src/i18n/ar.ts
```

## Rules

1. Every user-visible UI/system string must have a stable semantic key.
2. Arabic and English dictionaries must have the same key set.
3. Do not use generated sentence fragments as new key names.
4. Prefer semantic prefixes by surface:
   - `nav_*`
   - `home_*`
   - `admin_*`
   - `search_*`
   - `common_*`
5. `t('key') || 'English fallback'` is forbidden for required UI keys.
6. Inline bilingual helpers such as `languageText(language, english, arabic)` are transitional and must not be introduced in new source.
7. `language === 'ar' ? 'Arabic copy' : 'English copy'` is forbidden for ordinary user-facing copy.
8. Locale conditionals are allowed for behavior, layout, or selecting an already-defined translation key.
9. Dynamic entity/database content must not be copied into `ar.ts` / `en.ts`.
10. UI labels must not be stored as entity translation rows.
11. Direction is supplied by the canonical locale contract, not hardcoded page-by-page.
12. Missing required literal `t('...')` keys are test failures.

## Rich text

When a translated sentence contains styled fragments, split it into stable semantic parts only when necessary.

Example:

```text
home_premium_hero_prefix
home_premium_hero_emphasis
```

Do not store JSX/HTML in translation dictionaries.

## Review gate

A UI translation change is accepted only when:

```text
AR/EN KEY PARITY = PASS
LITERAL t() KEY RESOLUTION = PASS
NO NEW languageText() = PASS
NO NEW INLINE BILINGUAL COPY = PASS
```
