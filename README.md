# @uvalib/web-components

Reusable web components for UVA Library sites, built with Lit and TypeScript:

- **Page chrome:** `<site-page>` (skip link, header with the library main navigation and live library alerts, one `<main>`, footer), `<site-header>`, `<site-main-nav>`, `<site-footer>`, `<site-analytics>` (Matomo) and `<site-style>` (legacy compatibility).
- **Search:** `<uvalib-filter>` and `<uvalib-date-range>`.
- **Library hours:** `<site-hours-section>`, `<library-weekly-hours>` and `<library-hours-setup>`.

[library.virginia.edu](https://www.library.virginia.edu) and the UVA Library design system are the style authority: these components exist so sites use the real chrome instead of copying it. Change appearance only through the theming surface below.

## Quick start with a coding agent

The fastest route: install the agent skill, then ask your coding agent (Claude Code and others) to do the work. The skill teaches it which entry to load, how to pin versions, shadow vs light DOM, theming, alerts and hours, and how to check the result.

```sh
npx @uvalib/web-components install-skill   # copies the skill to .claude/skills/uvalib-web-components
```

Then ask, for example:

> Wrap this site's pages in the UVA Library `<site-page>` from the v1 CDN, with our own nav links in the header.

- `npx` fetches the package on the fly, so this works in any repository, including sites that only use script tags (it needs Node, not an npm dependency).
- Other agents or folders: `npx @uvalib/web-components install-skill --dir .agents/skills`. Add `--force` to update an existing copy.
- Or copy `node_modules/@uvalib/web-components/skills/uvalib-web-components` into your skills folder. The skill is also on the CDN at `https://unpkg.internal.lib.virginia.edu/web-components/v1/skills/uvalib-web-components/SKILL.md`. More in [docs/usage.md](docs/usage.md#agent-skill).

### Keeping the skill current

Each install is a copy stamped with its package version (`installed.json` next to `SKILL.md`), so it does not change as this library does. Update it after a release:

```sh
npx @uvalib/web-components@latest install-skill --dir .claude/skills --force
```

`--check` compares an installed copy with the latest release on npm. It prints one line with that update command only when the copy is missing or out of date, is silent when it is current, and never fails offline (`--strict` exits 1 when it is out of date, for CI). To be told automatically, add it as a Claude Code SessionStart hook, in the project's `.claude/settings.json` (or `~/.claude/settings.json` with `--dir ~/.claude/skills` for a user-level copy):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx --yes @uvalib/web-components@latest install-skill --check --dir .claude/skills"
          }
        ]
      }
    ]
  }
}
```

Projects that commit `.claude/skills/` get each update as an ordinary reviewed change.

To do it by hand, read on.

## Playground

Try every component and mode, edit the code, and share a link: <https://uvalib.github.io/reusable-web-library/>

The page lists the examples by component (Page, Header, Alerts, Search, Hours) beside one editor with a live preview. Each example has its own link, such as [`#weekly-hours`](https://uvalib.github.io/reusable-web-library/#weekly-hours). Copy link puts your edited files in the URL (`#files=…`), so the link opens with your changes; Reset goes back to the example. Old `playground.html` links, share links included, redirect to the page.

## Install

### CDN script tag (plain HTML, 11ty, Drupal templates)

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
></script>
```

- `https://unpkg.internal.lib.virginia.edu/web-components/v1/<tag>.js` is the major alias. It follows releases within major 1 and is cached for about 5 minutes.
- `https://unpkg.internal.lib.virginia.edu/web-components/vX.Y.Z/<tag>.js` is an exact, immutable version. Use it to pin.
- `tokens.css` and `base.css` live at the same prefix (`.../v1/tokens.css`).
- Never use the legacy `/web-components/latest/` or `/web-components/cdn-v*` paths; they belong to the old components. See [migration](docs/migration.md).
- `site-page.js` also loads the header and footer. Add `site-analytics.js` only when the site needs Matomo.

### npm (bundled apps)

```sh
npm i @uvalib/web-components
```

```js
import '@uvalib/web-components/site-page.js'; // registers site-page, site-header, site-main-nav and site-footer
```

The define entries are `site-page.js`, `site-header.js`, `site-main-nav.js`, `site-footer.js`, `site-analytics.js`, `site-style.js`, `uvalib-filter.js`, `uvalib-date-range.js`, `site-hours-section.js`, `library-weekly-hours.js` and `library-hours-setup.js`. The package root (`import '@uvalib/web-components'`) exports the classes only and registers nothing. To use a class such as `SitePage` directly, also import the define entries. CSS is available as `@uvalib/web-components/tokens.css` and `base.css`. Do not load the same component from both the CDN and npm on one page.

## Quick start

```html
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

Use one `<site-page>` per page. It renders the skip link, the header, a single `<main id="main-content">` and the footer around your content, so do not add your own `<main>`, skip link, header or footer. Put content for a band above the footer in an element with `slot="pre-footer"`. Tool and app-like pages where the site footer does not belong (such as this repo's examples page) add `no-footer`, which hides the footer and any pre-footer band. Live library alerts are shown by default (see [Alerts](#alerts)). Third-party sites use `<site-page header-variant="vendor">`. Links default to `root-link-domain="https://www.library.virginia.edu"`.

Caveat: replacing a light-mode `<site-page>`'s children wholesale (`innerHTML` or `textContent`) destroys the chrome. Append content, or update a container inside it.

### Site navigation

A site with its own navigation puts it in the header instead of the library utility links (My account, Ask a Librarian, Hours, Give, Alerts, Search). Give `<site-page>` (or a standalone `<site-header>`) `<a slot="site-links">` children:

```html
<site-page site-links-label="Web components">
  <a slot="site-links" href="./" aria-current="page">Examples</a>
  <a slot="site-links" href="https://github.com/uvalib/reusable-web-library#readme">README</a>
  …page content…
</site-page>
```

The links replace the utility links in both the inline nav on wide screens and the Menu popover on narrow ones, in order. Their `href` is used as written (not joined to `root-link-domain`), and `aria-current`, `target`, `rel` and `hreflang` are kept; mark the current page with `aria-current="page"`, which is shown bold with a thick underline. `site-links-label` names the nav (default `Site`; the popover's nav is "… menu"). Adding, removing or editing the links later updates the header. Children that are not `<a href>` with text (a link with empty or whitespace-only text has no accessible name) are ignored with a console warning. Without site links the header is unchanged. The `vendor` header variant ignores site links and keeps its reduced link set.

### Main navigation

Every full header shows the UVA Library main navigation, as on library.virginia.edu: About, Using the Library, Research & teaching support and Get help. It is on by default for `<site-page>` and a standalone `<site-header>`, with or without site links. Above 992px it is a full-width row under the logo row, with the brand-blue rule under it; at 992px and below it leads the Menu popover as accordions, above the utility or site links. The `vendor` header variant never shows it.

- **Turn it off** with `no-main-nav` on `<site-page>` or `<site-header>`. The header is then exactly what it was before the main navigation existed.
- **Its name** is "Main" (`main-nav-label` changes it). Exactly one main navigation landmark is visible at a time: the row above 992px, the accordion inside the open Menu popover at 992px and below (and none while the popover is closed).
- **Replace its links**, in this order of precedence:
  1. A `<nav slot="main-nav">` child of `<site-page>` or `<site-header>`. `<li><a href>` is a direct link; `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` is a group. The source markup stays hidden; adding, removing or editing it later updates the header. Invalid entries are skipped with one console warning, and links nested deeper than a group are shown in their group.
  2. The `items` property of a standalone `<site-main-nav>` (`MainNavItem[]`: `{ label, href }` or `{ label, items: [{ label, href }] }`). `<site-page>` and `<site-header>` have no such property; use the slot or `main-nav-src` there.
  3. `main-nav-src` on `<site-page>` or `<site-header>` (`items-src` on `<site-main-nav>`): a URL of JSON in the same shape, which needs CORS. The bundled menu shows until it loads. It is tried twice, a second apart, and each attempt times out after 10 seconds. If both fail (network errors, timeouts, or no valid entries), after about 21 seconds at worst, the bundled menu stays and `site-main-nav-error` is fired once, with `detail` `{ src, message }`.
  4. Otherwise: the bundled snapshot of the live menu.

  ```html
  <site-page>
    <nav slot="main-nav">
      <ul>
        <li><a href="/exhibits">Exhibits</a></li>
        <li>
          <span>Collections</span>
          <ul>
            <li><a href="/collections/maps">Maps</a></li>
          </ul>
        </li>
      </ul>
    </nav>
    …page content…
  </site-page>
  ```

- **Links:** relative hrefs are joined to `root-link-domain`; absolute ones are kept as written.
- **Keyboard:** it is a disclosure navigation (buttons with `aria-expanded` and lists of links), not an ARIA menu, so Tab moves through everything as usual. Click, Enter or Space opens or closes a group, and only one is open at a time. Escape closes it and returns focus to its button. ArrowDown on an open group's button moves into its links; the arrow keys, Home and End move between the group buttons and between a group's links. On wide screens a group also closes when focus leaves the navigation or on a click outside it. Nothing opens on hover.
- **Current page:** the link matching the page's URL (host and path; the query, the hash, a trailing slash and a leading `www.` are ignored) gets `aria-current="page"`, and its group's button `aria-current="true"`. Both are shown bold with a thick orange underline, not by colour alone. When two links differ only by hash, one is marked: the one with the page's hash, else the one without a hash. The marking follows same-document navigations (`popstate`, `hashchange`, and the Navigation API's `currententrychange` where the browser has it), so a single-page app that changes the URL needs nothing more. An app whose route is not its URL sets `main-nav-current` on `<site-page>` or `<site-header>` (`current` on `<site-main-nav>`) to the URL to mark; while it is set, the location is not followed.
- **Keeping it current:** the menu is a snapshot of the desktop "Main navigation" menu on library.virginia.edu, committed in `src/components/site-main-nav/main-nav-data.ts`. There is no runtime fetch. `pnpm sync:main-nav` regenerates it from the live home page (the desktop menu is canonical; Drupal's separate "Mobile Main Nav" menu has drifted and is ignored). Review the diff and release.
- **Accessibility:** focus rings sit inside the controls and keep 3:1 contrast (orange on white, brand blue on the grey of a hovered or open group). In forced-colors mode the open panel keeps an edge and the open group and hovered controls are outlined.
- **Header height:** above 992px the header is about 54px taller (the main navigation row). At 992px and below it is unchanged.

### Alerts

`<site-page>` shows live UVA Library alerts by default. It renders the [`<uvalib-alerts>`](https://github.com/uvalib/uvalib-alerts) component, which is released separately and loaded at runtime from the alerts CDN: one `<script type="module" src="{base}v1/uvalib-alerts.js">` is added to `<head>`, once per document however many pages there are, and not at all if `<uvalib-alerts>` is already defined or a script with that `src` is already present.

| Attribute    | Default      |                                                                                                                                                    |
| ------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alerts-env` | `production` | `production` or `staging`. Any other value logs one console warning and uses production.                                                           |
| `alerts-src` |              | Base URL holding `config.json`, `alerts.json` and `v1/uvalib-alerts.js`. Overrides `alerts-env`; for a custom domain, local development and tests. |
| `no-alerts`  | off          | Render no alert elements and load no script.                                                                                                       |

The bases are `https://d2q6t6fdv76k7r.cloudfront.net/` (production) and `https://dzfvxb8mejnv6.cloudfront.net/` (staging), exported as `ALERTS_PRODUCTION_SRC` and `ALERTS_STAGING_SRC`; they move to `alerts.lib.virginia.edu` and `alerts-staging.lib.virginia.edu` once those names exist. The vendor header variant gets the same default.

Alerts render where Virgo shows them, inside landmarks: the header banner (`show="header"`) full-bleed at the very top of the header (flush with its top and both edges, after the skip link and before the logo row); the alert list (`show="list"`) in a full-bleed band directly under the header and above `<main>`, a `<section class="alerts-list" aria-label="Library alerts">` region that is hidden while the list has nothing to show; and the page-targeted regional alerts (`show="regional"`) as the first child of `<main>`, inside its padding and before your content. `<main>`'s own padding is unchanged. `<site-header>` has an `alerts` slot for the banner, but a standalone header never loads anything. Changing `no-alerts` later adds or removes the alerts. The component code loads once per document, from the first base URL; changing `alerts-env` or `alerts-src` later re-points the existing elements' data (`config.json`, `alerts.json` and the live connection) at the new base without loading the code again. `alerts-src` is resolved against the document's base URL, with any query or hash dropped. If the script fails to load, one console warning is logged per URL, the page is otherwise unchanged, and a later corrected `alerts-src` or env (or another page) tries again. In light mode (`no-shadow-dom`) these are real children: the regional `<uvalib-alerts>` is the first child of `<main>`, the banner the first child of the header's `<header>`, and the `section.alerts-list` band sits between `<site-header>` and `<main>`, so host CSS such as `main > :first-child` or `site-header + *` matches them.

Do not add another `<uvalib-alerts>` inside a `<site-page>`. An app that renders alerts itself (Virgo uses the component headless) sets `no-alerts`.

**Content Security Policy:** a site with a CSP must allow the alerts host in `script-src` (the component) and `connect-src` (`config.json` and `alerts.json`), plus the AppSync realtime socket in `connect-src`:

```text
script-src  https://d2q6t6fdv76k7r.cloudfront.net;
connect-src https://d2q6t6fdv76k7r.cloudfront.net wss://*.appsync-realtime-api.us-east-1.amazonaws.com;
```

(Use the staging host, or your `alerts-src` host, instead where that applies.) Alert bodies can include images, so allow their hosts in `img-src` too. Alert bodies are inserted as HTML, so a page that enforces Trusted Types (`require-trusted-types-for 'script'`) is incompatible with the alerts; use `no-alerts` there.

## Rendering modes

| Attributes               | Rendering                                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none)                   | Shadow DOM, styled by the library. The default.                                                                                                             |
| `no-shadow-dom`          | Light DOM. Component styles are installed in `@layer uvalib` and scoped to the tag, so unlayered host CSS wins. Content added later is moved into `<main>`. |
| `no-shadow-dom no-style` | Light DOM with no component styles. The host page styles everything, as library.virginia.edu does.                                                          |
| `no-style` (shadow)      | Shadow DOM; the shadow root adopts no component styles.                                                                                                     |

`no-style` does not stop `<site-page>` from installing the global tokens, base and accessibility styles or the Typekit link. When the host owns base typography, also set `no-global-styles`.

Light-mode component styles live in `@layer uvalib`, scoped to their tag. Unlayered host CSS always wins over them. Cascade layers declared earlier have lower priority, and `uvalib` is created when its first rule is parsed, so a host's own named layers that were declared before it (for example Tailwind v4's) are ordered before `uvalib` and lose to it. To let host layers win, put the host CSS unlayered, or declare `@layer uvalib` first in the host stylesheet (`@layer uvalib, base, utilities;`).

**Page-level base styles are unlayered (trade-off).** The base rules that `<site-page>` installs (unless `no-global-styles`) and that `<site-style no-shadow-dom>` installs (`html`, `body`, the `*` box-sizing, and the accessibility rules) are unlayered and adopted after the document's stylesheets. They beat a host's unlayered rules of equal specificity, such as Tailwind's preflight `html { font-family }`, and any layered host CSS, such as Tailwind v4 layers or utilities on `body`. A host overrides them with a more specific selector or `!important`, or opts out with `no-global-styles` on `<site-page>` (or by not using `<site-style>`). The tokens (`:root { --uva-* }`) stay in `@layer uvalib`, so a host's own unlayered `:root { --uva-brand-blue: … }` still wins.

The mode is read once, at first connect; do not toggle it afterwards.

## Tokens and theming

- **Tokens:** inherited `--uva-*` custom properties (for example `--uva-brand-blue`, `--uva-font-family`), set on `:root` or an ancestor of the component. The full set is in `tokens.css`. Components read tokens with fallbacks and never set them.
- **Parts (shadow mode):** on a page, `site-page::part(header)`, `site-page::part(footer)` and `site-page::part(main)`. For a standalone element, `site-header::part(header)` or `site-footer::part(footer)`.
- **Light mode** has no shadow parts; use ordinary selectors, which win over the layered component styles.

## Search and filter components

`<uvalib-filter>` (a checkbox facet with optional scope chips and See more / See less) and `<uvalib-date-range>` (a year slider plus date inputs) are for search results pages. They are not page chrome, so use them inside `<site-page>`. Each has its own entry: `uvalib-filter.js` and `uvalib-date-range.js` on the CDN, `@uvalib/web-components/uvalib-filter.js` and `.../uvalib-date-range.js` on npm.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-filter.js"
></script>
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-date-range.js"
></script>

<uvalib-filter id="people" limit="5"></uvalib-filter>
<uvalib-date-range id="dates" min="1819-01-01" max="2026-12-31"></uvalib-date-range>
<script type="module">
  const people = document.querySelector('#people');
  people.filter = {
    name: 'people',
    title: 'People',
    position: 0,
    buckets: [{ key: 'Ada', doc_count: 3, selected: false }],
  };
  people.addEventListener('filter-change', (e) => (people.value = e.detail.value));
  document
    .querySelector('#dates')
    .addEventListener('date-range-change', (e) => console.log(e.detail.value));
</script>
```

Both are controlled: set `value` (and `scopeValue`) from your own state after each event. `min` and `max` are required for the date range; without valid ones it renders nothing and warns once in the console. Both support `no-shadow-dom` and `no-style`. See the [Search facets](https://uvalib.github.io/reusable-web-library/#search-facets) example in the playground and the generated reference below.

## Library hours

Three elements show opening hours from the library's own data, for library.virginia.edu. Each has its own entry (`site-hours-section.js`, `library-weekly-hours.js`, `library-hours-setup.js` on the CDN; `@uvalib/web-components/<tag>.js` on npm); `library-hours-setup.js` also registers `<library-weekly-hours>`.

| Element                  | Use                                                                                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<site-hours-section>`   | Today's hours, as on the home page: the date, a "Today's hours" heading, a list of libraries and their hours, and a link to `/hours`. `limited` keeps the libraries with a priority placement; `place-type` keeps one type. |
| `<library-weekly-hours>` | One library's week (Sunday to Saturday) as a table, with Previous / Next week buttons: `library-slug`, `week-count`, `hide-building-hours`, `heading-level`, `refresh-every`.                                               |
| `<library-hours-setup>`  | Upgrades Drupal's placeholders on /hours: each `<div type="library-weekly-hours" …>` in its root node becomes a `<library-weekly-hours>` with the same attributes (except `type`) and children, now and when added later.   |

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-hours-section.js"
></script>
<site-hours-section limited no-shadow-dom no-style></site-hours-section>
```

- **Data and origin.** The library list comes from the library website's Drupal JSON:API (`/jsonapi/index/default_index?filter[type]=library&page[limit]=100`), a relative, same-origin URL with no CORS, so the elements work only on library.virginia.edu unless the endpoints are repointed. Hours come from LibCal (`cal.lib.virginia.edu`, CORS `*`) with LibCal's public widget key. The list is fetched once per page and LibCal requests are shared between elements. Each attempt times out after 10 seconds; failed or timed-out fetches are retried twice, a second apart.
- **Repointing the endpoints** (local development, tests, another origin). Both URLs are shared by every hours element: `libraries` (the JSON:API URL) and `hours` (LibCal, with `{ids}` for the calendar ids; `from` and `to` are appended). Elements already in the HTML start fetching as soon as their script defines them, so set the override **before** the define script runs:

  ```html
  <script>
    // For example a saved copy of the JSON:API response, served by your dev server.
    window.uvalibHoursEndpoints = { libraries: '/dev-data/libraries.json' };
  </script>
  <script
    type="module"
    src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-hours-section.js"
  ></script>
  ```

  It is read once, at the first fetch. Afterwards, assign the static `endpoints` of either class: `customElements.get('site-hours-section').endpoints = { libraries: '…' }` (or `LibraryWeeklyHours.endpoints` from npm) writes through to the shared URLs, and requests are cached by URL, so the change applies from each element's next load (a week change, a refresh or the next day). A JSON:API on another origin must allow CORS (library.virginia.edu's does not).

- **Dates** ("today" and the week) are always America/New_York, whatever the visitor's time zone. Today's column is marked with `class="today"` and `aria-current="date"`. The elements update when the date changes in New York; `<library-weekly-hours>` also refetches the current week every `refresh-every` ms (default 600000, 0 turns it off).
- **States.** On the first load a polite `role="status"` says "Loading hours…". Later loads keep the current rows on screen (the weekly table gets `aria-busy="true"`) until the new data lands. If the data cannot be loaded the status says "Hours are unavailable right now."; `<library-weekly-hours>` keeps its week header and adds a Retry button, and both elements retry quietly on their timers. Only user actions (the week buttons, Retry) are announced; midnight rollovers and background refreshes are silent. Read the read-only `state` (`loading`, `ready` or `error`) from script.
- **Harrison special case.** `<library-hours-setup>` adds `hide-building-hours` to `library-slug="harrison"`: Harrison's building calendar (LibCal 4114) is also the calendar of its own "Harrison/Small Building & Exhibitions" space, so the building row would repeat it.
- **Light DOM output** keeps the class names Drupal's CSS targets (`home-hours-block`, `hours-locations`, `weekly-hours-header-section`, `weekly-hours-body-section`, `date--mobile`, `lib-space-link`, …). `<library-weekly-hours>` keeps a few layout rules even with `no-style` (the host is `display: block`, the week header is a flex row, `[hidden]` hides), scoped to the tag in `@layer uvalib`. `headinglevelstart` is still read as an alias of `heading-level`.
- **Drupal switch.** Replace the old `…/web-components/cdn-vX.Y.Z/@uvalib/site-hours/<file>.js` script URLs with `https://unpkg.internal.lib.virginia.edu/web-components/v1/<tag>.js` (`site-hours-section.js` on the home page, `library-hours-setup.js` on /hours). The markup stays the same. `library-daily-hours` is not migrated.

## Components

Generated from `dist/custom-elements.json` by `scripts/gen-reference.mjs`; do not edit between the markers by hand.

<!-- components:start -->
<!-- prettier-ignore-start -->

### `<library-hours-setup>`

Upgrades Drupal's hours placeholders. On library.virginia.edu/hours Drupal renders `<div type="library-weekly-hours" library-slug="…" no-shadow-dom no-style>` for each library; this element replaces each one, in its own root node (the document or a shadow root), with a `<library-weekly-hours>` that has the same attributes (except `type`) and children. `library-slug="harrison"` also gets `hide-building-hours`. Placeholders added later are upgraded too, while this element is connected. It renders nothing.

### `<library-weekly-hours>`

One library's opening hours for a week (Sunday to Saturday, in America/New_York): a header with "Previous week" / "Next week" buttons and the date range, then a table with a "Building hours" row and a row per space in the library. Data comes from the library website's JSON:API (same origin) and LibCal, shared between all hours elements on a page. Used on library.virginia.edu/hours through `<library-hours-setup>`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `library-slug` | `string \| undefined` |  | The library's `field_slug` in Drupal (for example `clemons`). |
| `week-count` | `number` | `0` | Which week to show: 0 is this week, 1 next week, -1 last week. Changed by the buttons. |
| `refresh-every` | `number` | `600000` | How often (ms) the current week's hours are fetched again. 0 turns it off. |
| `hide-building-hours` | `boolean` | `false` | Hide the "Building hours" row (for a library whose building calendar is one of its spaces). |
| `heading-level` | `number \| undefined` |  | `aria-level` (1–6) of the week heading, also its `heading-h<n>` class. Default 2. |
| `headinglevelstart` | `number \| undefined` |  | Old name of `heading-level`, still accepted; `heading-level` wins. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `building-hours` | The "Building hours" table row (shadow mode). |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-orange` | `#e57200` | Border of today's column; focus ring colour. |
| `--uva-brand-blue` | `#232d4b` | Header and button colour. |

### `<site-analytics>`

Matomo analytics loader with no visual output. Listens on `document` for the events below.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `matomourl` | `string` | `'https://analytics.lib.virginia.edu/'` |  |
| `matomoid` | `number \| undefined` |  |  |
| `spa` | `boolean` | `false` |  |
| `variables` | `any` | `null` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Listens for (on document)

| Event | Description |
|---|---|
| `site-analytics-pageview` | Listened for on `document` (not fired): `detail` is `{ customTitle?, referrer? }`. |
| `site-analytics-search` | Listened for on `document` (not fired): `detail` is `{ searchQuery, searchCategory?, resultCount }`. |
| `site-analytics-event` | Listened for on `document` (not fired): `detail` is `{ event: any[] }`, passed to Matomo `trackEvent`. |

### `<site-footer>`

UVA Library site footer: link columns, contact details and copyright.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| `pre-footer` | Optional content shown in a band above the footer links. |

#### CSS parts

| Part | Description |
|---|---|
| `footer` | The `<footer>` element. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Main footer background (also the skip-link background in the shared accessibility sheet, which the footer does not render). |
| `--uva-blue-alt-300` | `#bfe7f7` | Pre-footer band background. |
| `--uva-blue-alt-darkest` | `#141e3c` | Copyright bar background. |
| `--uva-brand-orange` | `#e57200` | Social icon hover colour and focus-visible outline. Footer link and text colours are fixed white. |

### `<site-header>`

UVA Library site header: logo, utility navigation, and a popover menu on narrow screens. A site can replace the library utility links (My account, Ask a Librarian, Hours, Give, Alerts, Search) with its own: give the header `<a slot="site-links" href="…">` children. They are shown, in order, in the inline nav and the Menu popover, with `href` as written (not joined to `root-link-domain`) and their `aria-current`, `target`, `rel` and `hreflang`. The source anchors themselves stay hidden. Children that are not `<a href>` with text (empty or whitespace-only text counts as none) are ignored with one console warning. The `vendor` variant ignores site links and keeps its own reduced link set. The full header also shows the UVA Library main navigation (`<site-main-nav>`): a row under the logo row on wide screens, and an accordion at the top of the Menu popover on narrow ones (992px and below), above the utility or site links. `no-main-nav` turns it off, leaving the header exactly as it was without it; the `vendor` variant never shows it. A `<nav slot="main-nav">` child replaces its links (see `<site-main-nav>`), and `main-nav-src` loads them from JSON; `main-nav-current` sets the URL marked current.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `variant` | `'full' \| 'vendor'` | `'full'` |  |
| `site-links-label` | `string \| undefined` |  | Accessible name of the nav when site links replace the utility links (default "Site"; the popover nav's name adds " menu"). |
| `no-main-nav` | `boolean` | `false` | Hide the UVA Library main navigation (the row under the logo and the popover accordion). |
| `main-nav-label` | `string \| undefined` |  | Accessible name of the main navigation (default "Main"). |
| `main-nav-src` | `string \| undefined` |  | URL of JSON main navigation items (`MainNavItem[]`, needs CORS), passed to `<site-main-nav items-src>`. |
| `main-nav-current` | `string \| undefined` |  | The URL whose main-navigation link is marked current, passed to `<site-main-nav current>`. Default: the page location, followed through same-document navigations. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| `skip-link` | Shadow mode only: optional skip link, rendered first inside `<header>` (`<site-page>` uses it). |
| `alerts` | Optional alert banner (`<site-page>` passes its `<uvalib-alerts show="header">`), shown as a full-bleed row at the very top of `<header>` (flush with its top and both edges, outside its padding), after the skip link and before the logo row. In light mode the children are moved to the start of `<header>`. The header never loads alerts itself. |
| `main-nav` | Optional `<nav>` whose `<ul>` replaces the main navigation's links in both layouts: `<li><a href>` for a direct link, `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` for a group. Invalid entries are skipped with one console warning. Never shown itself; in light mode it is moved into a hidden holder. Ignored with `no-main-nav` and by the `vendor` variant. |
| `site-links` | Optional `<a href>` elements with text that replace the library utility links in the inline nav and the Menu popover (ignored by the `vendor` variant). In light mode they are moved into a hidden holder. |

#### CSS parts

| Part | Description |
|---|---|
| `header` | The `<header>` element. |

#### Events

| Event | Description |
|---|---|
| `site-main-nav-error` | `main-nav-src` could not be loaded; the bundled main navigation is shown. `detail` is `{ src, message }`. Fired once, from the bar's `<site-main-nav>`; bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Utility link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Menu button colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline), and the underline colour of an `aria-current` link (also bold, with a 3px underline). |
| `--uva-brand-blue` | `#232d4b` | Skip-link background for a skip link slotted into `skip-link` (shadow mode, shared accessibility sheet). |

### `<site-hours-section>`

Today's hours for the UVA libraries, as on the library.virginia.edu home page: the date (in America/New_York), a "Today's hours" heading, a list of library and hours pairs and a link to /hours. Data comes from the library website's JSON:API (same origin) and LibCal, shared between all hours elements on a page. The date and hours update when the date changes in New York.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `limited` | `boolean` | `false` | Only libraries with a priority placement (the home page's short list). |
| `heading-level` | `number` | `3` | The level of the "Today's hours" heading, 2 to 6. The default, 3, fits the home page, where the section sits under an h2; use 2 when it sits directly under the page's h1. |
| `place-type` | `string \| null` | `null` | Only libraries of this type (`Library`, `space` or `other-professional`). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `got-library-hours` | The hours were loaded. `detail` is `{ message }`. Bubbles and is composed. |
| `got-libraries` | The libraries were loaded (fired after `got-library-hours`). `detail` is `{ message }`. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Heading and link colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour. |
| `--site-hours-list-min-height` | `0` | Height the list keeps while the hours load, so the link and content below do not jump when they arrive (seven `limited` libraries take about 12.75rem). |

### `<site-main-nav>`

The UVA Library main navigation (About, Using the Library, Research & teaching support, Get help), as on library.virginia.edu, following the WAI-ARIA disclosure navigation pattern: one `<nav>` landmark; each group is a `<button aria-expanded aria-controls>` followed by its list of links, and an entry with no group is a plain link. Click, Enter or Space toggles a group and only one is open at a time; Escape closes it and returns focus to its button; arrow keys, Home and End move between the buttons and between a panel's links, and ArrowDown on an open button moves into its panel. In the `bar` layout a panel also closes when focus leaves the nav or on a pointer press outside it. There is no hover-to-open. The items come from, in order of precedence: a `<nav slot="main-nav">` child holding `<ul><li><a href>…</a></li></ul>` (a direct link) or `<li><span>Group</span><ul><li><a href>…` (a group), kept hidden and watched for changes; the `items` property; JSON at `items-src`; and the snapshot of the live menu bundled with the component (see `pnpm sync:main-nav`). Invalid entries are skipped and levels deeper than two are flattened, each with one console warning. Relative hrefs are joined to `root-link-domain`; absolute ones are kept. The link for the current page (`current`, default the page location, followed through same-document navigations; host and path, ignoring the query, the hash, a trailing slash and a leading `www.`) gets `aria-current="page"`, and its group button `aria-current="true"`, shown bold with a thick underline. `<site-header>` renders it: as a row under the logo on wide screens and as an accordion in the Menu popover on narrow ones.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Main'` | Accessible name of the navigation landmark. |
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `items-src` | `string \| undefined` |  | URL of JSON in the `MainNavItem[]` shape (needs CORS); the snapshot is shown until it loads, and if it fails. |
| `layout` | `'bar' \| 'accordion'` | `'bar'` | `bar` (a row of buttons with floating panels) or `accordion` (stacked, panels in flow). |
| `current` | `string \| undefined` |  | The URL whose link is marked current. Default: the page location, followed through same-document navigations (`popstate`, `hashchange`, and the Navigation API's `currententrychange` where supported). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| `main-nav` | Optional `<nav>` (or `<ul>`) whose list replaces the menu: `<li><a href>` for a direct link, `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` for a group. It is never shown itself; in light mode it is moved into a hidden holder. |

#### Events

| Event | Description |
|---|---|
| `site-main-nav-error` | `items-src` could not be loaded: both attempts failed (network error, a 10 s timeout per attempt, or no valid entries), after about 21 s at worst; the nav shows the bundled snapshot. `detail` is `{ src, message }`. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-grey-darkest` | `#2b2b2b` | Top-level button colour. |
| `--uva-brand-blue` | `#232d4b` | Bar bottom border, chevrons, panel links, and the hover and expanded button text. |
| `--uva-grey-100` | `#dadada` | Hover and expanded button background, and panel link hover background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour, and the underline of the current page's link and group (also bold, with a 3px underline). |
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Font family. |

### `<site-page>`

Page wrapper: skip link (inside the header landmark in shadow mode), header, a single `<main>`, footer (unless `no-footer`), and global page styles. Side-effect free: `site-page.ts` registers `<site-header>` (and its `<site-main-nav>`) and `<site-footer>`. The header shows the UVA Library main navigation by default (`no-main-nav` turns it off; `header-variant="vendor"` never shows it). Shows live UVA Library alerts by default, placed as Virgo places them: a full-bleed `<uvalib-alerts show="header">` banner at the top of the header landmark (after the skip link), a full-bleed band between the header and `<main>` holding `<uvalib-alerts show="list">` (a `<section aria-label="Library alerts">` region, hidden while the list has nothing to show), and `<uvalib-alerts show="regional">` as the first child of `<main>`, inside its padding. The alerts component is loaded once per document, with a module script, from the alerts CDN (`alerts-env`, or `alerts-src`); if it fails to load, one console warning is logged and the page works as before. `no-alerts` renders no alert elements and loads nothing.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `header-variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-global-styles` | `boolean` | `false` |  |
| `no-footer` | `boolean` | `false` | Hide the footer (and any pre-footer band), for tools and app-like pages where the site footer does not belong. The footer is kept hidden rather than removed, so toggling the attribute keeps pre-footer content. |
| `site-links-label` | `string \| undefined` |  | Accessible name of the header navigation when site links are given (default "Site"). |
| `no-main-nav` | `boolean` | `false` | Hide the UVA Library main navigation in the header. |
| `main-nav-label` | `string \| undefined` |  | Accessible name of the header's main navigation (default "Main"). |
| `main-nav-src` | `string \| undefined` |  | URL of JSON main navigation items, forwarded to `<site-header main-nav-src>`. |
| `main-nav-current` | `string \| undefined` |  | The URL whose main-navigation link is marked current, forwarded to `<site-header main-nav-current>`. Default: the page location, followed through same-document navigations; set it when a single-page app's route is not its URL. |
| `alerts-env` | `string` | `'production'` | Alerts environment: `production` (default) or `staging`. Any other value logs one console warning and uses production. Ignored when `alerts-src` is set. |
| `alerts-src` | `string \| undefined` |  | Alerts base URL (holding `config.json`, `alerts.json` and `v1/uvalib-alerts.js`); overrides `alerts-env`. For a custom domain, local development and tests. |
| `no-alerts` | `boolean` | `false` | Render no alert elements and load no alerts script. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | Main page content, rendered inside the single `<main>`. |
| `pre-footer` | Optional content shown in a band above the footer. |
| `site-links` | Optional `<a href>` elements, forwarded to `<site-header>`, that replace the library utility links in the header (inline nav and Menu popover). Ignored with `header-variant="vendor"`. |
| `main-nav` | Optional `<nav>` forwarded to `<site-header>`, whose list replaces the UVA Library main navigation's links (see `<site-main-nav>`). Ignored with `no-main-nav` and `header-variant="vendor"`. |

#### CSS parts

| Part | Description |
|---|---|
| `main` | The `<main>` landmark. |
| `header` | The `<header>` element inside `<site-header>` (shadow mode; exported through `exportparts`). |
| `footer` | The `<footer>` element inside `<site-footer>` (shadow mode; exported through `exportparts`). |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Skip link background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Page font family (global styles). |
| `--uva-font-size-base` | `17px` | Page base font size (global styles). |
| `--uva-grey-darkest` | `#2b2b2b` | Page text colour (global styles). |

### `<site-style>`

Compatibility element. Light mode (`no-shadow-dom`) installs the tokens and base page styles on the document. Shadow mode only styles inside its own shadow root, so the `:root` and `html, body` rules of those sheets match nothing there and the slotted content is not restyled; it inherits whatever inherited tokens and fonts the page already provides.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `imports` | `{ [key: string]: string }` | `{}` | Map of tag name to a module URL whose default export is a stylesheet; ported as is. |
| `importedstyles` | `string` | `''` | Accumulated text of the stylesheets loaded through `imports`. Carried over from the old component for compatibility; it is not rendered anywhere. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | Content rendered in shadow mode; it is not restyled by this element. In light mode there is no shadow root and the children stay in place. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Font family. |
| `--uva-font-size-base` | `17px` | Base font size. |
| `--uva-grey-darkest` | `#2b2b2b` | Text colour. |

### `<uvalib-date-range>`

A date-range picker: a two-thumb year slider plus "From" and "To" date inputs. `min` and `max` (ISO dates, `YYYY-MM-DD`) are required; without valid ones the element renders nothing and logs a console warning once. The start can never pass the end, and both stay within `min`..`max`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `min` | `string` | `''` | Earliest selectable date, `YYYY-MM-DD`. Required. |
| `max` | `string` | `''` | Latest selectable date, `YYYY-MM-DD`. Required. |
| `value` | `string[]` | `[]` | Selected `[start, end]` ISO dates. Missing, invalid or out-of-range entries fall back to `min` / `max`. |
| `label` | `string` | `'Date range'` | Legend text; the two sliders are named from it ("<label>: start year"). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `date-range-change` | The range changed from a slider or a date input. `detail` is `{ value: [start, end] }` (ISO dates). Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Selected slider range, thumbs, legend and focused date input border. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |
| `--uva-font-family` | `inherit` | Font family. |

### `<uvalib-filter>`

A faceted-search filter: a fieldset of checkboxes (value plus result count), optional toggle chips ("scopes") above them, and "See more" / "See less" buttons when `limit` is set. It is controlled: set `filter`, `value` and `scopeValue` from your search state and listen for the change events.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `filter` | `FilterFacet` | `{ name: '', title: '', position: 0, buckets: [] }` | The facet to show: `{ name, title, position, buckets: [{ key, doc_count, selected }] }`. |
| `value` | `string[]` | `[]` | Selected bucket keys (matched case-insensitively). |
| `scopes` | `FilterScopeOption[]` | `[]` | Optional toggle chips shown under the legend (for example attendee types): `[{ value, label }]`. |
| `scopevalue` | `string[]` | `[]` | Pressed scope values (matched case-insensitively). |
| `scopes-label` | `string` | `''` | Accessible name of the scope chip group. Empty (the default) means `Filter <title> by type`. |
| `limit` | `number` | `0` | Maximum buckets to show at first; 0 shows all. "See more" doubles it, "See less" halves it back. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `see-more` | The "See more" button (shadow mode). |
| `see-less` | The "See less" button (shadow mode). |

#### Events

| Event | Description |
|---|---|
| `filter-change` | A checkbox was toggled. `detail` is `{ name, value }`: the facet name and the new array of selected keys. Does not bubble. |
| `scope-change` | A scope chip was toggled. `detail` is `{ value }`: the new array of pressed scope values. Does not bubble. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Scope chip text, hover border and pressed background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |

<!-- prettier-ignore-end -->
<!-- components:end -->

## Development

- `pnpm install`
- `pnpm test` builds first (`pnpm build`, then the playground site with `--base /dist-site/`), then runs the Node tests and the browser tests (headless Chromium).
- `pnpm test:node` runs the Node tests alone; it needs a prior `pnpm build`.
- `pnpm test:browser` runs the browser tests alone; it needs a prior `pnpm build` and `pnpm build:site --base /dist-site/`.
- `pnpm build` builds the npm output (`dist/`, which also regenerates this README's component section and the skill's `reference/components.md`) and the CDN output (`dist-cdn/`).
- `pnpm lint` runs ESLint and Prettier.

### Quality checks

Three automated checks guard accessibility, best practice and performance. The first two run in `pnpm test`; Lighthouse is slower and runs on its own (`pnpm lhci`, and the `lighthouse` job in the `CI` workflow).

- **axe, at every impact level.** `expectNoAxeViolations` (`test/helpers/axe.ts`) fails on minor, moderate, serious and critical violations, so best-practice rules such as `heading-order`, `region` and the landmark rules count. Every visual component is audited in shadow and light DOM, and in the states people use: menus and groups open (the header Menu popover at 390px, `site-main-nav` at 1280px and 390px), `uvalib-filter` expanded with a scope pressed and a box checked, `uvalib-date-range` with the sliders on one year and dates typed, and the hours elements loading, loaded and failing. Full-page tests use `expectNoPageAxeViolations`, which audits the whole document so the rules that only match `<html>` (`landmark-one-main`, `page-has-heading-one`) run too; it gives the test runner's bare page a `<title>` and `lang` first, and disables no rule. Tests never reach the network: `test/helpers/*-intercept.mjs` route the alerts, hours and main-nav hosts to fixtures.
- **Bundle-size budgets.** `test/size-budget.test.mjs` gzips (level 9) every entry in `dist-cdn/manifest.json` together with every chunk it imports, statically or with `import()` (site-page's lazy site-footer), each counted once, and fails if one exceeds its budget in `test/size-budgets.json` (about 12% over the sizes below). `node scripts/bundle-sizes.mjs` prints today's sizes against the budgets. When a change has to grow a bundle, raise its budget in the same PR and say why.

  | Entry                     | gzip (bytes) | Budget |
  | ------------------------- | -----------: | -----: |
  | `site-page.js`            |       30,082 | 33,700 |
  | `site-header.js`          |       19,463 | 21,800 |
  | `site-main-nav.js`        |       14,795 | 16,600 |
  | `site-footer.js`          |       15,017 | 16,900 |
  | `site-analytics.js`       |        9,676 | 10,900 |
  | `site-style.js`           |        9,580 | 10,800 |
  | `uvalib-filter.js`        |       12,150 | 13,700 |
  | `uvalib-date-range.js`    |       10,623 | 11,900 |
  | `site-hours-section.js`   |       14,699 | 16,500 |
  | `library-weekly-hours.js` |       14,524 | 16,300 |
  | `library-hours-setup.js`  |       15,128 | 17,000 |
  | `tokens.css`              |          592 |    670 |
  | `base.css`                |          226 |    260 |

- **Lighthouse CI** (`pnpm lhci`, `@lhci/cli`, settings and assertions in `lighthouserc.json`). The playground's previews run in a cross-origin sandbox, so `scripts/lhci.mjs` writes each example in `site/src/presets.ts` as a plain page into a temporary folder, next to a copy of the site build's `cdn/` (the local `dist-cdn`) and `data/`, serves it from localhost and audits it with Playwright's Chromium (Lighthouse's default mobile emulation, three runs per page, about 10 minutes). Assertions use each metric's median over the three runs, since a single run's CLS depends on when the page's first paint lands. Each page must score 1.0 for accessibility, at least 0.95 for best practices and 0.9 for performance, with CLS at most 0.05 and TBT at most 200 ms. Nothing reaches the network: Typekit and the alerts CDN are blocked (site-page treats both as optional, so the pages fall back to the system font stack and show no alerts, and their font swap is not measured); the header logo and LibCal are answered locally (a same-size stand-in logo through `root-link-domain`, and every library open 8am–10pm), with the library website and LibCal also blocked as a backstop. `pnpm lhci` builds first; reports are left in `.lighthouseci/`.
- `pnpm sync:main-nav` regenerates the bundled main navigation (`src/components/site-main-nav/main-nav-data.ts`) from the desktop "Main navigation" menu of the live library.virginia.edu home page. `node scripts/sync-main-nav.mjs saved.html` reads a saved page instead. It exits non-zero, writing nothing, if the menu's structure is not found or has fewer than 2 groups or 6 links. Commit the result.
- `pnpm start` runs the Vite dev server for the playground site (`site/`) and the demos (`demo/`), rooted at the repo: open `/site/` for the examples page, or `/demo/` for the demo pages. In dev, `cdn/<tag>.js` is served straight from `src/components/`, so edits show up on reload.
- Previews run on the playground-elements sandbox at unpkg.com (never self-hosted: share links run untrusted code), which needs internet access. Locally, that public origin has to load the components from `http://localhost`; Vite's localhost-only CORS policy and Chrome's local network protections block this, so the components may not render in previews under `pnpm start` or `vite preview`. The editors, plain HTML previews and share links still work. Components render in previews on GitHub Pages, which serves `cdn/` with `Access-Control-Allow-Origin: *`.
- `pnpm build:site` builds the playground site into `dist-site/` for GitHub Pages (base `/reusable-web-library/`). It needs a prior `pnpm build`, and copies `dist-cdn/` to `dist-site/cdn/`. Serve it locally with `npx vite preview -c vite.site.config.ts`.
- The playground deploys from `.github/workflows/pages.yml` on every push to `main` (and on manual dispatch): install, test, `pnpm build && pnpm build:site`, then upload and deploy to GitHub Pages.

## Releasing

From a clean, up-to-date `main`:

```sh
pnpm release <patch|minor|major> --dry-run   # runs the lint/test/build checks, prints the plan; commits, tags and pushes nothing
pnpm release <patch|minor|major>             # lint, test, build, bump, tag vX.Y.Z, push
```

The first release must be `pnpm release major` (0.0.0 → 1.0.0).

Pull requests to `main` run `.github/workflows/ci.yml` in GitHub Actions (install, lint, test) with a read-only token and no secrets; pushes to `main` are tested by `.github/workflows/pages.yml`.

One `v*` tag starts two independent releases. Each can be re-run on its own, and no npm token is stored anywhere:

- **npm:** `.github/workflows/release-npm.yml` (GitHub Actions) publishes `@uvalib/web-components` with npm Trusted Publishing (OIDC), with no secrets. It has two jobs. `verify` has a read-only token and no publish identity: it checks that the tag is `vX.Y.Z`, that its commit is the checked-out commit and is on `main`, and that it matches `package.json`, then installs with `--ignore-scripts` and runs lint and tests. `publish` waits for `verify`, runs in the `npm` GitHub environment with `id-token: write`, repeats the tag checks, installs a pinned npm, installs with `--ignore-scripts`, builds, and runs `npm publish --access public` (provenance is automatic for a public repo). A version already on npm is skipped. To re-run it, use "Re-run jobs" on the tag's workflow run; after GitHub's 30-day retention, push a new patch tag instead. There is no manual trigger.
- **CDN:** an AWS CodePipeline defined in the UVA Library's `terraform-infrastructure` repo (`aws_cicd/pipelines/reusable-web-library/`) runs `pipeline/buildspec-release.yml`:
  - It takes the release tag from the checked-out commit (exactly one `vX.Y.Z` tag), and refuses to publish unless that commit is on `main` and the tag matches `package.json`.
  - After lint and tests it uploads to the CDN: `vX.Y.Z/` (immutable, create-only) and the `vX/` major alias (synced without `--delete`, so hashed chunks from earlier releases stay available to cached entry files), then invalidates `/web-components/vX/*`. The alias is updated and invalidated only when the release is the highest `X.*.*` version present. It never writes the legacy `latest/` or `cdn-v*` prefixes.
  - Its IAM role is tightly scoped on the CDN bucket (list, read and write `web-components/v*` keys only) and explicitly denied the escalation paths the shared pipeline policy would otherwise grant (Secrets Manager, all of SSM, ECR, ECS, CodeCommit, CodeBuild, Terraform state, other pipelines' artifacts). It holds no npm credential.

One-time setup for the repo owner:

1. Apply `aws_cicd/pipelines/reusable-web-library/` in `terraform-infrastructure`, and make sure the GitHub connection's app installation includes this repository.
2. A GitHub tag ruleset restricts creating, updating and deleting `v*` tags, since pushing one releases. _Configured 2026-11-13:_ ruleset "release tags (v*)". Only the repository admin role and org owners can bypass it.
3. A GitHub environment `npm` (Settings > Environments) is required, not optional. _Configured 2026-11-13:_
   - Deployment branches and tags: "Selected", with a single **tag** rule `v*` and no branch rules.
   - Required reviewers: dougchestnut, mikedurbin, nestorw. Self-review is allowed. Administrator bypass is disabled, so every npm release needs one of them to approve.

   Why: npm's trusted publisher checks the repository, workflow filename and environment, but not the ref. The workflow that runs is the tag's own copy, so a write-access user could otherwise push a branch with a modified `release-npm.yml` and publish from it. The environment's tag rule, the reviewers and the tag ruleset are the real controls. The ancestry check inside the workflow catches mistakes, not a malicious maintainer.

4. GitHub Pages uses source "GitHub Actions" (Settings > Pages), so `.github/workflows/pages.yml` can deploy the playground. _Configured._
5. Bootstrap npm for 1.0.0 (below).

### First npm release (1.0.0 bootstrap)

A trusted publisher can only be added from an existing package's settings page, so 1.0.0 needs one manual publish:

1. `pnpm release major` pushes `v1.0.0`. The CDN release runs. The npm workflow's `publish` job waits for environment approval: **reject** it, because no trusted publisher exists yet and 1.0.0 is published by hand.
2. A maintainer publishes 1.0.0 from a clean checkout of the tag, in an interactive `npm login` session with 2FA and no token: `pnpm install --frozen-lockfile --ignore-scripts && pnpm lint && pnpm test && npm publish --access public`. (`pnpm test` builds, which `npm publish` needs.)
3. On npmjs.com, open the package's Settings > Trusted publishing and add a GitHub Actions publisher: organization `uvalib`, repository `reusable-web-library`, workflow `release-npm.yml`, environment `npm`, and allow direct `npm publish`.
4. Set publishing access to "Require two-factor authentication and disallow tokens".

npm expires a new trusted-publisher configuration that has not completed a successful publish within 2 days, and an expired one cannot be used or edited. Re-running the workflow on `v1.0.0` would not help: it skips, because 1.0.0 is already published, so nothing validates the configuration. Plan to ship the next release (for example 1.0.1) within 2 days of step 3. If it has expired, delete the configuration, add it again, and publish within 2 days. `package.json` `repository.url` is `git+https://github.com/uvalib/reusable-web-library.git`, which is npm's normal form and matches the repository as npm requires.

## Migration

Moving from the old `/web-components/latest/` and `cdn-v*` URLs or the old `@uvalib/<pkg>` npm names: see [docs/migration.md](docs/migration.md).
