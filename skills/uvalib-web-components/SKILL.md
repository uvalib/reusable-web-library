---
name: uvalib-web-components
description: Use when building or editing UVA Library web pages or sites, adding the UVA Library header, footer or page wrapper to a page, using the custom elements <site-page>, <site-header>, <site-main-nav>, <site-footer>, <site-analytics>, <uvalib-analytics>, <site-style>, <uvalib-breadcrumbs>, <uvalib-card>, <uvalib-card-grid>, <uvalib-pager>, <uvalib-contents>, <uvalib-metadata>, <site-alerts>, <uvalib-filter>, <uvalib-date-range>, <site-hours-section>, <library-weekly-hours>, <library-hours-setup>, <events-section> or <bento-box>, working with the @uvalib/web-components npm package, or editing script/link URLs on unpkg.internal.lib.virginia.edu (including migrating old /web-components/latest/ or cdn-v URLs). Covers CDN vs npm, version pinning, shadow vs light DOM, theming with --uva-* tokens, WCAG 2.2 AA accessibility testing (axe-core in Playwright matched to Lighthouse, Lighthouse CI, manual checks), and a verification checklist.
---

# UVA Library web components

`@uvalib/web-components` provides the UVA Library page chrome as custom elements: `<site-page>` (skip link, header with the library main navigation, one `<main>`, footer), `<site-header>`, `<site-main-nav>` (the main navigation, rendered by the header), `<site-footer>`, `<site-analytics>` (Matomo; also registered as `<uvalib-analytics>`) and `<site-style>` (legacy compatibility), plus `<uvalib-breadcrumbs>` (the breadcrumb trail), `<uvalib-contents>` (sub-navigation or a table of contents) and `<uvalib-metadata>` (a record's details, credit, rights and how to cite), all in section 2, `<uvalib-card>`, `<uvalib-card-grid>` and `<uvalib-pager>` (cards and paging, section 5) and `<site-alerts>` (the live library alerts, which `<site-page>` shows itself). It also ships two search-page components, `<uvalib-filter>` and `<uvalib-date-range>` (section 6), and three library-hours elements for library.virginia.edu, `<site-hours-section>`, `<library-weekly-hours>` and `<library-hours-setup>`, `<events-section>` for upcoming library events and `<bento-box>` for the library's search results page (section 7). Tag names are stable.

Authority rule: https://www.library.virginia.edu and the UVA Library design system are the source of truth for how the chrome looks and what it says. Do not re-create, copy or restyle the header, footer, logo or links by hand. Use the components, and change appearance only through the theming surface below.

Accessibility rule: everything you build with these components must meet **WCAG 2.2 AA at minimum and aim for AAA** (the Library's web standard; alerts and other critical messages meet AAA). The components are built and tested to that bar; your own markup, CSS and scripts around them must keep it. Test every change with axe-core in Playwright configured to be at least as strict as Lighthouse, with Lighthouse CI, and with a short manual keyboard and screen reader pass: see [reference/accessibility-testing.md](reference/accessibility-testing.md) for the ready-to-use setup. Do not finish a task with known accessibility failures; report anything you could not test.

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

- One script is enough for the page chrome: `site-page.js` also loads the header (with its main navigation) and footer. For Matomo, give `<site-page>` a `matomo-id` (it loads the analytics code itself), or add `site-analytics.js` and a `<site-analytics>` (or `uvalib-analytics.js` and `<uvalib-analytics>`) element; never both, and never alongside a hand-written Matomo snippet.
- Also link `.../v1/base.css` in `<head>` (npm: `@uvalib/web-components/base.css`), unless the page sets `no-global-styles`. `<site-page>` installs the same base styles only after the first paint, so without the link the page shifts once (the default body margin goes away, and a heading's margin stops collapsing through the not-yet-defined `<site-page>`). The link also keeps `<site-page>` invisible until it is defined, with a two-second fallback.
- npm: the define entries (`@uvalib/web-components/site-page.js`, `site-header.js`, `site-main-nav.js`, `site-footer.js`, `site-analytics.js`, `uvalib-analytics.js`, `site-style.js`, `uvalib-breadcrumbs.js`, `uvalib-card.js`, `uvalib-card-grid.js`, `uvalib-pager.js`, `uvalib-contents.js`, `uvalib-metadata.js`, `site-alerts.js`, `uvalib-filter.js`, `uvalib-date-range.js`, `site-hours-section.js`, `library-weekly-hours.js`, `library-hours-setup.js`, `events-section.js`, `bento-box.js`) register the element (`bento-box.js` also registers its four sections). Importing the package root (`@uvalib/web-components`) gives the classes only and registers nothing. If you use the `SitePage` class directly, also import the header and footer define entries.
- Do not load the same component from both the CDN and npm on one page.

## 2. Required page structure

- Exactly one `<site-page>` per page, wrapping all page content.
- `<site-page>` renders the one skip link, the header, one `<main id="main-content">` and the footer. Never add your own `<main>`, skip link, `<header>`/`<footer>` site chrome, or `role="main"`. If the page already has them, remove them and keep only the content that was inside `<main>`.
- Sidebars and article content go inside `<site-page>` as ordinary elements (use `<nav aria-label="...">` for navigation, no ARIA menu roles).
- Breadcrumbs: a `<uvalib-breadcrumbs slot="breadcrumbs">` (from `uvalib-breadcrumbs.js`) inside `<site-page>`, never a hand-built trail. Its children are `<a href>` links ending with the current page (`<span>Title</span>`, or `<a href aria-current="page">`); apps can set its `items` property (`[{ label, href? }]`) instead. `<site-page>` places it between the header and `<main>`, outside `<main>`. Outside `<site-page>` it goes first in the content, above the `<h1>`. In a single-page app with history routing, listen for `uvalib-breadcrumbs-navigate` and call `preventDefault()` to route in place (hash links need nothing).
- Cards and paging: a collection or photo is a `<uvalib-card>` (`uvalib-card.js`), inside `<uvalib-card-grid>` (`uvalib-card-grid.js`) when there are several. `href` makes the heading the one link for the whole card: never wrap the card in an `<a>`, and do not put another link, button or other control inside a clickable card. The heading needs an accessible name, or the link is hidden. A card with no `href` may contain its own links. An image needs a real alt, or `alt=""` when the heading already names it. Previous/next sections or numbered pages are one `<uvalib-pager>` (`uvalib-pager.js`); a second pager on the same page needs its own `label`. In a single-page app, listen for `uvalib-card-navigate` and `uvalib-pager-navigate` and call `preventDefault()` to route in place.
- Sub-navigation and tables of contents: a `<uvalib-contents>` (from `uvalib-contents.js`) holding one `<ol>`/`<ul>` of `<li><a href>` entries, nested lists for sub-entries (plain text in an `<li>` for a group label), never a hand-built `<nav>` list or `<details>` for it. It is the `<nav>` landmark (named and headed by `label`, default "Contents"; set `heading-level` to fit the outline) and marks the current page (`aria-current="page"`) and in-page section (`"location"`, from the hash) itself: do not add `aria-current` by hand unless the route is not the URL, and then prefer `current="<url>"`. It collapses into a disclosure button at 64rem and below (`collapse-below`), closed until opened. In a sidebar add `sticky`. Apps can set `items` (`[{ label, href?, children? }]`); with history routing, cancel `uvalib-contents-navigate` to route in place.
- Record details: a `<uvalib-metadata>` (from `uvalib-metadata.js`) around a plain `<dl>` (`<dt>` label, `<dd>` values; lists such as subjects as a `<ul>` in the `<dd>`). Downloads are `<a href download data-size="184 KB">EPUB</a>`. For credit and rights use its attributes, not your own rows: `creator`, `organization`, `rights` (a rightsstatements.org or Creative Commons URL; it shows the short name), `rights-info` (`https://www.library.virginia.edu/policies/use-of-materials`) and `citation` or `citation-title` (the Special Collections citation "<title>, Albert and Shirley Small Special Collections Library, University of Virginia"), which adds a Copy citation button. Do not add icons from rightsstatements.org or creativecommons.org.
- Content for a band above the footer: put an element with `slot="pre-footer"` inside `<site-page>`.
- `no-footer` on `<site-page>` hides the footer (and any pre-footer band). Use it only for tool or app-like pages, such as a full-screen editor, where the site footer does not belong; normal content pages keep the footer.
- A site's own navigation (its home, sections, docs) goes in the header: give `<site-page>` `<a slot="site-links" href="…">` children and a `site-links-label` (see section 5). They replace the library utility links in the header and its Menu popover. Do not add a separate nav row or bar at the top of the content for it. Each must be an `<a href>` with visible text; other children and empty links are ignored with a console warning. Mark the current page with `aria-current="page"`. The `vendor` variant ignores site links: it is for third-party sites that only need the library logo and Ask a Librarian.
- Main navigation: every full header shows the UVA Library main navigation (About, Using the Library, Research & teaching support, Get help) by default, as a row under the logo on wide screens and as accordions at the top of the Menu popover at 992px and below. Keep it on library sites. Do not build your own copy of it, add a second main-navigation bar, or hard-code its links: the component bundles the live menu (maintainers refresh it with `pnpm sync:main-nav`). Turn it off with `no-main-nav` only on sites that are not part of the library website's navigation (for example a standalone app that asks for it); the `vendor` variant never shows it. It is separate from site links: site links replace the utility links, the main navigation stays. To replace the main navigation's links (rare), give `<site-page>` a `<nav slot="main-nav"><ul>…</ul></nav>` child (`<li><a href>` for a link, `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` for a group; two levels only), or `main-nav-src="https://…/menu.json"` (CORS required; on failure the bundled menu stays and `site-main-nav-error` fires). Precedence: slot, then `main-nav-src`, then the bundle (a standalone `<site-main-nav>` also takes an `items` property, between the slot and `items-src`; `<site-page>` and `<site-header>` have none). It marks the current page itself (`aria-current`) and follows same-document navigations; an app whose route is not its URL sets `main-nav-current` on `<site-page>`. Do not add `aria-current` to its links by hand, and never use ARIA menu roles for it. Exactly one main-navigation landmark is visible at a time (the row above 992px, the accordion in the open Menu popover below). Above 992px it makes the header about 54px taller: do not hard-code the header height in host CSS.
- Alerts: `<site-page>` shows live UVA Library alerts by default placed as in Virgo (a full-bleed header banner at the top of the header, the alert list in a full-bleed `Library alerts` region band between the header and `<main>`, hidden while empty, and regional alerts first in `<main>`), drawn by `<site-alerts>` in library.virginia.edu's look; the data comes from a headless `<uvalib-alerts>` that it loads from the alerts CDN itself. Keep the default (production) on real sites. Use `alerts-env="staging"` only on staging or test deployments, and `alerts-src="https://…/"` only for a custom alerts domain or local development; it wins over `alerts-env`. Never add your own `<site-alerts>`, `<uvalib-alerts>` or alerts `<script>` inside or alongside a `<site-page>`. An app that renders alerts itself (Virgo, headless) sets `no-alerts`; nothing else should. A standalone `<site-header>` loads no alerts.
- Alerts without `<site-page>`: `<site-alerts show="sitewide">` near the top of the page and `<site-alerts show="regional">` where the content starts (from `site-alerts.js`; `show` is `header`, `list`, `regional`, `sitewide` or `all`), inside landmarks (the banner in your `<header>`, the list in a labelled `<section aria-label="Library alerts">`, regional in `<main>`). They share one hidden headless element, created for them. List titles are `<h2>`; set `heading-level` if your page's outline needs another level. A site still using the alerts project's UI (`<uvalib-alerts show="…">` and its script) switches to `<site-alerts show="…">` and drops that script.
- Alerts accessibility is built in (AAA text contrast in light and dark, severity in text as well as icon and colour, a polite status banner, `role="alert"` only for critical alerts, 44px dismiss buttons that move focus to the next alert or `<main>`, forced-colors borders). Do not restyle alert colours or hide the visually hidden severity labels. Theme dark mode through the `--uva-color-alert-*` tokens only, keeping 7:1 text contrast.
- Alerts report to analytics on their own (with an analytics element on the page): a content impression per alert shown per page view ('Library alert', '<severity>: <title>'), and `site-alerts` events `dismiss`, `link-click` (never the URL) and `error` (`alerts-script`). Do not add your own tracking for them.
- If the site sends a Content Security Policy, it must allow the alerts host (production `https://d2q6t6fdv76k7r.cloudfront.net`) in `script-src` and `connect-src`, `wss://*.appsync-realtime-api.us-east-1.amazonaws.com` in `connect-src`, and the hosts of images used in alert bodies in `img-src`. Alert bodies are inserted as HTML, so a page that enforces Trusted Types (`require-trusted-types-for`) cannot show alerts: use `no-alerts` there.
- In light mode the regional `<site-alerts>` is the first child of `<main>`, the banner the first child of the header's `<header>`, and the `section.alerts-list` band (the alert list) sits between `<site-header>` and `<main>`; do not write host CSS like `main > :first-child` or `site-header + *` that assumes your content comes first, and do not restyle the band's full-bleed layout.
- A sub-site's name (Electronic Text Collections, an exhibit or project site): `site-name="…"` on `<site-page>` (and `site-name-href` when its home is not `/`). The header shows it after the logo as a link to the site's home; the logo still links to library.virginia.edu. Never add your own banner, title bar or second logo row for it, and never make it the page's `<h1>` (the page keeps its own). Keep it short (two lines at most on wide screens).
- Buttons, toggles and search boxes in the page's own content: use `base.css`'s classes, never hand-rolled button CSS: `.uvalib-button` (on `<button>` or `<a>`), `--secondary` (outline), `--subtle`, `--small`, `--large`; a toggle is a `.uvalib-button` with `aria-pressed="true|false"` (flip it in script); fields are `.uvalib-input` with a visible `<label>`, and a search box is `<form class="uvalib-search-form" role="search">` holding the label, the field and a `.uvalib-button` submit. They need `base.css` linked (`<site-page>` does not install them); it carries the dark-mode role tokens they read. Disable with `disabled` (or `aria-disabled="true"` while busy); a pressed toggle is filled whatever its variant.
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

### Dark mode (opt-in)

- Off by default: pages are always light, whatever the OS or the host's own `color-scheme`. Do not enable it unless the user asks AND the site's own content supports it: the host CSS must read the `--uva-color-*` role tokens (with their light values as fallbacks) or style off `:root[data-uva-color-scheme]`. Iframes and third-party widgets will not follow.
- Turn it on with the boolean `color-scheme-switch` on `<site-page>` (or a standalone `<site-header>`). Nothing else: the header renders the Light / Dark / System control and the reversed logo, and stores the choice per site in `localStorage` (`uvalib-color-scheme`). Do not build a second toggle, a `role=switch`, or set `data-uva-color-scheme` yourself.
- On pages that set `color-scheme-switch`, and only there, add the README's anti-flash snippet as a classic inline `<script>` in `<head>` (not `type=module`), with `tokens.css` and `base.css` linked there too. Copy it exactly; it checks `light-dark()` support. (On a page without the switch the components remove the attribute it sets, after a flash.) Under a CSP, allow it with a hash or nonce, and `img-src https://static.lib.virginia.edu` for the reversed logo.
- Theme with role tokens, never by flipping palette tokens: `--uva-brand-blue` stays navy because it is also a background under white text. With dark mode on, set `--uva-brand-*` or `--uva-color-*` overrides on `:root`; ones scoped lower are ignored for role-token colours.
- With `no-global-styles`, `no-style` or standalone components, link `tokens.css` (it holds the role tokens and the opt-in rules); with `no-style` the host styles everything off `data-uva-color-scheme`.
- Check both schemes: choose Dark in the control (or emulate `prefers-color-scheme: dark` with System) and run axe again.

## 5. Snippets

Plain HTML (CDN, version `v1`):

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Example page</title>
    <link
      rel="stylesheet"
      href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css"
    />
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
    <link
      rel="stylesheet"
      href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css"
    />
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

A sub-site with its name in the header, its own links, and a search box and a toggle in its content (`base.css` styles the classes):

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Electronic Text Collections</title>
    <link
      rel="stylesheet"
      href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css"
    />
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
  </head>
  <body>
    <site-page
      site-name="Electronic Text Collections"
      site-name-href="/"
      site-links-label="Collections"
    >
      <a slot="site-links" href="/collections/">Collections</a>
      <a slot="site-links" href="/search/">Search</a>
      <h1>Electronic Text Collections</h1>
      <form class="uvalib-search-form" role="search" action="/search/">
        <label for="q">Search the texts</label>
        <input class="uvalib-input" id="q" name="q" type="search" />
        <button class="uvalib-button" type="submit">Search</button>
      </form>
      <p>
        <button class="uvalib-button" type="button" aria-pressed="false">
          Show original line breaks
        </button>
      </p>
      <p>
        <a class="uvalib-button uvalib-button--secondary" href="/texts/1/">Previous</a>
        <a class="uvalib-button uvalib-button--secondary" href="/texts/3/">Next</a>
      </p>
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
    <link rel="stylesheet" href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css" />
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

Analytics: only when the site needs Matomo, set `<site-page matomo-id="N">`, or add `site-analytics.js` and a `<site-analytics matomoid="N">`; see the analytics page in [reference/snippets.md](reference/snippets.md). `<uvalib-analytics>` (`uvalib-analytics.js`) is the same element under its original name, for existing markup. It listens on `document` for `uvalib-analytics-*` and `site-analytics-*` events (`event`, `search`, `pageview`, `content`) and queues them for Matomo, so events fired before Matomo loads are kept, and a page never counts twice. A single-page app whose router uses `pushState` or hashes can set `spa="auto"` to have each route change counted (after the new title is set, never twice for one URL); bare `spa` means the app sends its own `uvalib-analytics-pageview` events.

The library's components already report what visitors do with them; do not add tracking for any of it: header utility and site links, logo, skip link, Menu and colour scheme; main-nav menu opens and links; footer links; breadcrumb and contents levels, the contents disclosure, Copy citation; card clicks (the card's place in its grid, or single); pager next, previous and page numbers; alerts (impressions, dismiss, links, errors); event clicks; See all hours, week changes; filter facets, scopes and See more/less; date-range changes; bento searches, result and See all clicks, retries; and load errors. The README's "Analytics" section has the full table.

For the host page's own content, tag the clickable element (or a wrapper) with `data-uvalib-track="category,action[,name[,value]]"` instead of writing a listener, for example `<a href="/spaces" data-uvalib-track="home-page,banner-click,Study spaces">`: the category is your page or widget, the action a fixed kebab-case verb, the name a short fixed label, the value a number. It works inside shadow DOM too. Never put titles, URLs, search text, ids, email addresses, phone numbers or other personal data in events.

To opt out: `no-analytics` on an element (or any ancestor) silences it and everything inside; `<html data-uvalib-analytics="off">` turns analytics off for the whole page (no Matomo, no page view, no events). Browsers that send Do Not Track or Global Privacy Control get no Matomo at all, with nothing to configure.

A page with a breadcrumb trail (between the header and `<main>`):

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Writing &amp; publication</title>
    <link
      rel="stylesheet"
      href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css"
    />
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-breadcrumbs.js"
    ></script>
  </head>
  <body>
    <site-page>
      <uvalib-breadcrumbs slot="breadcrumbs">
        <a href="/">Home</a>
        <a href="/research-and-teaching">Research &amp; teaching support</a>
        <span>Writing &amp; publication</span>
      </uvalib-breadcrumbs>
      <h1>Writing &amp; publication</h1>
      <p>Page content goes here.</p>
    </site-page>
  </body>
</html>
```

A collection grid, a photo card and previous/next sections. The card's `href` is the only link; the image alt is not the heading. Load `uvalib-card.js`, `uvalib-card-grid.js` and `uvalib-pager.js` as well as `site-page.js`.

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Collections</title>
    <link
      rel="stylesheet"
      href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css"
    />
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-card.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-card-grid.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-pager.js"
    ></script>
  </head>
  <body>
    <site-page>
      <h1>Collections</h1>
      <uvalib-card-grid>
        <uvalib-card href="#early-american-fiction">
          <span slot="heading">Early American Fiction</span>
          128 texts
        </uvalib-card>
        <uvalib-card href="#rotunda">
          <img
            slot="media"
            alt="A courtyard arch"
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          />
          <span slot="badge">13 photos</span>
          <span slot="heading">Rotunda</span>
          <time slot="meta" datetime="1910">1910</time>
          <span slot="chip">Architecture</span>
          The west colonnade after the annex fire.
        </uvalib-card>
      </uvalib-card-grid>
      <uvalib-pager
        prev-href="#the-opening"
        prev-label="The opening"
        next-href="#what-follows"
        next-label="What follows"
      ></uvalib-pager>
    </site-page>
  </body>
</html>
```

A record page with its metadata and a contents sidebar (the sidebar is an ordinary element inside `<site-page>`):

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>The actress of Padua, and other tales</title>
    <link
      rel="stylesheet"
      href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css"
    />
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-contents.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-metadata.js"
    ></script>
    <style>
      .reader {
        display: grid;
        gap: 2rem;
      }
      @media (width > 64rem) {
        .reader {
          grid-template-columns: 18rem minmax(0, 1fr);
        }
      }
    </style>
  </head>
  <body>
    <site-page>
      <h1>The actress of Padua, and other tales</h1>
      <uvalib-metadata
        creator="Smith, Richard Penn"
        rights="http://rightsstatements.org/vocab/NoC-US/1.0/"
        rights-info="https://www.library.virginia.edu/policies/use-of-materials"
        citation-title="The actress of Padua, and other tales"
      >
        <dl>
          <dt>Date</dt>
          <dd>1836</dd>
          <dt>Subjects</dt>
          <dd>
            <ul>
              <li>Short stories</li>
              <li>American literature -- 19th century</li>
            </ul>
          </dd>
          <dt>Download</dt>
          <dd><a href="eaf375v1.epub" download data-size="184 KB">EPUB</a></dd>
        </dl>
      </uvalib-metadata>
      <div class="reader">
        <uvalib-contents sticky>
          <ol>
            <li><a href="#preface">Preface</a></li>
            <li>
              <a href="#padua">The actress of Padua</a>
              <ol>
                <li><a href="#part-1">Part I. The Key</a></li>
              </ol>
            </li>
          </ol>
        </uvalib-contents>
        <article>
          <h2 id="preface">Preface</h2>
          <p>Text goes here.</p>
        </article>
      </div>
    </site-page>
  </body>
</html>
```

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
    <link
      rel="stylesheet"
      href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css"
    />
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

## 7. Library hours

Use these only on library.virginia.edu (or with the data endpoints repointed): the library list is the site's own same-origin Drupal JSON:API, so on any other origin they show "Hours are unavailable right now.".

- Home page: `<site-hours-section limited no-shadow-dom no-style>` from `site-hours-section.js`. `limited` keeps libraries with a priority placement; `place-type` (`Library`, `space`, `other-professional`) keeps one type. It fires `got-library-hours` then `got-libraries` (`detail: { message }`).
- /hours: keep Drupal's `<div type="library-weekly-hours" library-slug="…" no-shadow-dom no-style>` placeholders and add one `<library-hours-setup>` from `library-hours-setup.js` (it also registers `<library-weekly-hours>`). Do not hand-convert the placeholders.
- `<library-weekly-hours>` attributes: `library-slug`, `week-count` (0 is this week), `hide-building-hours`, `heading-level` (`headinglevelstart` is an old alias), `refresh-every` (ms). Harrison is a special case: the setup element adds `hide-building-hours` for `library-slug="harrison"` because its building calendar is also one of its spaces.
- Dates are America/New_York; today's column has `aria-current="date"`. Do not compute dates yourself.
- Off library.virginia.edu (local development, another origin), repoint the data before the define script runs with `window.uvalibHoursEndpoints = { libraries: '…', hours: '…' }`, or afterwards by assigning the class's static `endpoints`. Do not copy the hours data into the page.
- Migrating Drupal: `…/web-components/cdn-vX.Y.Z/@uvalib/site-hours/<file>.js` becomes `https://unpkg.internal.lib.virginia.edu/web-components/v1/<file>.js` for `site-hours-section`, `library-weekly-hours` and `library-hours-setup`; the markup stays. `library-daily-hours` is not migrated.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/library-hours-setup.js"
></script>
<div type="library-weekly-hours" library-slug="clemons" no-shadow-dom no-style></div>
<library-hours-setup></library-hours-setup>
```

### Library events

- `<events-section>` from `events-section.js`: upcoming events from LibCal (`cal.lib.virginia.edu`, which allows any origin, so it works on any site) as cards. Attributes: `limit` (default 8), `category` (LibCal category id), `query` (search), `heading-level` (1 to 6; leave it unset: it defaults to one below the nearest preceding heading in the page, or 3), `max-title-length` (old pages only: titles already clamp to three lines). Read `state` (`loading`, `ready`, `empty`, `error`). Dates and times are America/New_York; do not compute them yourself.
- On library.virginia.edu use `no-shadow-dom no-style`: the Drupal theme styles its classes (`event-container`, `event-url`, `event-title`, `event-date`, `event-time`). In light DOM the element installs one unlayered rule giving `.event-title` a 1rem top margin, so the theme's `h3` margin does not change the cards; do not override it or restyle the headings to compensate. Repoint the data with `window.uvalibEventsEndpoints = { events: '…', search: '…' }` before the define script, or the class's static `endpoints`.
- Migrating Drupal: `…/web-components/cdn-v2.0.8/@uvalib/bento-box/events-section.js` (or `https://unpkg.com/@uvalib/cdn-builds@1.0.2/build/events-section.js`) becomes `https://unpkg.internal.lib.virginia.edu/web-components/v1/events-section.js`; the markup stays (card headings follow the page's own headings, so no `heading-level` is needed), and drop the inline script that set `max-title-length`.

### Search results

- `<bento-box>` from `bento-box.js`: library.virginia.edu/search, a search bar and result sections from the Virgo catalog and articles, the subject guides and the library website. Attributes: `limit` (default 5, per section), `boxes` (default `catalog,articles,libguides,website`; a comma list or a JSON array), `search-describe`, `no-result-describe`, `placeholder`, `query` (used only when the URL has no `?q=` / `?query=`), `heading-level` (leave it unset: `<h2>` then `<h3>` under the page's `<h1>`). The query comes from `?q=`; searching pushes `?q=` and Back restores it; with no query nothing is fetched. Each section has a read-only `state` (`loading`, `ready`, `empty`, `error`).
- The website section reads Drupal's `/jsonapi/index/default_index`, which sends no CORS headers: off library.virginia.edu use `boxes="catalog,articles,libguides"`. Repoint sources with `window.uvalibBentoEndpoints = { authorize, catalog, articles, guides, website }` before the define script, or the class's static `endpoints`. Never render the sources' HTML yourself; the element already shows it as text.
- On library.virginia.edu use `no-shadow-dom no-style` inside the page's `.uvalib-bento-search` body class: the Drupal theme styles its classes (`bento-search-bar`, `bs-header`, `bs-results-container`, `bs-results--block`, `bs-results--header`, `bs-results--list`, `ul-0`, `ul-1`, …).
- Migrating Drupal: `…/web-components/cdn-v2.2.38/@uvalib/bento-box/bento-box.js` becomes `https://unpkg.internal.lib.virginia.edu/web-components/v1/bento-box.js`; the markup stays (`<bento-box no-style no-shadow-dom limit="3">`).

## 8. Verification checklist

Before finishing, load the page in a browser (or test) and confirm:

1. Every used tag is defined: `customElements.get('site-page')` (and header/footer) is not undefined.
2. Exactly one `<main>` in the page, including inside open shadow roots (shadow mode puts it in `site-page`'s shadow root), and exactly one skip link.
3. No `<script>`/`<link>` URL contains `/web-components/latest/` or `/cdn-v`; the URL pins `v1` or `vX.Y.Z`.
4. No console errors and no failed network requests for the component files (including `v1/uvalib-alerts.js` from the alerts CDN, unless `no-alerts` is set).
5. Accessibility, as in [reference/accessibility-testing.md](reference/accessibility-testing.md):
   - axe-core in Playwright, with Lighthouse's rules forced on plus the WCAG 2.1/2.2 AA and best-practice tags, reports **no violations at any impact level** on every page you changed, at desktop and phone widths, after the components upgrade (and in each open state: menus, dialogs, errors);
   - Lighthouse CI scores accessibility 1 (and layout shift ≤ 0.05) on those pages;
   - a keyboard-only pass (visible focus, skip link, Escape closes, focus returns) and a screen reader spot check found no problems.
     If you cannot run one of these, say so explicitly instead of reporting the page as accessible.
6. `no-shadow-dom` appears only where the host CSS is meant to own the styling.
7. A full header shows the library main navigation (unless the site deliberately set `no-main-nav`), and the page has no second hand-built copy of it.
8. `color-scheme-switch` appears only where the user asked for dark mode and the site's own content supports it; if it is set, the page passes the axe test in both Light and Dark.
9. A sub-site's name is `site-name` on `<site-page>`, not a hand-built title bar; buttons and search boxes in the content use the `.uvalib-button` / `.uvalib-input` / `.uvalib-search-form` classes, toggles carry `aria-pressed`, and every field has a label.
10. With analytics: no hand-written listener duplicates what the components already report, host-page tracking uses `data-uvalib-track`, and no event name holds a title, URL, search text or personal data.

## 9. Keeping this skill current

This skill is a copy. `installed.json` next to this file records the package version it came from. When the user asks about updating it, or the page loads a newer component version than that, check it with `npx @uvalib/web-components@latest install-skill --check --dir <skills-dir>` (`<skills-dir>` is the folder that holds this skill, usually `.claude/skills`); it prints the update command when a newer release exists.
