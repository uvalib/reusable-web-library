---
name: uvalib-web-components
description: Use when building or editing UVA Library web pages or sites, adding the UVA Library header, footer or page wrapper to a page, using the custom elements <site-page>, <site-header>, <site-footer>, <site-analytics>, <site-style>, <uvalib-filter> or <uvalib-date-range>, working with the @uvalib/web-components npm package, or editing script/link URLs on unpkg.internal.lib.virginia.edu (including migrating old /web-components/latest/ or cdn-v URLs). Covers CDN vs npm, version pinning, shadow vs light DOM, theming with --uva-* tokens, and a verification checklist.
---

# UVA Library web components

`@uvalib/web-components` provides the UVA Library page chrome as custom elements: `<site-page>` (skip link, header, one `<main>`, footer), `<site-header>`, `<site-footer>`, `<site-analytics>` (Matomo) and `<site-style>` (legacy compatibility). It also ships two search-page components, `<uvalib-filter>` and `<uvalib-date-range>` (section 6). Tag names are stable.

Authority rule: https://www.library.virginia.edu and the UVA Library design system are the source of truth for how the chrome looks and what it says. Do not re-create, copy or restyle the header, footer, logo or links by hand. Use the components, and change appearance only through the theming surface below.

For the full attribute, slot, part, event and custom-property lists see [reference/components.md](reference/components.md). To update an existing project from old URLs or package names see [reference/migration.md](reference/migration.md).

## 1. Choose how to load it

| Situation                                                        | Use                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Plain HTML, 11ty, Drupal template, anything without a JS bundler | CDN `<script type="module">`                                                             |
| App with a bundler (Vite, webpack, ...)                          | npm: `npm i @uvalib/web-components`, then `import '@uvalib/web-components/site-page.js'` |

CDN URLs (all files at one prefix):

- Major alias: `https://unpkg.internal.lib.virginia.edu/web-components/v1/<tag>.js`. Updates within major 1 within about 5 minutes. Default choice.
- Exact version: `https://unpkg.internal.lib.virginia.edu/web-components/vX.Y.Z/<tag>.js`. Immutable. Use when the site must not change without a deploy.
- `tokens.css` and `base.css` live at the same prefix (`.../v1/tokens.css`).
- NEVER write or recommend `/web-components/latest/...` or `/web-components/cdn-vX.Y.Z/...`. Those are legacy paths for old components. If you see them, migrate (see migration.md). There is no cross-major "latest" alias.

Loading rules:

- One script is enough for the page chrome: `site-page.js` also loads the header and footer. Add `site-analytics.js` only when the site needs Matomo.
- npm: the define entries (`@uvalib/web-components/site-page.js`, `site-header.js`, `site-footer.js`, `site-analytics.js`, `site-style.js`, `uvalib-filter.js`, `uvalib-date-range.js`) register the element. Importing the package root (`@uvalib/web-components`) gives the classes only and registers nothing. If you use the `SitePage` class directly, also import the header and footer define entries.
- Do not load the same component from both the CDN and npm on one page.

## 2. Required page structure

- Exactly one `<site-page>` per page, wrapping all page content.
- `<site-page>` renders the one skip link, the header, one `<main id="main-content">` and the footer. Never add your own `<main>`, skip link, `<header>`/`<footer>` site chrome, or `role="main"`. If the page already has them, remove them and keep only the content that was inside `<main>`.
- Sidebars, breadcrumbs and article content all go inside `<site-page>` as ordinary elements (use `<nav aria-label="...">` for navigation, no ARIA menu roles).
- Content for a band above the footer: put an element with `slot="pre-footer"` inside `<site-page>`.
- A site's own navigation (its home, sections, docs) goes in the header: give `<site-page>` `<a slot="site-links" href="…">` children and a `site-links-label` (see section 5). They replace the library utility links in the header and its Menu popover. Do not add a separate nav row or bar at the top of the content for it. Mark the current page with `aria-current="page"`. The `vendor` variant ignores site links: it is for third-party sites that only need the library logo and Ask a Librarian.
- Third-party or vendor sites that are not library.virginia.edu: `<site-page header-variant="vendor">` (logo plus Ask a Librarian only). Links default to `root-link-domain="https://www.library.virginia.edu"`; set it only for a non-production domain.
- Do not replace a light-mode page's children wholesale (`innerHTML` or `textContent` on `<site-page>`): that destroys the chrome. Append, or update a child container inside it.

## 3. Shadow DOM or light DOM

- Default (shadow DOM): the chrome is encapsulated and styled by the library. Use this unless the host site needs to restyle it.
- `no-shadow-dom`: renders into light DOM. Use it ONLY when the host site's own CSS should own the styling of the chrome (the host stylesheet needs to reach into the header, footer or content). Component styles are installed in `@layer uvalib` and scoped to the tag, so any unlayered host CSS wins. The page-level base rules (`html`, `body`, `*` box-sizing, accessibility; from `<site-page>` or `<site-style>`) are unlayered: they beat a host's unlayered rules of equal specificity and any layered host CSS (such as Tailwind v4 layers). Override with higher specificity or `!important`, or opt out with `no-global-styles` on `<site-page>` or by not using `<site-style>`. Tokens stay layered, so a host `:root { --uva-*: … }` wins. Content added to `<site-page>` later is moved into `<main>`.
- `no-shadow-dom no-style`: light DOM and no component styles at all. Use only when the host site styles everything itself (library.virginia.edu does this).
- Do not add `no-shadow-dom` just to "make it work". The mode is read once at first connect; do not toggle it later.
- `no-global-styles` on `<site-page>` stops it installing `base.css` (html/body font rules). Use it when the host page already sets its own base typography.
- `<site-style no-shadow-dom>` is legacy markup that only installs tokens and base styles. Keep it where it already exists; do not add it to new pages.

## 4. Theming

Theme only through the documented surface, never by reaching into internals:

- Inherited `--uva-*` custom properties (colors such as `--uva-brand-blue`, `--uva-brand-orange`; `--uva-font-family`, `--uva-font-size-base`). Set them on `:root` or an ancestor of `<site-page>`. The full set is in `tokens.css`; per-component ones are in reference/components.md. Prefer the library's values; override only with a stated reason.
- `::part()` in shadow mode. On a page, use `site-page::part(header)`, `site-page::part(footer)` and `site-page::part(main)` (`<site-page>` re-exports the header and footer parts; `site-header::part(header)` cannot reach through its shadow root). For a standalone `<site-header>` or `<site-footer>` use `site-header::part(header)` / `site-footer::part(footer)`. In light mode there are no shadow parts; style the elements with ordinary selectors.
- Never pierce shadow roots with JS, depend on internal class names, or use `!important` to fight the chrome.

## 5. Snippets

Plain HTML (CDN, version `v1`):

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Example page</title>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
  </head>
  <body>
    <site-page>
      <h1>Example page</h1>
      <p>Page content goes here. Do not add a second main element.</p>
    </site-page>
  </body>
</html>
```

A site with its own navigation (links replace the library utility links in the header):

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Current exhibits</title>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
  </head>
  <body>
    <site-page site-links-label="Exhibits">
      <a slot="site-links" href="/exhibits/">Home</a>
      <a slot="site-links" href="/exhibits/current/" aria-current="page">Current exhibits</a>
      <a slot="site-links" href="/exhibits/past/">Past exhibits</a>
      <h1>Current exhibits</h1>
      <p>Page content goes here.</p>
    </site-page>
  </body>
</html>
```

More complete pages (host-CSS `no-shadow-dom`, page with a sidebar and its own `<main>`, vendor header, analytics) are in [reference/snippets.md](reference/snippets.md).

11ty (Nunjucks layout). Wrap the layout's content in `<site-page>`; remove the layout's own `<main>`, header and footer markup. With `@uvalib/11ty-template`, its custom-elements plugin adds the script for each known tag in the page and pins the major with the `webComponentsVersion` option (default `"1"`; set an exact version to pin). The plugin option `webComponentsVersion` lands with the monorepo migration (11ty-template change); until then add the script tag yourself:

```njk snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{{ title }}</title>
    <script type="module" src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"></script>
  </head>
  <body>
    <site-page>
      {{ content | safe }}
    </site-page>
  </body>
</html>
```

Bundled app (Vite or similar):

```js snippet
// npm i @uvalib/web-components
import '@uvalib/web-components/site-page.js'; // registers site-page, site-header, site-footer
import '@uvalib/web-components/tokens.css'; // optional: tokens for your own CSS
// <site-page> is then used in your HTML or templates exactly as in the plain HTML snippet.
```

Analytics: add `site-analytics.js` and a `<site-analytics>` element only when the site needs Matomo; see the analytics page in [reference/snippets.md](reference/snippets.md). It listens on `document`, so dispatch its events only after it is defined, from a user action.

## 6. Search facets

For a search results page that needs a checkbox facet or a date-range picker, use `<uvalib-filter>` and `<uvalib-date-range>` instead of hand-built fieldsets and sliders. They are not page chrome: use them inside `<site-page>` alongside your own results, and load each from its own script (`uvalib-filter.js`, `uvalib-date-range.js`; npm: `@uvalib/web-components/uvalib-filter.js`).

- `<uvalib-filter>`: set `filter` (`{ name, title, position, buckets: [{ key, doc_count, selected }] }`), `value` (selected keys), and optionally `scopes` (`[{ value, label }]` chips), `scopeValue` and `scopesLabel`. `limit="5"` shows five buckets with See more / See less. Events: `filter-change` (`detail: { name, value }`) and `scope-change` (`detail: { value }`).
- `<uvalib-date-range>`: `min` and `max` (`YYYY-MM-DD`) are required; without them nothing renders and a console warning is logged. Set `value` to `[start, end]`; `label` renames the legend. Event: `date-range-change` (`detail: { value: [start, end] }`).
- Both are controlled: update `value` / `scopeValue` from your own state after each event, and re-run your search.
- Do not hard-code ids on their inner inputs; ids are unique per instance and the markup is internal.

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Search facets</title>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-filter.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-date-range.js"
    ></script>
  </head>
  <body>
    <site-page>
      <h1>Search facets</h1>
      <uvalib-filter id="type" limit="5"></uvalib-filter>
      <uvalib-date-range id="dates" min="1819-01-01" max="2026-12-31"></uvalib-date-range>
    </site-page>
    <script type="module">
      const type = document.querySelector('#type');
      type.filter = {
        name: 'type',
        title: 'Type',
        position: 0,
        buckets: [
          { key: 'Minutes', doc_count: 12, selected: false },
          { key: 'Reports', doc_count: 7, selected: false },
        ],
      };
      type.addEventListener('filter-change', (e) => {
        type.value = e.detail.value; // controlled: you own the selection state
      });
      document.querySelector('#dates').addEventListener('date-range-change', (e) => {
        console.log(e.detail.value); // [start, end] as YYYY-MM-DD
      });
    </script>
  </body>
</html>
```

## 7. Verification checklist

Before finishing, load the page in a browser (or test) and confirm:

1. Every used tag is defined: `customElements.get('site-page')` (and header/footer) is not undefined.
2. Exactly one `<main>` in the page, including inside open shadow roots (shadow mode puts it in `site-page`'s shadow root), and exactly one skip link.
3. No `<script>`/`<link>` URL contains `/web-components/latest/` or `/cdn-v`; the URL pins `v1` or `vX.Y.Z`.
4. No console errors and no failed network requests for the component files.
5. An axe pass (for example `axe-core` or the axe browser extension) reports no new violations.
6. `no-shadow-dom` appears only where the host CSS is meant to own the styling.
