# Migrating to @uvalib/web-components

The five page-chrome elements (`site-page`, `site-header`, `site-footer`, `site-analytics`, `site-style`) keep their tag names and the attributes `root-link-domain`, `no-shadow-dom` and `no-style`, and the three library-hours elements (`site-hours-section`, `library-weekly-hours`, `library-hours-setup`) keep their tag names, attributes and markup, as does `events-section` from `@uvalib/bento-box`. Only the URLs and package names change.

## CDN URLs

Base: `https://unpkg.internal.lib.virginia.edu/web-components/`. Pick the major alias `v1` (updates within the major) or an exact version `vX.Y.Z` (immutable). Never use `latest/` or `cdn-v*/` for new work.

| Old                                                                                                                                           | New                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/web-components/latest/@uvalib/site-page/site-page.js`                                                                                       | `/web-components/v1/site-page.js`                                                                                                                                                           |
| `/web-components/latest/@uvalib/site-header/site-header.js`                                                                                   | `/web-components/v1/site-header.js`                                                                                                                                                         |
| `/web-components/latest/@uvalib/site-footer/site-footer.js`                                                                                   | `/web-components/v1/site-footer.js`                                                                                                                                                         |
| `/web-components/latest/@uvalib/site-analytics/site-analytics.js`                                                                             | `/web-components/v1/site-analytics.js`                                                                                                                                                      |
| `/web-components/latest/@uvalib/site-style/site-style.js`                                                                                     | `/web-components/v1/site-style.js`                                                                                                                                                          |
| `/web-components/cdn-vX.Y.Z/@uvalib/<pkg>/<file>.js`                                                                                          | `/web-components/v1/<tag>.js`, or `/web-components/v1.0.0/<tag>.js` to pin (the old cdn-v number does not map to a new version)                                                             |
| `/web-components/<latest or cdn-vX.Y.Z>/@uvalib/site-hours/<file>.js`                                                                         | `/web-components/v1/<file>.js` for `site-hours-section`, `library-weekly-hours` and `library-hours-setup` (same markup); `library-daily-hours` is not migrated                              |
| `/web-components/<latest or cdn-vX.Y.Z>/@uvalib/bento-box/events-section.js`, or `unpkg.com/@uvalib/cdn-builds@1.0.2/build/events-section.js` | `/web-components/v1/events-section.js` (same markup; card headings follow the page's headings, and the inline `max-title-length` script can go)                                             |
| any other `/web-components/latest/@uvalib/<pkg>/<file>.js`                                                                                    | `/web-components/v1/<pkg>.js` when `<pkg>` is one of the five page-chrome tags; other packages (the rest of `bento-box`, `site-menu-bar`, ...) are not migrated yet, leave their URLs alone |

Pattern: the new file is named after the element, `/web-components/v1/<tag>.js` (or an exact `vA.B.C`). For the page-chrome packages the tag is the package name (`@uvalib/site-page/site-page.js` becomes `v1/site-page.js`); for `@uvalib/site-hours` it is the file name (`@uvalib/site-hours/library-hours-setup.js` becomes `v1/library-hours-setup.js`; there is no `v1/site-hours.js`).

Notes:

- `site-page.js` also loads the header and footer, so separate script tags for `site-header` and `site-footer` are not needed.
- Shared stylesheets: `/web-components/v1/tokens.css` and `/web-components/v1/base.css`.
- 11ty sites using the `11ty-template` custom-elements plugin get the new URLs through the plugin; its `webComponentsVersion` option defaults to `"1"`.

## npm package names

| Old                                    | New                                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@uvalib/site-page`                    | `@uvalib/web-components`, `import '@uvalib/web-components/site-page.js'`                                                                  |
| `@uvalib/site-header`                  | `import '@uvalib/web-components/site-header.js'`                                                                                          |
| `@uvalib/site-footer`                  | `import '@uvalib/web-components/site-footer.js'`                                                                                          |
| `@uvalib/site-analytics`               | `import '@uvalib/web-components/site-analytics.js'`                                                                                       |
| `@uvalib/site-style`                   | `import '@uvalib/web-components/site-style.js'`                                                                                           |
| `@uvalib/site-hours`                   | `import '@uvalib/web-components/site-hours-section.js'` (or `library-weekly-hours.js`, `library-hours-setup.js`)                          |
| `@uvalib/bento-box` (`events-section`) | `import '@uvalib/web-components/events-section.js'`                                                                                       |
| `webSiteInfo` (site registry)          | internal to `site-analytics`; not exported. Do not import it; pass `matomoid` to `<site-analytics>` if the URL-based lookup is not enough |

Importing `@uvalib/web-components` itself returns classes only and registers nothing; use the define entries above.

## Markup changes to make while migrating

- Delete any hand-written `<main>`, `role="main"`, skip link, header or footer: `<site-page>` renders them.
- `<site-style no-shadow-dom>` still works (it installs tokens and base styles); new pages do not need it.
- Look for `no-shadow-dom` that was added only as a workaround; keep it only if the host CSS should own the styling.
