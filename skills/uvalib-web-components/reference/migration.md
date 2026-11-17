# Migrating to @uvalib/web-components

The five page-chrome elements (`site-page`, `site-header`, `site-footer`, `site-analytics`, `site-style`) keep their tag names and the attributes `root-link-domain`, `no-shadow-dom` and `no-style`, and the three library-hours elements (`site-hours-section`, `library-weekly-hours`, `library-hours-setup`) keep their tag names, attributes and markup, as do `events-section` and `bento-box` (with its `catalog-section`, `articles-section`, `libguides-section` and `website-section`) from `@uvalib/bento-box`. Only the URLs and package names change.

## CDN URLs

Base: `https://unpkg.internal.lib.virginia.edu/web-components/`. Pick the major alias `v1` (updates within the major) or an exact version `vX.Y.Z` (immutable). Never use `latest/` or `cdn-v*/` for new work.

| Old                                                                                                                                           | New                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/web-components/latest/@uvalib/site-page/site-page.js`                                                                                       | `/web-components/v1/site-page.js`                                                                                                                                                                                                     |
| `/web-components/latest/@uvalib/site-header/site-header.js`                                                                                   | `/web-components/v1/site-header.js`                                                                                                                                                                                                   |
| `/web-components/latest/@uvalib/site-footer/site-footer.js`                                                                                   | `/web-components/v1/site-footer.js`                                                                                                                                                                                                   |
| `/web-components/latest/@uvalib/site-analytics/site-analytics.js`                                                                             | `/web-components/v1/site-analytics.js`                                                                                                                                                                                                |
| `/v0.0.12/uvalib-analytics.js` (or any `/vX.Y.Z/uvalib-analytics.js` outside `/web-components/`)                                              | `/web-components/v1/uvalib-analytics.js` (same markup, `<uvalib-analytics matomoid="10">`; events are queued until Matomo loads and a page never counts twice)                                                                        |
| `/web-components/latest/@uvalib/site-style/site-style.js`                                                                                     | `/web-components/v1/site-style.js`                                                                                                                                                                                                    |
| `/web-components/cdn-vX.Y.Z/@uvalib/<pkg>/<file>.js`                                                                                          | `/web-components/v1/<tag>.js`, or `/web-components/v1.0.0/<tag>.js` to pin (the old cdn-v number does not map to a new version)                                                                                                       |
| `/web-components/<latest or cdn-vX.Y.Z>/@uvalib/site-hours/<file>.js`                                                                         | `/web-components/v1/<file>.js` for `site-hours-section`, `library-weekly-hours` and `library-hours-setup` (same markup); `library-daily-hours` is not migrated                                                                        |
| `/web-components/<latest or cdn-vX.Y.Z>/@uvalib/bento-box/events-section.js`, or `unpkg.com/@uvalib/cdn-builds@1.0.2/build/events-section.js` | `/web-components/v1/events-section.js` (same markup; card headings follow the page's headings, and the inline `max-title-length` script can go)                                                                                       |
| `/web-components/<latest or cdn-vX.Y.Z>/@uvalib/bento-box/bento-box.js`                                                                       | `/web-components/v1/bento-box.js` (same markup, `<bento-box no-style no-shadow-dom limit="3">`; it registers the four sections; `?query=` links keep working, new searches use `?q=`)                                                 |
| any other `/web-components/latest/@uvalib/<pkg>/<file>.js`                                                                                    | `/web-components/v1/<pkg>.js` when `<pkg>` is one of the five page-chrome tags; other packages (`bento-box`'s dead sections such as `people-section` or `mlb-section`, `site-menu-bar`, ...) are not migrated, leave their URLs alone |

Pattern: the new file is named after the element, `/web-components/v1/<tag>.js` (or an exact `vA.B.C`). For the page-chrome packages the tag is the package name (`@uvalib/site-page/site-page.js` becomes `v1/site-page.js`); for `@uvalib/site-hours` it is the file name (`@uvalib/site-hours/library-hours-setup.js` becomes `v1/library-hours-setup.js`; there is no `v1/site-hours.js`).

Notes:

- `site-page.js` also loads the header and footer, so separate script tags for `site-header` and `site-footer` are not needed.
- Shared stylesheets: `/web-components/v1/tokens.css` and `/web-components/v1/base.css`.
- 11ty sites using the `11ty-template` custom-elements plugin get the new URLs through the plugin; its `webComponentsVersion` option defaults to `"1"`.

## Switching library.virginia.edu

Every live use on library.virginia.edu (checked 17 Nov 2026, HTML comments excluded). Only the script URLs change; keep each page's markup exactly as it is. No page needs `base.css`, which is for `<site-page>` sites.

| Page                                                     | Old script URL                                                                                                 | v1 script URL                                                                      | Markup (unchanged)                                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| every page (theme)                                       | `https://unpkg.internal.lib.virginia.edu/v0.0.12/uvalib-analytics.js`                                          | `https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-analytics.js`    | `<uvalib-analytics matomoid="10">`                                                                                  |
| `/` (home)                                               | `https://unpkg.internal.lib.virginia.edu/web-components/cdn-v2.2.35/@uvalib/site-hours/site-hours-section.js`  | `https://unpkg.internal.lib.virginia.edu/web-components/v1/site-hours-section.js`  | `<site-hours-section limited no-style no-shadow-dom>`                                                               |
| `/` (home), `/equipment-and-tech`, `/data`, `/dh-center` | `https://unpkg.internal.lib.virginia.edu/web-components/cdn-v2.0.8/@uvalib/bento-box/events-section.js`        | `https://unpkg.internal.lib.virginia.edu/web-components/v1/events-section.js`      | `<events-section no-style no-shadow-dom limit="8">` (with `category` on /data and /dh-center; `limit="6"` on /data) |
| `/rmc`                                                   | `https://unpkg.com/@uvalib/cdn-builds@1.0.2/build/events-section.js`                                           | `https://unpkg.internal.lib.virginia.edu/web-components/v1/events-section.js`      | `<events-section category="38740" no-style no-shadow-dom limit="8">`                                                |
| `/search`                                                | `https://unpkg.internal.lib.virginia.edu/web-components/cdn-v2.2.38/@uvalib/bento-box/bento-box.js`            | `https://unpkg.internal.lib.virginia.edu/web-components/v1/bento-box.js`           | `<bento-box no-style no-shadow-dom limit="3">`                                                                      |
| `/hours`                                                 | `https://unpkg.internal.lib.virginia.edu/web-components/cdn-v2.2.40/@uvalib/site-hours/library-hours-setup.js` | `https://unpkg.internal.lib.virginia.edu/web-components/v1/library-hours-setup.js` | `<library-hours-setup>`                                                                                             |

Order and checks:

1. **Switch `uvalib-analytics` first, or with the others.** The v1 components report to analytics with `uvalib-analytics-*` events, which the old v0.0.12 element also hears. It calls `resultCount.toString()`, so a search with no known count (the subject-guides section) throws in the old element's listener: no tracking for that search, and an error in the console. The v1 element sends `false` (Matomo's "unknown") instead.
2. **Switch the whole site at once for analytics.** Two different `uvalib-analytics` scripts cannot both register the tag; the one loaded second fails to define it.
3. **Drop the inline `max-title-length` script** on the events pages; titles clamp to three lines.
4. **The Drupal module loader** (`drupal_module_loader/map.yml`) still points at `cdn-v{version}/@uvalib/...`. If pages get their scripts from it, change its entries for these tags to `https://unpkg.internal.lib.virginia.edu/web-components/v1/<tag>.js`; the v1 `manifest.json` (`/web-components/v1/manifest.json`) lists every tag and its file.
5. **After each switch**, check the page in a browser: the component renders, there are no console errors, and (for `/search`) Matomo receives one site search per section.
6. **Pin if you want no surprise updates:** use `/web-components/v1.0.1/<tag>.js` (or later) instead of `v1`; `v1` follows every 1.x release.

## npm package names

| Old                                    | New                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@uvalib/site-page`                    | `@uvalib/web-components`, `import '@uvalib/web-components/site-page.js'`                                                                            |
| `@uvalib/site-header`                  | `import '@uvalib/web-components/site-header.js'`                                                                                                    |
| `@uvalib/site-footer`                  | `import '@uvalib/web-components/site-footer.js'`                                                                                                    |
| `@uvalib/site-analytics`               | `import '@uvalib/web-components/site-analytics.js'`                                                                                                 |
| `@uvalib/uvalib-analytics`             | `import '@uvalib/web-components/uvalib-analytics.js'`; `UvalibAnalyticsMixin` (`_analyticsEvent`, `_analyticsSearch`) from `@uvalib/web-components` |
| `@uvalib/site-style`                   | `import '@uvalib/web-components/site-style.js'`                                                                                                     |
| `@uvalib/site-hours`                   | `import '@uvalib/web-components/site-hours-section.js'` (or `library-weekly-hours.js`, `library-hours-setup.js`)                                    |
| `@uvalib/bento-box` (`events-section`) | `import '@uvalib/web-components/events-section.js'`                                                                                                 |
| `@uvalib/bento-box` (`bento-box`)      | `import '@uvalib/web-components/bento-box.js'`                                                                                                      |
| `webSiteInfo` (site registry)          | internal to `site-analytics`; not exported. Do not import it; pass `matomoid` to `<site-analytics>` if the URL-based lookup is not enough           |

Importing `@uvalib/web-components` itself returns classes only and registers nothing; use the define entries above.

## Markup changes to make while migrating

- Delete any hand-written `<main>`, `role="main"`, skip link, header or footer: `<site-page>` renders them.
- `<site-style no-shadow-dom>` still works (it installs tokens and base styles); new pages do not need it.
- Look for `no-shadow-dom` that was added only as a workaround; keep it only if the host CSS should own the styling.
