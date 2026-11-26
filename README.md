# @uvalib/web-components

[![Tests](https://img.shields.io/endpoint?url=https%3A%2F%2Fuvalib.github.io%2Freusable-web-library%2Freport%2Fbadges%2Ftests.json)](https://uvalib.github.io/reusable-web-library/report/) [![Accessibility](https://img.shields.io/endpoint?url=https%3A%2F%2Fuvalib.github.io%2Freusable-web-library%2Freport%2Fbadges%2Faccessibility.json)](https://uvalib.github.io/reusable-web-library/report/) [![Lighthouse](https://img.shields.io/endpoint?url=https%3A%2F%2Fuvalib.github.io%2Freusable-web-library%2Freport%2Fbadges%2Flighthouse.json)](https://uvalib.github.io/reusable-web-library/report/#lighthouse)

Reusable web components for UVA Library sites, built with Lit and TypeScript:

- **Page chrome:** `<site-page>` (skip link, header with the library main navigation and live library alerts, one `<main>`, footer), `<site-alerts>` (the alerts, also usable alone), `<site-header>`, `<site-main-nav>`, `<site-footer>`, `<site-analytics>` and `<uvalib-analytics>` (Matomo, one element under two names) and `<site-style>` (legacy compatibility).
- **Navigation:** `<uvalib-breadcrumbs>` (the breadcrumb trail) and `<uvalib-contents>` (sub-navigation or a table of contents).
- **Cards:** `<uvalib-card>`, `<uvalib-card-grid>` and `<uvalib-pager>`.
- **Tabs:** `<uvalib-tabs>`.
- **Long pages:** `<uvalib-back-to-top>` (a “Back to top” button that appears once the top has scrolled away).
- **Records:** `<uvalib-metadata>` (a record's details, credit, rights and how to cite) and `<uvalib-citation>` (a citation in several formats, with Copy citation).
- **Images:** `<uvalib-lightbox>` (an image viewer over plain links), `<uvalib-photo-grid>` (justified rows of thumbnails) and `<uvalib-image-regions>` (numbered region outlines on an image, with their list).
- **Maps:** `<uvalib-map>` (places on the page's own Leaflet map, sized by a count, with a linked list).
- **Search:** `<uvalib-filter>`, `<uvalib-date-range>`, `<uvalib-date-histogram>`, `<uvalib-combobox>` (a text field that suggests values as you type), `<uvalib-list-filter>` (a field that filters a long list on the page as you type), `<uvalib-filter-drawer>` (the filters as a sidebar, or a modal panel on phones), `<uvalib-dialog>` (a modal dialog for search tips, Cite or a short form) and `<uvalib-pagefind-search>` (with `pagefind.css`, the library theme for Pagefind static-site search).
- **Reading texts:** `edition.css` (reading styles for TEI texts converted to class-annotated HTML).
- **Library hours:** `<site-hours-section>`, `<library-weekly-hours>` and `<library-hours-setup>`.
- **Library events:** `<events-section>`.
- **Search results:** `<bento-box>` (library.virginia.edu/search), with its `<catalog-section>`, `<articles-section>`, `<libguides-section>` and `<website-section>`.

[library.virginia.edu](https://www.library.virginia.edu) and the UVA Library design system are the style authority: these components exist so sites use the real chrome instead of copying it. Change appearance only through the theming surface below.

## Quick start with a coding agent

The fastest route: install the agent skill, then ask your coding agent (Claude Code, Codex, Gemini CLI, GitHub Copilot, Cursor, Grok and others) to do the work. The skill teaches it which entry to load, how to pin versions, shadow vs light DOM, theming, alerts and hours, and how to check the result.

```sh
npx @uvalib/web-components install-skill            # this project, for every agent
npx @uvalib/web-components install-skill --global   # your home folder, for every project
```

It is an [Agent Skills](https://agentskills.io) folder (`SKILL.md` and its references), the open format most coding agents read. By default it goes into `.claude/skills/` (Claude Code) and `.agents/skills/` (the shared folder that Codex, Gemini CLI, GitHub Copilot, Cursor, Grok and other tools read); `--global` uses `~/.claude/skills/` and `~/.agents/skills/` instead. See [Installing the skill](#installing-the-skill) for one agent's own folder.

Then ask, for example:

> Wrap this site's pages in the UVA Library `<site-page>` from the v1 CDN, with our own nav links in the header.

### Example prompts

Name the skill so the agent loads it, say what to keep, and ask it to audit before editing and to check accessibility before finishing. These are starting points; add your site's specifics.

**Brand a new or existing site**

> Use the uvalib-web-components skill to apply UVA Library branding to this site with the v1 CDN. First audit, with no changes: list how the current header, footer, navigation, buttons, forms and colours map to the library components and classes, and show me the list. Then wrap every page in `<site-page site-name="Our site name">` with our own links as site links, link `base.css` in `<head>`, replace hand-built buttons and search forms with the library classes, and move our colours onto the `--uva-*` tokens. Keep every page and URL working. Verify with the skill's accessibility testing guide and commit on a new branch; don't push until I approve.

**Migrate from the old components**

> Use the uvalib-web-components skill to move this project off the old `/web-components/latest/` and `cdn-v…` URLs and `@uvalib/<package>` npm names to `@uvalib/web-components` v1. List every old reference first, then change them following the skill's migration guide, keeping the markup working. Run the site's tests and check each page in a browser.

**Switch one library.virginia.edu page**

> Use the uvalib-web-components skill's "Switching library.virginia.edu" table to update the script URLs on the /hours page to v1. Change only the URLs, keep the markup, and tell me what to check after it's live.

**Add one pattern**

> Use the uvalib-web-components skill to add breadcrumbs to every page under /collections/ (Home › Collections › the collection) with `<uvalib-breadcrumbs>`, placed where `<site-page>` puts them.

> Use the uvalib-web-components skill to turn our collections list into a grid of clickable `<uvalib-card>`s (title and item count), and add `<uvalib-pager>` previous/next links to the reading pages.

> Use the uvalib-web-components skill to show each record's details with `<uvalib-metadata>` (creator, date, subjects, downloads with file sizes, rights and how to cite), and open our IIIF page images in `<uvalib-lightbox>` instead of a new tab.

> Use the uvalib-web-components skill to theme our Pagefind search with `<uvalib-pagefind-search>` and `pagefind.css`, keeping our index shards and filters.

**Dark mode, analytics and search pages**

> Use the uvalib-web-components skill to turn on the library's opt-in dark mode (Light / Dark / System in the header) and make our own CSS follow the `--uva-color-*` role tokens. Check contrast in both schemes.

> Use the uvalib-web-components skill to add Matomo analytics with `<site-page matomo-id="42">`. This is a single-page app, so record a page view per route; tag our own Download and Share buttons with `data-uvalib-track`.

**Check and fix accessibility**

> Use the uvalib-web-components skill's accessibility testing guide to add a Playwright + axe test matched to Lighthouse and a Lighthouse CI config to this project, run them on the home, a list, a detail and the search page in light and dark at phone and desktop widths, and fix what they find. Report anything you couldn't test.

**Ask for something the library doesn't have**

> Our pages need an accordion and the library has none. Use the uvalib-web-components skill to check the repo's issues for an existing request, then draft a new-component issue for uvalib/reusable-web-library (what it's for, our public page URLs, the library.virginia.edu pattern to match, accessibility needs). Show me the draft before filing it, and build a small accessible stopgap that links the issue.

**Keep it current**

> Update the uvalib-web-components skill in this project to the latest release, then check whether anything we use changed and needs updating.

### Installing the skill

`npx` fetches the package on the fly, so this works in any repository, including sites that only use script tags (it needs Node, not an npm dependency).

| Command                                | Installs to                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `install-skill`                        | `.claude/skills/` and `.agents/skills/` in this project                         |
| `install-skill --global`               | `~/.claude/skills/` and `~/.agents/skills/`, for every project on this computer |
| `install-skill --agent gemini,copilot` | each named agent's own folder (add `--global` for the home folder)              |
| `install-skill --agent all`            | every folder below                                                              |
| `install-skill --dir <folder>`         | one folder of your choosing                                                     |
| `install-skill --list …`               | prints the folders it would use, and changes nothing                            |

| `--agent` | Project folder   | Global folder       | Read by                                                                                    |
| --------- | ---------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| `agents`  | `.agents/skills` | `~/.agents/skills`  | the shared Agent Skills folder: Codex, Gemini CLI, GitHub Copilot, Cursor, Grok and others |
| `claude`  | `.claude/skills` | `~/.claude/skills`  | Claude Code (also read by Copilot, Cursor and Grok)                                        |
| `codex`   | `.agents/skills` | `~/.agents/skills`  | OpenAI Codex                                                                               |
| `gemini`  | `.gemini/skills` | `~/.gemini/skills`  | Gemini CLI                                                                                 |
| `copilot` | `.github/skills` | `~/.copilot/skills` | GitHub Copilot (cloud agent, CLI, VS Code and other IDEs)                                  |
| `cursor`  | `.cursor/skills` | `~/.cursor/skills`  | Cursor                                                                                     |
| `grok`    | `.agents/skills` | `~/.grok/skills`    | Grok                                                                                       |

The default (`claude` and `agents`) covers all of these. A tool that reads more than one of the folders (Copilot, Cursor and Grok read both `.claude/skills` and `.agents/skills`) may list the skill twice; the copies are identical, so it does no harm, or install for one folder with `--agent`. Agents check their folders when a session starts, so start a new session after installing. Add `--force` to replace an existing copy.

Without the installer: copy `node_modules/@uvalib/web-components/skills/uvalib-web-components` into a skills folder, or point a chat assistant without skills at `https://unpkg.internal.lib.virginia.edu/web-components/v1/skills/uvalib-web-components/SKILL.md`. More in [docs/usage.md](docs/usage.md#agent-skill).

### Keeping the skill current

Each install is a copy stamped with its package version (`installed.json` next to `SKILL.md`), so it does not change as this library does. Update it after a release with the same options you installed with, plus `--force`:

```sh
npx @uvalib/web-components@latest install-skill --force            # or: --global --force
```

`--check` compares the installed copies with the latest release on npm. It prints one line per copy, with that update command, only when a copy is missing or out of date, is silent when they are current, and never fails offline (`--strict` exits 1 when one is out of date, for CI). To be told automatically, run it when your agent starts a session; for Claude Code, a SessionStart hook in the project's `.claude/settings.json` (or `~/.claude/settings.json` with `--global` for the copies in your home folder):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx --yes @uvalib/web-components@latest install-skill --check"
          }
        ]
      }
    ]
  }
}
```

Agents with their own session-start hooks can run the same command; otherwise run it with `--strict` in CI. Projects that commit `.claude/skills/` and `.agents/skills/` get each update as an ordinary reviewed change.

To do it by hand, read on.

## Requests and bug reports

Ask for a new component, a feature or change in an existing one, or report a bug through [the repository's issues](https://github.com/uvalib/reusable-web-library/issues/new/choose). Each has a form: **New component**, **Feature or change request** and **Bug report**. The repository is public, so leave out passwords, tokens, internal-only hostnames and personal data. The agent skill knows the forms too: ask your agent to search the existing issues, draft one, and file it once you approve it (it uses the GitHub CLI, `gh`, or gives you the form's link).

## Test results

Every push to `main` is tested before the examples site is published, and the results go up with it: **[test report](https://uvalib.github.io/reusable-web-library/report/)**. Lighthouse takes about half an hour, so it runs alongside: the site goes up as soon as the tests pass, showing the previous Lighthouse results (marked as from an earlier commit), and is published again with this commit's when the audit finishes. It lists:

- **Tests:** every build and package test (Node) and every component test (Chromium), file by file, with each test's outcome.
- **Accessibility:** the axe-core checks, in shadow and light DOM, light and dark, held to WCAG 2.2 AA plus the extra rules Lighthouse enables. Lighthouse must also score 100 for accessibility on every example.
- **Lighthouse:** each example page's median performance, accessibility, best-practices, layout-shift and blocking-time results, against the budgets in [Quality checks](#quality-checks).

The badges above read the same report ([`report/results.json`](https://uvalib.github.io/reusable-web-library/report/results.json) has the numbers for scripts). Locally, `pnpm test`, `pnpm lhci` and `pnpm report` write it to `dist-site/report/`.

## Playground

Try every component and mode, edit the code, and share a link: <https://uvalib.github.io/reusable-web-library/>

The page is built with the library itself. Its header's main navigation is the examples menu: one group per component (Page, Header, Alerts, Search, Hours, Events), above one editor with a live preview; on phones the groups are accordions in the header's Menu. Each example has its own link, such as [`#weekly-hours`](https://uvalib.github.io/reusable-web-library/#weekly-hours). Copy link puts your edited files in the URL (`#files=…`), so the link opens with your changes; Reset goes back to the example. Old `playground.html` links, share links included, redirect to the page. The page also has [dark mode](#dark-mode): Light, Dark or System in the header (in the Menu on phones) switches the page and the editor; the previews run on another origin, so they keep their own scheme.

## Install

### CDN script tag (plain HTML, 11ty, Drupal templates)

```html
<link rel="stylesheet" href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css" />
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
></script>
```

- `https://unpkg.internal.lib.virginia.edu/web-components/v1/<tag>.js` is the major alias. It follows releases within major 1 and is cached for about 5 minutes.
- `https://unpkg.internal.lib.virginia.edu/web-components/vX.Y.Z/<tag>.js` is an exact, immutable version. Use it to pin.
- `tokens.css` and `base.css` live at the same prefix (`.../v1/tokens.css`), and so does `analytics.js`, the analytics helpers for a page's own scripts (`trackEvent`, `trackSearch`, `createSearchTracker`; no element, no Lit; see [Analytics](#analytics)).
- Never use the legacy `/web-components/latest/` or `/web-components/cdn-v*` paths; they belong to the old components. See [migration](docs/migration.md).
- `site-page.js` also loads the header and footer. For Matomo, give `<site-page>` a `matomo-id` (it then loads the analytics code itself), or add `site-analytics.js` and a `<site-analytics>` element; see [Analytics](#analytics).
- Link `base.css` in `<head>` too. `<site-page>` installs the same page-level base styles itself, but only after the first paint, so without the link the page jumps once: the browser's default body margin goes away, and a heading's top margin stops collapsing through the not-yet-upgraded `<site-page>` (layout shifts Lighthouse counts on every page). With the link, `<site-page>` also stays invisible until its script has run, so its content never paints above where the header goes; if the script fails to load, the content appears anyway after two seconds. Sites with `no-global-styles` skip `base.css`, as that attribute turns those styles off.

### npm (bundled apps)

```sh
npm i @uvalib/web-components
```

```js
import '@uvalib/web-components/site-page.js'; // registers site-page, site-header, site-main-nav and site-footer
```

The define entries are `site-page.js`, `site-header.js`, `site-main-nav.js`, `site-footer.js`, `site-analytics.js`, `uvalib-analytics.js`, `site-style.js`, `uvalib-filter.js`, `uvalib-date-range.js`, `uvalib-date-histogram.js`, `site-hours-section.js`, `library-weekly-hours.js`, `library-hours-setup.js`, `events-section.js`, `bento-box.js` and `uvalib-pagefind-search.js`. The package root (`import '@uvalib/web-components'`) exports the classes only and registers nothing. To use a class such as `SitePage` directly, also import the define entries. CSS is available as `@uvalib/web-components/tokens.css`, `base.css` and `pagefind.css` (the Pagefind theme, see [Static-site search](#static-site-search-pagefind)). `@uvalib/web-components/analytics.js` has the analytics helpers on their own (`base.js` exports them too). Do not load the same component from both the CDN and npm on one page.

## Quick start

```html
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

### Site name

A sub-site (Electronic Text Collections, a digital exhibit, a project site) names itself in the header with `site-name` on `<site-page>` (or a standalone `<site-header>`):

```html
<site-page site-name="Electronic Text Collections" site-name-href="/">…page content…</site-page>
```

The name sits after the library logo, past a thin divider, in the header's text colour, as a link to the site's home: `site-name-href`, default `/`. The logo still links to library.virginia.edu. The links have distinct names, each starting with its visible text (for voice control): "UVA Library home" and "Electronic Text Collections home". The name is not a heading, so the page keeps its own `<h1>`. On wide screens it shares the logo row and wraps to at most two lines without making the header taller, so keep it short (about 30 characters fit on one line from 1200px). When the links would not fit beside it on one line (with `color-scheme-switch`, or many site links, mostly between 993px and 1199px), the name moves under the logo, as on phones, so the links are laid out exactly as without a name and never overflow; the header is then taller by the name's lines. At 992px and below it gets its own lines under the logo, so it wraps cleanly on phones with no horizontal scroll. It works in light DOM and with the `vendor` variant (a vendor-hosted site can name itself too). A click reports `['site-header', 'site-name-click']`. Without `site-name` the header is unchanged.

### Main navigation

Every full header shows the UVA Library main navigation, as on library.virginia.edu: About, Using the Library, Research & teaching support and Get help. It is on by default for `<site-page>` and a standalone `<site-header>`, with or without site links. Above 992px it is a full-width row under the logo row, with the brand-blue rule under it; at 992px and below it leads the Menu popover as accordions, above the utility or site links. The `vendor` header variant never shows it.

- **Turn it off** with `no-main-nav` on `<site-page>` or `<site-header>`. The header is then exactly what it was before the main navigation existed.
- **Its name** is "Main" (`main-nav-label` changes it). Exactly one main navigation landmark is visible at a time: the row above 992px, the accordion inside the open Menu popover at 992px and below (and none while the popover is closed).
- **Replace its links**, in this order of precedence:
  1. A `<nav slot="main-nav">` child of `<site-page>` or `<site-header>`. `<li><a href>` is a direct link; `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` is a group. The source markup stays hidden; adding, removing or editing it later updates the header. Invalid entries are skipped with one console warning, and links nested deeper than a group are shown in their group.
  2. The `items` property of a standalone `<site-main-nav>` (`MainNavItem[]`: `{ label, href }` or `{ label, items: [{ label, href }] }`). `<site-page>` and `<site-header>` have no such property; use the slot or `main-nav-src` there.
  3. `main-nav-src` on `<site-page>` or `<site-header>` (`items-src` on `<site-main-nav>`): a URL of JSON in the same shape, which needs CORS. The bundled menu shows until it loads. It is tried twice, a second apart, and each attempt times out after 10 seconds. If both fail (network errors, timeouts, or no valid entries), after about 21 seconds at worst, the bundled menu stays and `site-main-nav-error` is fired once, with `detail` `{ src, message }`.
  4. Otherwise: the bundled snapshot of the live menu.

  The [examples page](https://uvalib.github.io/reusable-web-library/) is a working example: its main navigation is a slotted `<nav>` of `#<id>` links, one group per component, generated from its presets at build time (`site/src/main-nav.ts`).

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

- **Links:** relative hrefs are joined to `root-link-domain`; absolute ones are kept as written, and fragment-only ones (`#…`, a hash route) stay on the page. A plain click on a link closes the open group and the Menu popover, so a single-page app that handles the navigation in place leaves nothing open; a modified click (new tab or window) does not.
- **Keyboard:** it is a disclosure navigation (buttons with `aria-expanded` and lists of links), not an ARIA menu, so Tab moves through everything as usual. Click, Enter or Space opens or closes a group, and only one is open at a time. Escape closes it and returns focus to its button. ArrowDown on an open group's button moves into its links; the arrow keys, Home and End move between the group buttons and between a group's links. On wide screens a group also closes when focus leaves the navigation or on a click outside it. Nothing opens on hover.
- **Current page:** the link matching the page's URL (host and path; the query, the hash, a trailing slash and a leading `www.` are ignored) gets `aria-current="page"`, and its group's button `aria-current="true"`. Both are shown bold with a thick orange underline, not by colour alone. When two links differ only by hash, one is marked: the one with the page's hash, else the one without a hash; if every one has a hash, the first while the page has none, and none for a hash none of them has (a hash route the menu does not list). The marking follows same-document navigations (`popstate`, `hashchange`, and the Navigation API's `currententrychange` where the browser has it), so a single-page app that changes the URL needs nothing more. An app whose route is not its URL sets `main-nav-current` on `<site-page>` or `<site-header>` (`current` on `<site-main-nav>`) to the URL to mark; while it is set, the location is not followed.
- **Keeping it current:** the menu is a snapshot of the desktop "Main navigation" menu on library.virginia.edu, committed in `src/components/site-main-nav/main-nav-data.ts`. There is no runtime fetch. `pnpm sync:main-nav` regenerates it from the live home page (the desktop menu is canonical; Drupal's separate "Mobile Main Nav" menu has drifted and is ignored). Review the diff and release.
- **Accessibility:** focus rings sit inside the controls and keep 3:1 contrast (orange on white, brand blue on the grey of a hovered or open group). In forced-colors mode the open panel keeps an edge and the open group and hovered controls are outlined.
- **Header height:** above 992px the header is about 54px taller (the main navigation row). At 992px and below it is unchanged.

### Alerts

`<site-page>` shows live UVA Library alerts by default, drawn by this library's `<site-alerts>` in library.virginia.edu's look. The data comes from the [alerts project](https://github.com/uvalib/uvalib-alerts): its `<uvalib-alerts>` element, released separately and loaded at runtime from the alerts CDN, now only provides the data (alerts, live updates, dismissals and regional matching), used headless; its own UI is no longer rendered. One `<script type="module" src="{base}v1/uvalib-alerts.js">` is added to `<head>`, once per document however many pages there are, and not at all if `<uvalib-alerts>` is already defined or a script with that `src` is already present. `<site-alerts>`' own code is loaded only while alerts are on.

| Attribute    | Default      |                                                                                                                                                    |
| ------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alerts-env` | `production` | `production` or `staging`. Any other value logs one console warning and uses production.                                                           |
| `alerts-src` |              | Base URL holding `config.json`, `alerts.json` and `v1/uvalib-alerts.js`. Overrides `alerts-env`; for a custom domain, local development and tests. |
| `no-alerts`  | off          | Render no alert elements and load no script.                                                                                                       |

The bases are `https://d2q6t6fdv76k7r.cloudfront.net/` (production) and `https://dzfvxb8mejnv6.cloudfront.net/` (staging), exported as `ALERTS_PRODUCTION_SRC` and `ALERTS_STAGING_SRC`; they move to `alerts.lib.virginia.edu` and `alerts-staging.lib.virginia.edu` once those names exist. The vendor header variant gets the same default.

Alerts render where Virgo shows them, inside landmarks: the header banner (`<site-alerts show="header">`) full-bleed at the very top of the header (flush with its top and both edges, after the skip link and before the logo row); the alert list (`show="list"`) in a full-bleed band directly under the header and above `<main>`, a `<section class="alerts-list" aria-label="Library alerts">` region that is hidden while the list has nothing to show; and the page-targeted regional alerts (`show="regional"`) as the first child of `<main>`, inside its padding and before your content. `<main>`'s own padding is unchanged. `<site-header>` has an `alerts` slot for the banner, but a standalone header never loads anything. Changing `no-alerts` later adds or removes the alerts. Changing `alerts-env` or `alerts-src` later re-points the alerts at the new base without loading the code again. `alerts-src` is resolved against the document's base URL, with any query or hash dropped. If the script fails to load, one console warning is logged per URL, nothing is shown, the page is otherwise unchanged, and a later corrected `alerts-src` or env (or another page) tries again. In light mode (`no-shadow-dom`) these are real children (`<site-alerts no-shadow-dom>`): the regional one is the first child of `<main>`, the banner the first child of the header's `<header>`, and the `section.alerts-list` band sits between `<site-header>` and `<main>`, so host CSS such as `main > :first-child` or `site-header + *` matches them.

**The look and accessibility** (WCAG 2.2 AA, and AAA for alerts as the Library's web standard asks):

- Header banner: teal, centred, the title in bold then ":", a polite `role="status"`.
- List alerts, most severe first: critical (red), warning (yellow) and information (blue), each with a 10px left border, the theme's severity icon (decorative) and a visually hidden "Critical:", "Warning:" or "Information:" before the title, so severity is never colour alone. Titles are `<h2>` (as on library.virginia.edu; `heading-level` changes them on a `<site-alerts>`). Only critical alerts are an assertive `role="alert"`. Warning and information alerts have a 44px dismiss button, `aria-label="Dismiss alert: <title>"`; after a dismissal focus moves to the next alert (its button) or, with none left, to `<main>`, never to `<body>`. Information alerts stay listed until the reader closes them, as on library.virginia.edu (the alerts service marks them "seen" on arrival, Virgo's rule for its Alerts menu, so `<site-alerts>` keeps its own per-site record of what was closed, in localStorage under `<storage-key>:site-alerts-closed`); a closed warning is also dismissed in the alerts service. Closings are per site and sync across tabs.
- Regional alerts: yellow (warning) or teal (information) boxes with a visually hidden severity.
- Text is 7:1 or more on every alert background in light and dark (body text 10.1–13.0:1 light, 8.0–12.0:1 dark), icons follow the text colour, and the focus ring is the text colour on the alert's background. Under forced colors every alert keeps a system-colour border. library.virginia.edu's yellow and teal borders are decorative (1.7:1 and 2.0:1 on white); the icon, the hidden label and the background carry the alert.
- Alert bodies are server-sanitized HTML; where the browser has `setHTML()` it re-applies the alerts project's allowlist.

**`<site-alerts>` on its own.** Pages without `<site-page>` can use the element directly (`site-alerts.js`; npm `@uvalib/web-components/site-alerts.js`): `show` is `header`, `list`, `regional`, `sitewide` (header and list) or `all` (default), with `alerts-env`, `alerts-src`, `heading-level`, `storage-key` (the localStorage key for dismissals), `no-shadow-dom` and `no-style`. However many there are, one hidden headless `<uvalib-alerts>` per document (per base and storage key) feeds them all; the first `<site-alerts>` creates it at the end of `<body>` and the last one removes it. Sites that used the alerts project's UI (`<uvalib-alerts show="…">` with its script) can switch to `<site-alerts show="…">` with `site-alerts.js`; drop their own `uvalib-alerts.js` script, which `<site-alerts>` loads itself.

Do not add another `<site-alerts>` or `<uvalib-alerts>` inside a `<site-page>`. An app that renders alerts itself (Virgo uses the component headless) sets `no-alerts`.

**Content Security Policy:** a site with a CSP must allow the alerts host in `script-src` (the component) and `connect-src` (`config.json` and `alerts.json`), plus the AppSync realtime socket in `connect-src`:

```text
script-src  https://d2q6t6fdv76k7r.cloudfront.net;
connect-src https://d2q6t6fdv76k7r.cloudfront.net wss://*.appsync-realtime-api.us-east-1.amazonaws.com;
```

(Use the staging host, or your `alerts-src` host, instead where that applies.) Alert bodies can include images, so allow their hosts in `img-src` too. Alert bodies are inserted as HTML, so a page that enforces Trusted Types (`require-trusted-types-for 'script'`) is incompatible with the alerts; use `no-alerts` there.

### Printing

When a visitor prints a page (meeting minutes, a finding aid, an article), `<site-page>` prints only the content: the skip link, the header (with the main navigation and the header alert), the alert list band, the regional alerts, the breadcrumbs, the pre-footer band and the footer are left out, and `<main>` loses its side gutters. The content prints black on white, a dark scheme prints light, and the content's links are black and underlined, so they are told apart without colour. A short line above the content says where the page came from: “UVA Library — ” followed by the `site-name` (or else the page's `<title>`) and the page's URL, refreshed just before printing so a single-page app prints its current route. It is CSS generated content in a print-only rule, so screen readers never meet it on screen.

```html
<!-- Print the page as it is shown, header and footer included. -->
<site-page print-chrome> … </site-page>
```

- **`print-chrome`** keeps the header, alerts, breadcrumbs and footer in print (the scheme still prints light).
- **Both modes:** the rules are in `<site-page>`'s own styles (shadow or `no-shadow-dom`); the link colours and the light scheme come from the page-level base styles, so with `no-global-styles` the links keep your own print colours. With `no-style` none of this applies: print styles are yours.
- **Your own print rules** still apply: hide a sidebar or a back-to-top button of your own with `@media print { … }`. Browsers print the title and URL in the page margins too unless the visitor turns that off.

## Breadcrumbs

`<uvalib-breadcrumbs>` is the breadcrumb trail, with library.virginia.edu's look (slash separators, underlined `--uva-blue-alt-dark` links) at body size (1rem), as the design system asks. Entry: `uvalib-breadcrumbs.js` on the CDN, `@uvalib/web-components/uvalib-breadcrumbs.js` on npm. Inside `<site-page>` give it `slot="breadcrumbs"` and load both scripts:

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
></script>
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-breadcrumbs.js"
></script>
<site-page>
  <uvalib-breadcrumbs slot="breadcrumbs">
    <a href="/">Home</a>
    <a href="/research-and-teaching">Research &amp; teaching support</a>
    <span>Writing &amp; publication</span>
  </uvalib-breadcrumbs>
  <h1>Writing &amp; publication</h1>
</site-page>
```

- **Markup.** A `<nav aria-label="Breadcrumb">` (`label` changes the name) holding an `<ol>`, one `<li>` per step. The slashes are `aria-hidden` elements, so screen readers do not read them. The last step is the current page: a `<span aria-current="page">`, or a link with `aria-current="page"` when it has an href.
- **The trail as children.** `<a href>` children, ending with the current page as a text-only element (`<span>Writing</span>`) or a link (`<a href="…" aria-current="page">`). The last child is always the current page; an earlier child without an href is shown as plain text (a level with no page of its own). Hrefs are used as written (relative, hash routes); an href with another scheme than http(s), `mailto:` or `tel:` (such as `javascript:` or `data:`) makes that step plain text, with one console warning. Children with no text, and bare text, are skipped with one console warning. The trail follows changes to the children (added, removed, href and text), so a single-page app can rewrite them on each route. An empty trail renders nothing and, in `<site-page>`, takes no space.
- **Back to the search.** On a record reached from search results, give the Search crumb `data-return-from` with the search page's path (or several, separated by spaces): `<a href="/" data-return-from="/">Search</a>`. When the visitor came from that page on the same site with a query string (`document.referrer`; a trailing slash or `index.html` does not matter), the crumb links back to that search (`/?q=budget&date_start=2023`) instead of a blank one; its text stays the same. Otherwise (a new tab, another page, another site, no query, or a `Referrer-Policy` that sends no path) it keeps its href. Nothing is stored or sent. Referrers never carry the hash, so a hash-routed search cannot be returned to this way. In `items` the same is `returnFrom`. No inline script rewriting the crumb is needed.
- **Single-page apps.** The trail is drawn from copies of the children, so a router's own click handlers on them don't run. A plain click on a trail link fires `uvalib-breadcrumbs-navigate` (`detail: { href, index }`, bubbling, cancelable): cancel it with `preventDefault()` and navigate in the app (the click's own navigation is then prevented). Hash links need nothing.
- **The trail as data.** Apps that build it in JavaScript (React, Vue) set the `items` property: `el.items = [{ label: 'Home', href: '/' }, { label: 'Search' }]`. While set it wins over any children; assign a new array to change it, `undefined` to go back to the children. Entries without a label are skipped with one warning.
- **Placement.** In `<site-page>` the trail sits where library.virginia.edu puts it: after the header and the alert list band, before `<main>` and outside it, so the skip link lands past it, lined up with `<main>`'s content (same max width and 40px side padding, 16px above). In light mode (`no-shadow-dom`) it is moved there as a real child of `<site-page>`, never into `<main>`. Without a `slot="breadcrumbs"` child the page is unchanged. Elsewhere it is an ordinary block: put it first in the page content, above the `<h1>`.
- **Styles.** Links `--uva-color-utility-link` (else `--uva-blue-alt-dark`, #005679, as on library.virginia.edu), underlined; a linked current page in the text colour; the slash in `--uva-color-text-muted` (else `--uva-grey-dark`); the current page in the text colour; the library focus ring. Long trails wrap (no horizontal scroll at 320px). It follows dark mode through the role tokens. `no-style` keeps only the structure (an inline list without bullets or indent, the separators' spacing); light DOM styles are scoped to the tag in `@layer uvalib`, so a site's own CSS wins.

## Cards

`<uvalib-card>` is one summary: a collection (title and “N texts”), a photo, or anything similar. `<uvalib-card-grid>` lays those cards out. `<uvalib-pager>` is the previous/next row on a reading page, or a numbered page list. Entries: `uvalib-card.js`, `uvalib-card-grid.js` and `uvalib-pager.js` on the CDN, and the same paths under `@uvalib/web-components/` on npm.

```html
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
<site-page>
  <h1>Collections</h1>
  <uvalib-card-grid>
    <uvalib-card href="/collections/early-american-fiction/">
      <span slot="heading">Early American Fiction</span>
      128 texts
    </uvalib-card>
  </uvalib-card-grid>
  <uvalib-pager
    prev-href="/text/eaf375v1/d8/"
    prev-label="The opening"
    next-href="/text/eaf375v1/d10/"
    next-label="What follows"
  ></uvalib-pager>
</site-page>
```

- **A clickable card.** `href` makes the heading the link, and a CSS pseudo-element stretches that link over the card, so the whole card is one destination. The arrow is only a visual aid. Never wrap the card in an `<a>`. A clickable card must not contain another link, button or other control: the stretched link would cover it, and a link inside a link is invalid. The heading needs an accessible name (text, or an image alt or label); otherwise the link is hidden. A static card (no `href`, or an empty or unsafe one such as `javascript:`) has no stretch, so its excerpt may contain links. An unsafe href is shown as plain text, with one console warning.
- **Slots.** `media` (an `<img>` with a real alt, or `alt=""` when the heading already names it), `badge` (for example “13 photos”, over the image), `heading`, `meta` (a date in `<time>`, or a byline), `chip` (one element per category), `actions` (links or buttons on a static card, such as “Read the story” and “Photos (132)”) and the default slot for the excerpt. A clickable card must not contain an actions row: the stretched link would cover those controls, and the card warns once.
- **Circle media.** `media-shape="circle"` draws the media as a centered circle for a person or avatar. The image keeps its alt, and the count badge still sits on it. Any other value is ignored, with one warning.
- **Heading level.** Unset, it is one below the nearest heading before the card, or 3 when there is none (the same rule as `<events-section>`). `heading-level` (1–6) wins.
- **The grid.** A list, so a screen reader announces how many cards there are. Columns follow the grid’s own width: four above 992px, two through 767px, then one. Cards in a row match the tallest. `min-card-width` (a length such as `16rem`) switches that to `auto-fill` / `minmax`; anything else is ignored, with one warning. Only `<uvalib-card>` children are listed.
- **Previous/next.** `prev-href` and `next-href` (either may be omitted; with neither, nothing is rendered). Each link shows a “Previous” or “Next” kicker and, when set, `prev-label` or `next-label`. A long title truncates; the full text stays in the accessible name. The links use `rel="prev"` and `rel="next"`. The landmark’s name is `label`, or “Sections”.
- **Numbered pages.** Set `pages` (a positive count; it wins over previous/next, with one warning if those are set too). `page` is the current page, clamped to that range, and is text with `aria-current="page"`, not a link. Other pages use `href-template`, which must contain `{page}` (the default is `?page={page}`). A long range keeps the first page, a window around the current page, the last page, and an ellipsis where numbers are skipped. The landmark’s name is `label`, or “Pagination”.
- **One landmark name.** Two pagers with the same accessible name fail the accessibility check. Give the second a different `label`.
- **Load more.** `mode="load-more"` replaces the landmark with a group: a “Load more” button (`.uvalib-button`) and a polite “Showing N of M” (`shown` and `total`). It wins over numbered pages and previous/next, with one warning when those are also set. The button hides once `shown` has reached a positive `total`. Without a known total (ranked or semantic search), leave `total` unset (or 0): the count reads “Showing N” and the button stays. Add `has-more` while there is more and remove it (or set `hasMore = false`; `has-more="false"` also works, for templates that print false) after the last page. Once set, `has-more` alone decides whether the button shows, over `total`; `hasMore = undefined` returns to following `total`. It is one flag rather than a `has-more`/`no-more` pair, so the two can never contradict each other. If the button goes away while it has focus and `loaded()` was not called first, focus moves to the first new item of the `for` list, or else to the count, never to the page. `page` is the last loaded page (default 1). A click fires `load-more` with `{ page }` set to the next page. Call `loaded(firstNewElement)`, or set `for` to the list’s id and call `loaded()`, and focus moves to that new item (an element that cannot take focus gets `tabindex="-1"`). The group’s name is `label`, or “More results”.
- **Single-page apps.** A plain click fires `uvalib-card-navigate` (`detail: { href, position }`) or `uvalib-pager-navigate` (`detail: { href, kind, page? }`). Cancel it with `preventDefault()` and route in the app. `position` is `'single'` or `'1'`, `'2'`, …. `kind` is `'next'`, `'previous'` or `'number'`, and `page` is set only for `'number'`.
- **Styles.** A raised surface, a 1px border, and on hover or focus the shadow `0 0 20px 0 #DADADA`. Focusing the heading link draws the focus ring on the card. The chip is `--uva-blue-alt-300` on `--uva-blue-alt-dark` (6.13:1: WCAG AA for normal text, short of AAA’s 7:1). Dark mode follows the role tokens. `no-style` keeps the stretch, the grid and the truncation, and drops the colours.

## Chips

`<uvalib-chip-group>` is a row of chips: a segmented control or single-select filter (a year rail, a sort toggle), filter chips that toggle, or suggestion chips that go somewhere. Entry: `uvalib-chip-group.js` on the CDN, `@uvalib/web-components/uvalib-chip-group.js` on npm.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-chip-group.js"
></script>
<uvalib-chip-group label="Year" count-label="shoots" value="" scroll url-param="year">
  <button value="" data-count="3694">All Years</button>
  <button value="2004" data-count="213">2004</button>
  <button value="2005" data-count="461">2005</button>
</uvalib-chip-group>
<uvalib-chip-group label="Sort by" segmented value="photos">
  <button value="photos">Most photos</button>
  <button value="date">Date</button>
  <button value="title">Title A–Z</button>
</uvalib-chip-group>
<uvalib-chip-group
  label="Search by"
  segmented
  value="keyword"
  description="Keyword matches your words. Meaning finds meetings about your topic, even when the minutes put it differently."
>
  <button value="keyword">Keyword</button>
  <button value="meaning">Meaning</button>
</uvalib-chip-group>
<uvalib-chip-group mode="multi" label="Category" value="traditions">
  <button value="traditions" data-count="9">Traditions</button>
  <button value="sports" data-count="21">Sports</button>
</uvalib-chip-group>
<uvalib-chip-group mode="links" label="Suggested searches">
  <a href="/search?q=snow+on+the+Lawn">snow on the Lawn</a>
</uvalib-chip-group>
```

A colour key: `data-swatch` (or `swatch` in `items`) draws a small square of that colour before the label, so the filter chips double as a chart's or map's legend.

```html
<uvalib-chip-group mode="multi" label="Category" count-label="photos" value="athletics">
  <button value="athletics" data-count="4203" data-swatch="#e57200">Athletics</button>
  <button value="architecture" data-count="1180" data-swatch="#232d4b">Architecture</button>
  <button value="traditions" data-count="912" data-swatch="#25cad3">Traditions</button>
</uvalib-chip-group>
```

- **Modes.** `single` (the default): native radios drawn as chips in a `role="radiogroup"`. Tab enters at the selected chip and the arrow keys move and select, as in any radio group; `value` is a string. `multi`: toggle buttons with `aria-pressed`; `value` is an array (comma-separated as an attribute). `links`: links (or, without `href`, buttons) that fire `select` and have no selected state.
- **Chips.** Children: `<button value data-count>` (the value falls back to `data-value`, then the text; `disabled` disables), or `<a href>` in `links` mode (an unsafe href such as `javascript:` makes the chip plain text, with one warning; an empty one makes it a button). Or set `items` (`[{ value, label, count?, href?, disabled?, swatch? }]`), which wins over the children while set. The chips follow changes to the children.
- **Description.** `description` is a hint shown under the chips in small muted text and tied to the group (the `radiogroup`, or the `group` in `multi` and `links`) with `aria-describedby`, so a screen reader reads it when focus enters the group. It is an attribute, not a slot, on purpose: the text lives in the element's own root next to the group, so the reference works in shadow DOM (an `aria-describedby` from the page cannot reach into a shadow root, nor out of one) and in light DOM (a unique id). It is plain text, so it cannot hold a link; put a longer explanation with links next to the element. Works in every mode, with `segmented`, `scroll` and `no-style`; before the script loads `base.css` holds a line for it.
- **Names.** `label` names the group and is required (one console warning without it). A count is shown smaller and muted, and read as part of the chip's name: “2005, 461 shoots” with `count-label="shoots"` (default “items”). Numbers are formatted for the page's language.
- **Swatches.** `data-swatch` / `swatch` is any CSS colour (checked with `CSS.supports`; an invalid one is ignored with one console warning) and is set as a style property, never as CSS text. The square is decorative (`aria-hidden="true"`, `part="swatch"`): the chip's name stays its label and count, so the colour is never the only cue; keep the chart's or map's own labels, and use the same label text in both. Its 1px border is the chip's text colour, so it shows against the chip unselected, selected, disabled and in dark mode (at least 3:1, WCAG 1.4.11), and the chip keeps its height. In forced colors the square keeps its real colour (`forced-color-adjust: none` on the square only, since it must match the chart or map, which forced colors leave alone in a canvas or image) with a system-colour border. It works in every mode, with `segmented` and `scroll`, and with `no-style`.
- **Events.** `change` (`detail: { value }`) on the visitor's change only, never when the app sets `value`; `select` (`detail: { value, href? }`) in `links` mode, cancelable for a plain click on a link: cancel it to route in a single-page app. Both bubble and are composed.
- **Before the script loads.** `base.css` hides each `<uvalib-chip-group>` and holds one row's height (44px, or the scrolling row's), so nothing below moves when it upgrades; the raw children show after two seconds if the script never arrives.
- **Look.** The `<uvalib-filter>` scope chip (a pill with a grey border and blue text, filled blue when selected), with a tick on the selected chip so the state never rests on colour alone. `segmented` joins the chips into one bar like the header's Light / Dark / System control; it stays on one row. Each chip is a target at least 44px square; the visible pill is 36px. Chips wrap on narrow screens. `scroll` keeps them on one row that scrolls sideways: the scrollbar stays visible, the edge with more chips fades out, focus scrolls a chip into view, and Tab moves on past the group (no trap). Dark mode follows the role tokens; in forced colors the selected chip is Highlight. `no-style` keeps the layout, the targets and the hidden radios.
- **Address.** `url-param="year"` keeps the value in the query (`?year=2005`; inside the hash on a hash route such as `#/series?year=2005` or `#chapter?year=2005`; a `multi` value comma-separated). It is read on connect. The markup's `value` stands for the address without the parameter; any other value is written, an empty one as `?year=`. Each change is one `pushState`: in `multi` at once, in `single` once the visitor settles (a second after the last change, so arrowing through a year rail adds one entry, and none when they end where they started). Back and Forward are followed and fire `change` with `restored: true`; a change still settling is dropped. With `<site-analytics spa="auto">` each push is one page view.
- **Analytics.** `change` with `<label>: <chip label>` and the count as the value (single: once the visitor settles, a second after the last change, and not when they end where they started); `select` with the group's label only, never the chip or its URL.

## Tabs

`<uvalib-tabs>` is a tab set. Each direct child with `data-tab` is a panel (the attribute is the tab’s label; give the panel an `id`), or pair `<button slot="tab">` labels with the panels in order. Entry: `uvalib-tabs.js` on the CDN, `@uvalib/web-components/uvalib-tabs.js` on npm.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-tabs.js"
></script>
<uvalib-tabs url-param="tab">
  <section data-tab="Events" id="events">
    <h2>Events</h2>
    <p>Upcoming.</p>
  </section>
  <section data-tab="Stories" id="stories">
    <h2>Stories</h2>
    <p>From the archive.</p>
  </section>
</uvalib-tabs>
```

- **Roles and keys.** The component renders `tablist`, `tab` and `tabpanel`, with `aria-selected`, `aria-controls` and `aria-labelledby`. Arrow keys move (they wrap, and they flip in right-to-left), Home and End jump. Selection follows the arrow unless `activation="manual"`, which waits for Enter or Space. Only the selected tab is in the tab order.
- **Selection.** `selected` is the panel id (a label or a 0-based index is accepted and rewritten to the id). A `change` event carries `{ id, label, index }`. The first panel is visible before the element upgrades, and a hidden panel is not in the accessibility tree.
- **Linkable tabs.** `url-param` keeps the selected id in the query string, or inside the hash on a hash route. `url-param="hash"` uses a bare `#panel-id`. Opening from a URL that already names a tab does not rewrite it. Back and Forward restore the tab. Nothing is written on the first render.
- **Phone.** The tabs wrap onto more than one line. Each tab stays at least 44px.
- **Analytics.** A visitor’s click or key reports `['uvalib-tabs', 'change', '<tab label>']`. The label is capped at 100 characters. Nothing is reported on render, on `requestUpdate`, or when Back restores a tab.

## Contents and record metadata

Two components for Library sites with records and long texts, such as the Electronic Text Collections. Entries: `uvalib-contents.js` and `uvalib-metadata.js` on the CDN, `@uvalib/web-components/uvalib-contents.js` and `@uvalib/web-components/uvalib-metadata.js` on npm.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-contents.js"
></script>
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-metadata.js"
></script>
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
    <dd>
      <ul>
        <li><a href="eaf375v1.epub" download data-size="184 KB">EPUB</a></li>
        <li><a href="eaf375v1.txt" download data-size="369 KB">Plain text</a></li>
      </ul>
    </dd>
  </dl>
</uvalib-metadata>
<uvalib-contents sticky>
  <ol>
    <li><a href="/text/eaf375v1/d3/">Preface</a></li>
    <li>
      <a href="/text/eaf375v1/d8/">The actress of Padua</a>
      <ol>
        <li><a href="/text/eaf375v1/d9/">Part I. The Key</a></li>
        <li><a href="/text/eaf375v1/d10/">Part II. The Crucifix</a></li>
      </ol>
    </li>
  </ol>
</uvalib-contents>
```

`<uvalib-contents>`, sub-navigation as on library.virginia.edu:

- **Markup.** A `<nav>` landmark named by `label` (default "Contents"), with the label as a visible headline (`<h2>`; `heading-level` 2 to 6), then the nested list: dividers between the top-level entries, a bar beside each nested level, links in `--uva-color-utility-link` (else #005679) and the library focus ring. Every link is at least 24px tall.
- **The list as a child.** One `<ol>` or `<ul>` of `<li>`, each with an `<a href>` (or plain text, for a group label) and, for sub-entries, a nested `<ol>`/`<ul>`, to any depth. Other children (a heading) are ignored; entries with no text are skipped with one console warning; hrefs other than relative, http(s), `mailto:` and `tel:` become plain text. `lang` and `dir` on the links and items are kept, and so is inline markup in the text (`em`, `cite`, `code`, `abbr`…, copied element by element with only `lang`, `dir` and an `abbr` title; never parsed as HTML). It follows changes to the children. Apps set the `items` property instead: `[{ label, href?, children? }]`, winning over the children while set.
- **From the page's headings.** For a long document (minutes, transcriptions, reports, finding aids), `headings-from="#article"` builds the list from the headings in that element: `levels` (`2-3` by default, or one level such as `2`) picks which, each lower level nested under the heading before it, and `min` (default 2) is the fewest top-level entries worth a list (fewer shows nothing). Headings with no text or hidden with `aria-hidden` (and text inside `aria-hidden`, such as a `#` permalink) are skipped. A heading without an id gets one from its text (lowercase ASCII, accents dropped, anything else as `-`: "Résumé of the budget" is `resume-of-the-budget`, a repeat `-2`, `-3`); existing ids are kept, so links to sections keep working, and opening the page at such a section goes to it. Headings added, removed or retitled are followed; call `refresh()` after other changes. A child list or `items` wins while given. Without JavaScript there is no list: where the list can be rendered at build time, give it as children instead.
- **Current entry.** `aria-current="page"` on the link to this page and `aria-current="location"` on the link to the section in the URL's hash, drawn bold with a bar. It is found from the page URL (path, ignoring a trailing slash or `index.html`, and hash; an entry whose href has a query string, such as `?part=2`, matches only that query, one without matches whatever the query), followed through `hashchange`, `popstate` and the Navigation API, or from `current` (a URL, for apps whose route is not the page URL; hash-only entries are then places on that URL). With `current` unset, a valid `aria-current` the author put on a source link (`page`, `location`, or `true` for a page) is used, at most one of each.
- **Narrow screens.** At and below `collapse-below` (a viewport width, default `64rem`; `0` never collapses) the headline becomes a full-width 44px button with `aria-expanded` and `aria-controls`, and the list starts closed until the reader opens it (as the Electronic Text Collections' Contents does on phones, so the text comes first; the `open` attribute starts it open), and opening it shows the current entry. It measures the viewport, not the element (no container query) on purpose: a contents sidebar is always much narrower than 64rem, so its own width cannot tell a phone from a desktop.
- **Sidebars.** `sticky` keeps it in view on wide screens (`--uvalib-contents-sticky-top`, default 1rem); the list then scrolls within the window's height (`--uvalib-contents-max-height`) and the current entry is scrolled into view inside it, never the page. In a [`.uvalib-sidebar-layout`](#sidebar-layout), use the layout's `--sticky` or this, not both.
- **Very long contents (issue #38).** A text with hundreds of sections, each its own page, should not write the whole list into every page. Write only the entries near the current one (with their parents, so the nesting makes sense) and set `full-href` to the full contents: a "Full contents (243 sections)" link is drawn after the list, inside the landmark but not as an entry (bold and underlined with an arrow, as library.virginia.edu's "See all" links; 44px tall, the focus ring, `LinkText` in forced colors; outside the scrolling list, so it shows with `sticky`; inside the disclosure on narrow screens). `full-label` is its text ("Full contents"), `total` the number of entries in the full contents, shown as "(243 sections)" (`noun`, default "sections"; `singular` for one, as `<uvalib-results-count>`). A visually hidden line before the list tells screen readers it is partial ("Showing 25 of 243 sections."); the headline and the landmark's name stay the visible "Contents". `base.css` holds the link's line before the script runs. Where the whole list is in the page (or comes from `items` or `headings-from`), `window="12"` shows only the current entry and the 12 before and after it in document order (25 entries, shifted at either end), with their parents; the others are hidden, not removed, an ellipsis (hidden from assistive technology) marks each gap, and the window follows the current entry. With `full-href` the link follows it; without, a "Show all 243 sections" button (`aria-expanded`) shows the rest in place and "Show fewer" hides it again. The whole list shows until the script runs (base.css cannot hold a window), so prefer the build-time window for very long lists. Without JavaScript there is no link: the list shows alone. Analytics: `full-contents-click`, `show-all`, `show-fewer`, never the label or URL.

  ```html
  <uvalib-contents class="uvalib-sidebar-layout__sidebar" full-href="/text/eaf375v1/" total="243">
    <ol>
      <li>
        <a href="/text/eaf375v1/d8/">The actress of Padua</a>
        <ol>
          <li><a href="/text/eaf375v1/d40/">Chapter XXXI</a></li>
          <li><a href="/text/eaf375v1/d41/">Chapter XXXII</a></li>
          <!-- … the entries near the current one … -->
        </ol>
      </li>
    </ol>
  </uvalib-contents>
  ```

- **Single-page apps.** The list is drawn from copies of the children. A plain click on an entry fires `uvalib-contents-navigate` (`detail: { href, level }`, bubbling, cancelable; level 0 for the full-contents link): cancel it to route in place. Hash links need nothing.

`<uvalib-metadata>`, a record's description list:

- **The rows as a `<dl>` child**, so the page reads the same before the script runs: `<dt>` labels and `<dd>` values, optionally a `<div>` per row; several `<dd>` are several values. Values are copied as written (links, lists such as subjects, `download` attributes, and `lang`/`dir` on the `<dt>` and `<dd>`); a link whose href is not relative, http(s), `mailto:` or `tel:` is shown as its text, with one console warning. A link with `data-size` is shown as a download, "EPUB · 184 KB", read as "EPUB, 184 KB" (not added again when the link's text already ends with the size). Apps set `items` instead: `[{ label, value }]`, a value being text, a link `{ label, href, size?, download? }` or an array of them (a list).
- **Credit and rights**, as Special Collections asks: `creator` and `organization` rows first; `rights` last, a rightsstatements.org or Creative Commons URL shown as its short name ("In Copyright", "No Copyright – United States", "CC BY 4.0", "CC0 1.0") linked with `rel="license"`, another URL as `rights-label` (else "Rights statement"), or plain text; `rights-info` adds a "More about rights and permissions" link (the library's is `https://www.library.virginia.edu/policies/use-of-materials`).
- **Long lists.** `list-limit="8"` on the element shortens every value that is a list (a `<ul>` or `<ol>` directly in the `<dd>`) of more than 8 items: the first 8 show, then a real button, “Show all 34 participants” (`aria-expanded`, `aria-controls`; the count in its name), reveals the rest in place and moves focus to the first one revealed (its link, or the item itself with `tabindex="-1"`); it then reads “Show fewer”, which hides them again and keeps focus on the button. `data-limit` on a `<dd>` or its list sets that row's own limit and wins (`data-limit="0"`: never shortened). The noun is the row's label with a lowercase first letter (“Participants” → “participants”; a label that starts with an acronym, “ORCID iDs”, is kept as written); set `data-limit-label="people"` when that does not read well (a singular label, say). Apps set `limit` and `limitLabel` on an `items` row. The hidden values carry `hidden`, so they are not read until shown, and every value stays in the markup: without JavaScript the whole list shows. Before the script loads the element is hidden at its full height, so content below moves up once when it upgrades. The button is an underlined text button like `<uvalib-tag-list>`'s Show all: at least 2rem (34px) square (24px with `no-style`), `ButtonText` in forced colors, no animation (nothing to reduce). Analytics: `show-all` / `show-fewer` with `row N`, the row's place, never its label or values.
- **No jump on upgrade.** `base.css` lays the `<dl>` out as the element will (label beside value from 36rem, stacked below) and, for limits 1 to 12 (`list-limit`, or `data-limit` on a row's `<dd>`), already shows only the first N values and a line for the button, so the page does not move when the script runs. For a larger limit, add the same rule for your number to the page, here for 20:

  ```css
  uvalib-metadata[list-limit='20']:not(:defined)
    > dl
    > dd:not([data-limit])
    > :is(ul, ol)
    > li:nth-child(n + 21) {
    display: none;
  }
  uvalib-metadata[list-limit='20']:not(:defined)
    > dl
    > dd:not([data-limit])
    > :is(ul, ol):has(> li:nth-child(21))::after {
    content: '';
    display: block;
    block-size: 2.25rem;
  }
  ```

  The rows the attributes add (`creator`, `organization`, `rights`, a citation) are drawn by the script, so `base.css` cannot hold their height: the page moves by those rows, which are usually few and short.

- **How to cite.** `citation` (as written), or `citation-title` for the Special Collections formula "<title or collection>, Albert and Shirley Small Special Collections Library, University of Virginia". A Copy citation button copies it and says "Copied" in a polite status; where the clipboard is unavailable it selects the citation and says so.
- **Layout.** Label and value side by side when the element is 36rem wide or more, stacked below that (a container query: the element's own width). Labels in `--uva-color-text-muted`, rows divided by `--uva-color-border`.

Both follow dark mode through the role tokens and reflow at 320px; `no-style` keeps only the structure, and light DOM styles are scoped to the tag in `@layer uvalib`.

## Citations

`<uvalib-citation>` shows one record's citation in several formats, as Virgo's Cite dialog does (MLA, APA, Chicago, Bluebook), with a Copy citation button and an optional Download RIS link. Entry: `uvalib-citation.js` on the CDN, `@uvalib/web-components/uvalib-citation.js` on npm. See the [Citation](https://uvalib.github.io/reusable-web-library/#citation) example. For a single citation in a record's details, `<uvalib-metadata citation="…">` (How to cite, with its own Copy citation button) is still the simpler choice.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-citation.js"
></script>

<uvalib-citation ris-href="/sources/uva_library/items/u2297137.ris">
  <blockquote data-format="MLA">
    Jefferson, Thomas. <i>Notes on the State of Virginia</i>. Edited by William Peden, U of North
    Carolina P, 1955.
  </blockquote>
  <blockquote data-format="APA">
    Jefferson, T. (1955). <i>Notes on the state of Virginia</i> (W. Peden, Ed.). University of North
    Carolina Press. (Original work published 1785)
  </blockquote>
  <blockquote data-format="Chicago">
    Jefferson, Thomas. <i>Notes on the State of Virginia</i>. Edited by William Peden. Chapel Hill:
    University of North Carolina Press, 1955.
  </blockquote>
  <blockquote data-format="Bluebook">
    Thomas Jefferson, <i>Notes on the State of Virginia</i> (William Peden ed., Univ. of N.C. Press
    1955).
  </blockquote>
</uvalib-citation>
```

- **Formats as children.** Any element with `data-format` (a `<blockquote>` reads well without the script). Inline markup is kept (`<i>`/`<em>` for a title, `<b>`, `<span lang>`…, copied element by element with only `lang` and `dir`); anything else (links, images, scripts) is reduced to its text, and nothing is parsed as HTML. A second citation with the same name is ignored with a console warning. It follows changes to the children. Apps set the `citations` property instead, `[{ format, text, html? }]`, winning over the children while set: `text` is shown as text, `html` is parsed in an inert template and only its inline elements are kept, as above. Do not fetch citations into the element from a URL template: give it what your page or app already has.
- **Choosing a format.** A segmented radio group, "Citation format" (native radios: one tab stop, the arrow keys move and select, Space selects), inside a group named by `label` (default "Cite this item", shown in bold above it; `hide-label` keeps it for screen readers only, for a dialog whose heading already says it). The selected format is filled and ticked, never told by colour alone, and in forced colors it is `Highlight`. `format` names the selected one (case-insensitive; default the first) and reflects the visitor's choice; the element fires `uvalib-citation-format` (`detail: { format }`) when the visitor changes it. Why radios and not tabs: choosing a format is a single choice that changes one value (like the header's Light / Dark / System), not a set of panels to browse, so a radio group is the right pattern; tabs would also add a second tab stop and panel semantics for one region of text.
- **Remembering.** `remember` keeps the visitor's last format in `localStorage` (`uvalib-citation-format`; storage is per origin, so per site) and uses it on the next record that has that format, over `format`. Off by default, so a page shows what its author chose; where storage is blocked it simply is not remembered.
- **The citation.** Selectable text in a bordered box, a region named "MLA citation" (the selected format's name).
- **Copy citation.** A 44px `.uvalib-button`. It copies the citation as `text/plain` and, when it has inline markup, also as `text/html` (one `ClipboardItem`), so the italic title stays italic when pasted into a word processor; where HTML is not supported or refused it copies plain text. It then says "MLA citation copied" in a polite `role="status"` next to the button, in the text colour (AAA in light and dark), for five seconds: not a floating toast. If the clipboard is unavailable (permission denied, an insecure page), it selects the citation and says "Could not copy: the MLA citation is selected, copy it with your keyboard".
- **Exports.** `ris-href` adds a "Download RIS" link (`ris-label` changes its text) with a `download` attribute, styled like the button. Other export links go in the `actions` slot after it: `<a slot="actions" class="uvalib-button" href="…/u2297137.enw" download>EndNote</a>` (give them `.uvalib-button` and keep them 44px tall).
- **In a dialog.** It assumes nothing about where it sits: put it inline on a record page, or inside a dialog (with `hide-label` when the dialog's heading is "Cite this item").
- **No jump on upgrade.** With `base.css`, only the first citation shows before the script runs, boxed as it will be, and the label, the format bar and the Copy citation row are held, so nothing moves when it upgrades. The `citations` property cannot be held that way.
- **Colours and modes.** Dark mode follows the role tokens; it reflows at 320px (the format bar scrolls sideways if the names do not fit); `no-style` keeps only the structure (the 44px radios, the hidden label); light DOM styles are scoped to the tag in `@layer uvalib`.
- **Analytics.** `['uvalib-citation', 'format', '<format>']` once the visitor settles on a format (a second after the last change, nothing when they end where they started), `['uvalib-citation', 'copy', '<format>']` and `['uvalib-citation', 'download', 'ris']`. Never the citation.

## Images

`<uvalib-lightbox>` opens a set of plain image links in a dialog. `<uvalib-photo-grid>` lays the thumbnails out in justified rows. Entries: `uvalib-lightbox.js` and `uvalib-photo-grid.js` on the CDN, `@uvalib/web-components/uvalib-lightbox.js` and `…/uvalib-photo-grid.js` on npm. Without JavaScript the links still open the image.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-lightbox.js"
></script>
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-photo-grid.js"
></script>
<uvalib-lightbox url-param="photo">
  <uvalib-photo-grid>
    <a href="rotunda.jpg" data-caption="The Rotunda">
      <img alt="The Rotunda" width="1600" height="800" />
    </a>
    <a href="lawn.jpg" data-caption="The Lawn">
      <img alt="The Lawn" width="800" height="800" />
    </a>
  </uvalib-photo-grid>
</uvalib-lightbox>
```

- **Progressive enhancement.** Wrap the links, or point at links elsewhere with `selector` (for example `selector="a.pb-image"` on a reading page). A primary click opens the viewer. A modified click (command, control, shift, alt, or another mouse button) follows the link as usual.
- **Dialog.** A native `<dialog>` opened with `showModal()`. The caption names it (`aria-labelledby`). Focus moves to Close on open and back to the trigger on close. Escape and a click on the backdrop close it. With more than one image, Previous and Next and the arrow keys move through the set, wrapping, and a polite "3 of 13" is shown. Left is previous in left-to-right and next in right-to-left. Full size opens the original image in a new tab, and its accessible name says so. Loading and a failed image are announced. The dialog image's alt is the trigger image's alt, or the caption when that alt is empty. There is no autoplay and no carousel.
- **Caption and id.** The caption is `data-caption`, else the image alt, else the link's own text, else `title`, else "Image". The deep-link id is `data-id`, else the element's `id`, else the IIIF identifier, else the position from 1.
- **IIIF.** An Image API URL keeps its region (a crop or `square` stays). Only the size becomes `!W,H` for the viewport (CSS pixels times the screen density, at most 2, and at most 2000 pixels on a side). TIFF and JPEG2000 URLs are left as written. Full size still opens the original href, and only for an http(s) URL or a PNG, JPEG, GIF or WebP `data:` image. A resize while the viewer is open asks for the new size and is not an analytics event. Other image URLs are used as written. A `javascript:` URL, and an SVG `data:` URL, are refused.
- **Deep link.** `url-param="photo"` keeps `?photo=<id>` in sync: opening pushes a history entry, stepping replaces it, and Back closes. On a hash route (`#/text`, or a hash that already contains `?`) the parameter is written inside the hash (`#/text?photo=<id>`). Opening from a URL that already has the parameter is not a new action, and neither is Back or Forward. With `<site-analytics spa="auto">` (or `<uvalib-analytics spa="auto">`), that opening push is a same-document route change, so Matomo may count one page view; stepping replaces the entry and does not.
- **Details.** A child with `slot="details"` (optional `data-for` equal to the item's id or its position from 1; without `data-for` it shows for every image), or `data-details-id` on a link naming an element elsewhere on the page. It is shown in the dialog and put back exactly (same parent and place, same `hidden` and `slot`) when the viewer moves on or closes. The `data-details-id` element is the page's own node, never a copy, and it stays in the page: in shadow mode it becomes a child of `<uvalib-lightbox>` (with `slot="uvalib-details"`) slotted into the dialog, never moved into the shadow root; with `no-shadow-dom` it moves into the dialog, which is in the page too. So `document.getElementById`, your listeners and your CSS keep working, except selectors through its old ancestors (`.sidebar .note`): style it by its own id or class. Details that appear while their image is open are shown then: a `data-details-id` element rendered after a fetch (or given its id later), or a `slot="details"` child added or retargeted with `data-for`. An element you remove while it is shown is not put back. For React and other frameworks see [React and other frameworks](#react-and-other-frameworks).
- **Opening and closing from the page.** `open(idOrIndex)` opens an item as a click on its link would (the id `url-param` writes, or the place from 0) and returns `false` when there is no such item; with the viewer open it shows that item. `close({ focus })` closes as Close does, `url-param`/`version-param` included (Back when the viewer pushed the entry, so no extra history entries), and returns `false` when it was not open. Focus goes to `focus` when given (for example the page's `<h1 tabindex="-1">` after a delete), else to the item's link; when that link has left the page, to the first image link left, else to the lightbox itself (with `tabindex="-1"` until it loses focus). `open()` reports no analytics (it is the page's call, not a visitor's click).
- **Events.** `uvalib-lightbox-open` (`detail: { id, index, restored }`) when the viewer opens, from a click, `open()` or the address (`restored: true` for a reload with `url-param`, Back and Forward); not when it moves to another image. `uvalib-lightbox-close` (`detail: { id, index, reason }`, the image that was shown) when it closes: `reason` is `close` (Close, Escape, the backdrop), `api` (`close()`), `history` (Back or Forward) or `empty` (the last image left the page). Not fired when the element is removed. Both bubble and are composed, and follow the analytics event for the same click.
- **When the open image's link is removed** (the page deleted that item), the viewer keeps showing it, and the address still names it, until the visitor moves on (it then drops out of the set) or the page calls `close()`; it never jumps to another image on its own. Removing the last link closes the viewer (`reason: 'empty'`). After a delete, call `close({ focus })`:

```js
await deleteVariant(id);
lightbox.close({ focus: document.querySelector('h1') }); // <h1 tabindex="-1">
lightbox.addEventListener('uvalib-lightbox-close', (e) => saveScroll(e.detail.id));
```

- **Photo grid.** Each direct child that is an `<a href>` or a `<button>` is one photo. The row is about 220px tall, and 140px when the grid itself is narrower than 48rem (767px at the usual 16px), unless `row-height` is set (a bare number is pixels; `rem`, `em` and the other CSS lengths are kept). Each image keeps its shape from its `width` and `height` attributes, or from the loaded image, so the row does not jump. Every item stays a real link or button. An image with no visible text gets a visible caption from its alt, and an alt that repeats that caption is cleared so it is not announced twice. The original alt is kept for a lightbox. A different alt is kept (the accessible name still contains the visible text). An `aria-label` is left as the name. Generated "Photo N" captions renumber when the photos change order. An item with no name is captioned "Photo N" and warned about once. A child that is not a link or a button is skipped, with one warning. A badge sits on the thumbnail: `<span slot="badge">` inside the item, or `data-badge` on the item (“seq”, “3 photos”). It is part of the item’s accessible name; when the item already has an `aria-label`, the badge is appended and the author’s words stay in `data-uvalib-label`. It follows its own width, not the viewport's: the grid is a CSS size container, so in a 250px sidebar or a drawer it takes the shorter rows too. Give it a width when it sits in a shrink-to-fit box (a flex item with no basis, an inline-block), as it no longer sizes to its photos. The grid reports no analytics. Put it inside `<uvalib-lightbox>` and a plain click opens the viewer.
- **Motion and colour.** `prefers-reduced-motion` turns the dialog's short fade off. The backdrop, surface and focus ring use the dark-mode role tokens. Controls are at least 44px. `no-style` keeps the dialog's structure and, for the grid, the row layout: the thumbnails stay in light DOM, and those rules are what reserve each image's space.

#### Versions

A photo can have more than one version of the same picture: the original scan, an AI colorization of a black-and-white photograph, a restoration, an infrared or UV capture. Name them with `data-versions` on the link, a JSON array of `{ label, href?, note? }` whose first entry is the link's own image (its `href` may be left out), and the viewer compares them over the photo. Versions share the original's framing unless one says otherwise with `frame` (see **A different framing** below); regions, the caption and the details stay as they are. See the [Image versions](https://uvalib.github.io/reusable-web-library/#image-versions) example.

```html
<uvalib-lightbox url-param="photo" version-param="version" compare="wipe">
  <a
    href="https://iiif.lib.virginia.edu/iiif/uva-lib:1040162/full/!1600,1600/0/default.jpg"
    data-id="lawn-games"
    data-caption="Lawn games, 1914"
    data-versions='[
      {"label": "Original"},
      {"label": "AI colorization",
       "href": "/media/color/lawn-games.jpg",
       "note": "The colours are an AI model’s guess; the photograph is black and white."}
    ]'
  >
    <img src="…/full/,200/0/default.jpg" alt="Lawn games, 1914" width="249" height="200" />
  </a>
</uvalib-lightbox>
```

- **Ways to compare.** **Switch** (the default, and the only one that shows any number of versions): a segmented control (`aria-pressed` buttons) shows one version at a time. **Reveal** (`compare="wipe"`): the other version on the start side of a divider, the original on the end side, each labelled on the photo. Click or tap anywhere on the photo to move the divider there (no drag is needed, though dragging works), or use the slider "Reveal AI colorization". **Fade** (`compare="fade"`): the slider "Fade to AI colorization" cross-fades from the original (0%) to the other version (100%). `compare` picks the first mode; the viewer always offers the others ("Compare versions": Switch, Reveal, Fade). Reveal and Fade compare the first version with one other: with three or more, "Compare Original with" picks which.
- **Keyboard and screen readers.** The sliders are native range inputs, in the tab order after the image's controls and before the regions list, with `aria-valuetext` ("40% AI colorization"): arrows move 1%, Shift+arrow, Page Up and Page Down 10%, Home and End to either end. "Original", "50/50" and the version's label jump to set positions. Hold "Hold for Original", or the O key, to see the original until you let go. A change is announced politely once it settles ("AI colorization shown", "40% AI colorization"; never while the version is still loading, and not for the slider, which speaks for itself). The image's accessible name ends with what is on screen: "Lawn games, 1914 (AI colorization)", "(Original and AI colorization, compared side by side)", "(Original and AI colorization, blended)".
- **Labelling AI.** A version's `note` is shown under the photo while that version is on screen (both notes while both are), so a derived version is never taken for the original. Always give an AI colorization or other generated version a label that says so ("AI colorization", not "Colour") and a note saying what was predicted ("The colours are an AI model’s guess; the photograph is black and white."). Keep the original first, so it is the default and the version Full size offers first.
- **Loading.** The comparison's code is loaded the first time an open image has versions; pages without versions never load it. Another version's image is requested the first time it is shown (with `decoding="async"`); until it has loaded the original stays on screen. Both are drawn in the same box, so showing another version never moves the page. With `prefers-reduced-motion: reduce` versions change instantly. In forced colors the divider and handle use the system colours.
- **Full size** offers two named links in every mode: the original and the version shown or compared ("Full size, Original" and "Full size, AI colorization"). The toolbar keeps the same height whatever the mode, and the original is always one click away.
- **Nothing moves when the mode changes.** The controls for Switch and for Reveal and Fade share one space as tall as the taller of them (the other is hidden and inert), so the photo stays put even on a phone, where the controls wrap.
- **In the address.** With `url-param`, `version-param="version"` keeps the comparison in sync: `?version=1` (Switch: the version shown, from 0), `?version=wipe:40` or `?version=fade:60` (the percentage of the other version shown), `?version=wipe:40:2` (compared with version 2). It is written with `replaceState` once a change settles (never one history entry per step), dropped on Previous, Next and Close, and read when the viewer opens from the address, so a link can open a photo in colour or half revealed. A click on a thumbnail starts fresh.
- **Opening on a version.** `data-version` on a link, in the `version-param` format (`1`, `wipe:50`, `fade:50`, `wipe:40:2`), opens that image on that version: a gallery of derived images (AI variants, crops, restorations) can open each on the image the visitor clicked while the original stays first, so it is still compared (and framed) as the original. It applies whenever the viewer arrives at that link: a click, `open()`, and Previous or Next (each link opens on its own start; a link without one opens on the original, in the mode the visitor chose). An address with `version-param` wins when the viewer opens from it. The image's accessible name and the version's note say the starting version at once, and the photo stays hidden until that version (and the original, which sizes a framed box) has loaded, so the original never flashes first and nothing moves. It is not the visitor's change: no `uvalib-lightbox-version` event, no analytics, nothing written to the address. A value that does not name a version of the image (`7` with two versions, `wipe:50:4`, `nope`) is ignored with one console warning, and the image opens on the original. With the `versions` callback, set `data-version` on the link too.

  ```html
  <a
    href="/media/plate-12.jpg"
    data-caption="Plate 12, expanded frame (AI)"
    data-version="1"
    data-versions='[{"label": "Original"}, {"label": "Expanded frame (AI)",
    "href": "/media/expanded/plate-12.jpg", "frame": "percent:18,12,64,70"}]'
    >…</a
  >
  ```

- **Apps.** The `versions` property is a function from `{ element, id, href, index }` to the versions (or null). An entry without a label, or whose `href` is not http(s), relative or a PNG, JPEG, GIF or WebP `data:` image, is left out with one console warning; with fewer than two usable versions the image is shown as before. Previous and Next show each image's own versions (or none) in the mode the visitor chose.
- **A different framing.** A version that shows more (or less) than the original, such as an AI-expanded frame, a scan of the whole plate with its border, or a crop, says where the original sits in it with `frame`: the original's box within that version, IIIF / Media Fragments style. `percent:x,y,w,h` is in percent of the version; pixels (`x,y,w,h` or `pixel:x,y,w,h`) are pixels of the version's `width` × `height`, which are then required (give the size of the version's full image, even when the viewer loads a smaller IIIF size). The original may reach past the version: a crop's frame is larger than the crop and starts left of or above it, so `x` and `y` may be negative and `w` and `h` over 100 (or over the version's `width` and `height`); `w` and `h` must be positive. A crop that keeps the middle half each way is `percent:-50,-50,200,200`; one that keeps the right half of a 2000 × 1500 original, 1000 × 1500 itself, is `-1000,0,2000,1500` with `"width": 1000, "height": 1500`. The first version (the original) has no frame; a frame that does not parse, or pixels without `width` and `height`, is ignored with one console warning (the version is shown with the original's framing). The viewer then draws every version at the original's scale in one box big enough for them all, with the original's pixels lined up across versions. The box is reserved from the frames as soon as the original has loaded, so a version loading, or a change of mode, never moves the page. The part of the box a version (or the original) does not cover is empty, shown with a faint hatch, never content. **Switch**: each version at its place (the original at its box, the rest empty; a crop hides the original around it, so the crop shows at its place in the original's box). **Reveal**: the divider spans the whole box; on its start side the version, on its end side the original over its box and empty around it, so the divider shows exactly what was added. A crop's side shows the crop where it exists and is empty around it (the original is not drawn there), so the divider shows exactly what was cut. **Fade**: the version, with the original over its box fading out, so what was added around it shows from the start; with a crop, the original fades out to the crop where it exists and to empty around it. Regions are defined on the original and their outlines stay on the original's box in every mode and version. Say what was added in the version's note:

  ```html
  data-versions='[ {"label": "Original"}, {"label": "Expanded frame (AI)", "href":
  "/media/expanded/lawn-games.jpg", "frame": "percent:18,12,64,70", "note": "Everything outside the
  original edges is painted by an AI model."} ]'
  ```

  With pixels: `"frame": "430,240,1600,1400", "width": 2500, "height": 2000`. A crop (the original reaches past it): `{"label": "Detail", "href": "/media/detail.jpg", "frame": "percent:-25,-25,150,150"}`, the middle two thirds each way.

- **Event.** `uvalib-lightbox-version` when the visitor changes the comparison (once a slider settles): `detail: { id, mode, index, value }` (`mode` `switch`, `wipe` or `fade`; `index` the version shown or compared, from 0; `value` the percentage of it shown, `null` in Switch). Not fired on open or for a comparison restored from the address. Bubbles and is composed. Analytics: `['uvalib-lightbox', 'compare', '<mode>', N]` (N the version's place from 1), never a label or URL.

### Image regions

`<uvalib-image-regions>` outlines regions of an image (people, objects, inscriptions, page areas), numbered, with a list of the same regions beside it (under it on a narrow screen). Entry: `uvalib-image-regions.js` on the CDN, `@uvalib/web-components/uvalib-image-regions.js` on npm. See the [Image regions](https://uvalib.github.io/reusable-web-library/#image-regions) example.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-image-regions.js"
></script>

<!-- The page's own image and list: it works before the script loads and without it. -->
<uvalib-image-regions label="People">
  <img src="group.jpg" alt="Five students on the Rotunda steps" width="1200" height="800" />
  <ol>
    <li data-xywh="percent:12,30,10,22">
      <a href="/people/42">Person 1</a>
      <button type="button" class="uvalib-button uvalib-button--small">Not this person</button>
    </li>
    <li data-xywh="xywh=560,240,120,176">
      Person 2
      <button type="button" class="uvalib-button uvalib-button--small">Name this person</button>
    </li>
  </ol>
</uvalib-image-regions>

<!-- Or the items property, and the element draws the list. -->
<uvalib-image-regions
  id="page"
  label="Regions"
  src="page.jpg"
  alt="A manuscript page"
  width="900"
  height="1200"
></uvalib-image-regions>
<script type="module">
  document.querySelector('#page').items = [
    { label: 'Inscription', x: 10, y: 8, w: 80, h: 12, unit: 'percent', href: '#inscription' },
    { label: 'Seal', x: 640, y: 980, w: 160, h: 160, description: 'Wax, red' },
  ];
</script>

<!-- In the image viewer: data-regions on a link (or the lightbox's regions callback). -->
<uvalib-lightbox regions-label="People">
  <a
    href="group-large.jpg"
    data-caption="Students on the Rotunda steps"
    data-regions="percent:12,30,10,22 Person 1; percent:46,30,10,22 Person 2"
  >
    <img src="group-small.jpg" alt="Students on the Rotunda steps" width="300" height="200" />
  </a>
</uvalib-lightbox>
```

With your own actions in each entry, give the viewer the page's list: `data-regions-list` names an `<ol>` (or `<ul>`) of `<li data-xywh>` anywhere in the page, usually `hidden`.

```html
<uvalib-lightbox regions-label="People">
  <a
    href="board-large.jpg"
    data-caption="The Board of Visitors, 2019"
    data-regions-list="people-board-2019"
    data-image-width="3000"
    data-image-height="2000"
  >
    <img src="board-small.jpg" alt="The Board of Visitors, 2019" width="300" height="200" />
  </a>
</uvalib-lightbox>

<ol id="people-board-2019" class="people" hidden>
  <li data-xywh="410,380,220,260">
    Tim Kaine
    <button type="button" data-person="kaine" data-act="confirm">Confirm Tim Kaine</button>
    <button type="button" data-person="kaine" data-act="reject">Not Tim Kaine</button>
  </li>
  <li data-xywh="1210,400,200,250" data-label="Person 2">
    Person 2
    <button type="button" data-face="2" data-act="name">Name person 2</button>
  </li>
</ol>

<script type="module">
  // The buttons are the page's: listen on the list (it is the same element while open).
  document.querySelector('#people-board-2019').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-act]');
    if (button) saveAnswer(button.dataset); // your own code
  });
</script>
```

- **The list is the way in.** Every region is an entry in the list, with the same name and the page's own links and buttons. The outlines are a visual aid: the overlay is `aria-hidden` and the outlines are not focusable, so no region is a second tab stop. Clicking an outline fires `uvalib-image-regions-activate`, then moves focus to its entry; from there Tab reaches its links and buttons. Labels shown on a highlighted outline are the list's text, so nothing is only on hover.
- **Regions.** An `<ol>` child whose `<li>` items carry `data-xywh`, IIIF and Media Fragments style: `percent:x,y,w,h`, or pixels (`x,y,w,h`, `pixel:x,y,w,h` or `xywh=…`) of the image's natural size, or of `image-width` × `image-height` when the image is a smaller derivative of the original (a IIIF `,880` size, say). A label is `data-label`, else the entry's first link, else its text without its buttons. `data-id` (or `id`) is sent back in events. Or set `items` (`{ id?, label, x, y, w, h, unit?: 'px' | 'percent', href?, description? }[]`): it replaces the child list. A pixel region is drawn once the image's size is known.
- **Host content.** The child list and everything in it stay the page's: the element only numbers, positions and highlights them (it adds `data-uvalib-region` and, while highlighted, `data-uvalib-active` to each `<li>`, and `tabindex="-1"` when an outline moves focus to one). Your buttons' events are yours.
- **Numbers and highlight.** Outline numbers are the list's numbers (from 1, or the `<ol>`'s `start`); `numbering="none"` hides them on the outlines. Hovering or focusing an entry, or anything in it, highlights its region: a thicker double outline with its label, the others dimmed, and the entry gets a bar at its start and a tint. Hovering an outline highlights its entry. Not colour alone.
- **Contrast on any image.** Each outline is white inside black (2px each, 4px highlighted), with black number badges, on light and dark photos alike and in dark mode; in forced colors they are Canvas and CanvasText, the highlight is Highlight (the overlay alone has `forced-color-adjust: none`).
- **Layout.** The image keeps its own width (at most the element's) and the list sits beside it when 14rem is left, else under it, so it reflows at 320px. Outlines are in percent and scale with the image; give the image `width` and `height` so its space is reserved. `base.css` gives the children the same layout before the element upgrades, so the image does not move. `hide-outlines` hides the outlines and keeps the list. `label` (default “Regions”) is the list's heading; `heading-level` sets its level (default: one below the heading before it).
- **Events.** `uvalib-image-regions-activate` when an outline is clicked, before its entry takes focus: `detail: { index, item, entry }` (`index` from 0; `item` the region's record; `entry` the page's own `<li>`, from the child list or a lightbox's `data-regions-list`, or `null` when the list was drawn from `items`). It is cancelable: call `preventDefault()` and focus your own control in the entry instead, for example the field of a "Who is this?" form you just revealed. Keep focus in the entry, so keyboard and screen-reader users land in the same place. `highlight` (`detail: { item, index }`, `item` null when none) as hover or focus changes the highlight. `select` (`detail: { item, index, entry }`) still follows every outline click, after focus moved; prefer the activate event, since `select` is also the native text-selection event, which a `document` listener hears from every input. All bubble and are composed, so a page hears them from inside `<uvalib-lightbox>` too. Never reach into the shadow DOM's outlines (`part="region"`, `data-index`) for clicks: they can change in any release.

```js
document.addEventListener('uvalib-image-regions-activate', (e) => {
  const form = e.detail.entry?.querySelector('.who-is-this');
  if (!form) return; // the entry takes focus as usual
  e.preventDefault();
  form.hidden = false;
  form.querySelector('input').focus();
});
```

- **Lightbox.** On `<uvalib-lightbox>`, `data-regions` on a link is a JSON array of region objects, or `xywh` values each followed by its label, separated by `;` (`percent:10,20,30,40 Person 1; 160,120,320,240 Sign`; use JSON when a label contains `;`). Or set the lightbox's `regions` property to a function from `{ element, id, href, index }` to regions. An image with regions shows the outlines over it and their list beside it, and a “Show regions” toggle (`aria-pressed`) hides the outlines; `regions-label` names the list. `<uvalib-image-regions>` is loaded the first time it is needed. Because the viewer asks for a resized IIIF image, give pixel regions `data-image-width` and `data-image-height` (the original's size), or use percent. Images without regions are unchanged.
- **The page's own list in the viewer.** `data-regions-list="<id>"` on a lightbox link (or the lightbox's `regionsList` property, a function from `{ element, id, href, index }` to the list element, for apps) names an `<ol>` or `<ul>` of `<li data-xywh>` entries in the same page (or the same shadow root as the lightbox), usually `hidden`. While that image is open the list is its region list, exactly as `<uvalib-image-regions>` uses its child list: the numbers, the highlight both ways and an outline click focusing its entry are the component's; the entries and their buttons and links stay yours. An outline click first fires `uvalib-image-regions-activate` with your own `<li>` as `detail.entry` (cancelable, to focus your own control in it; see [Image regions](#image-regions) events). It is the same element, not a copy, so listeners you added (on the buttons or on the list) keep working, and when the image changes or the viewer closes it goes back where it was, with its own `hidden` state, and without the `data-uvalib-*` attributes or `tabindex` the viewer added. Change it while it is home (a name confirmed, a person added) and the next open shows the change; changes while it is open are seen too. If an image has both, the list wins over `data-regions` and the `regions` callback (with one console warning). **Styles:** in shadow mode the list becomes a child of `<uvalib-lightbox>` (with `slot="uvalib-regions-list"`) and is slotted into the viewer, never moved into the shadow root, so the page's CSS keeps applying; with `no-shadow-dom` it is moved into the viewer's `<uvalib-image-regions>`, still in the page. Either way it leaves its parent while open, so style it by its own id or class (`.people button`), not by where it sits in the page (`.sidebar ol button`). **Names:** the accessible names of your actions are yours, and must be unique in the list: “Confirm Tim Kaine”, “Not Tim Kaine”, “Name person 2”, never three “Confirm” buttons. A region's label is `data-label`, else the entry's first link, else its text without its buttons. If focus is in the list when the visitor moves to the next image, it goes to Close. Analytics are unchanged: outline clicks report the list's heading (`regions-label`) and the number, never a label.
- **Analytics.** `select` when an outline is clicked, with the list's `label` and the region's number. Never a region's label: it may be a person's name. Nothing on hover or focus.
- **Motion and styles.** The dimming fades only without `prefers-reduced-motion: reduce`. Shadow and light DOM; `no-style` keeps the layout and the outlines.

#### React and other frameworks

The lightbox lends the page's own nodes (a `data-regions-list` list, a `data-details-id` element) to the viewer: it moves them, and puts them back on close. With a framework that delegates events, render _into_ those nodes, never the nodes themselves.

- **Why clicks stop.** React (17 and later, including 18 and 19) does not listen on each button: it listens on the root container and on each portal's container, and routes a click by the container whose listener hears it. A list rendered _inside_ a portal (`createPortal(<ol data-…>…</ol>, panel)`) belongs to that portal; when the viewer moves the `<ol>` out of the portal's container, its clicks no longer pass through that container's listener, and the root's listener leaves portal events to the portal, so `onClick` silently never runs. React may also throw when it later removes a node that is not where it left it. Vue, Svelte and others do not route events this way, but they too expect to find the nodes they rendered where they put them.
- **What works.** Create the `<ol>` (or the details element) once, outside the framework, make it the portal's target, and render only the entries into it. React then listens on the `<ol>` itself, and that listener moves with it, so clicks keep working while it is lent; the framework never moves or removes the `<ol>`. Do the same for details: the `data-details-id` element is the portal target, and its contents are the framework's. Details rendered after a fetch are picked up while their image is open.

```jsx
// Illustrative. One list and one details element per photo, made outside React.
function useLentElement(tag, id) {
  const [el] = useState(() => {
    const node = document.createElement(tag);
    node.id = id;
    node.hidden = true; // the viewer shows it while its photo is open
    document.body.append(node);
    return node;
  });
  useEffect(() => () => el.remove(), [el]);
  return el;
}

function Photo({ photo }) {
  const people = useLentElement('ol', `people-${photo.id}`);
  const details = useLentElement('div', `details-${photo.id}`);
  return (
    <>
      <a
        href={photo.full}
        data-id={photo.id}
        data-regions-list={people.id}
        data-details-id={details.id}
      >
        <img src={photo.thumb} alt={photo.alt} width={photo.w} height={photo.h} />
      </a>
      {createPortal(
        photo.people.map((p) => (
          <li key={p.id} data-xywh={p.xywh}>
            {p.name}
            <button type="button" onClick={() => confirm(p)}>
              Confirm {p.name}
            </button>
          </li>
        )),
        people,
      )}
      {createPortal(<PhotoDetails photo={photo} />, details)}
    </>
  );
}
```

`no-shadow-dom` is not needed for this. A lightbox `regionsList` callback that returns such an element works the same way.

## Maps

`<uvalib-map>` shows places (buildings, rooms, outdoor spaces) as markers sized by a count, each a link to the place's page, with a list of the same places under the map. It wraps [Leaflet](https://leafletjs.com) 1.9, which **your page provides**: the library never bundles Leaflet, and its CDN entry imports nothing from it. `leaflet` is an optional peer dependency of the npm package. Entry: `uvalib-map.js` on the CDN, `@uvalib/web-components/uvalib-map.js` on npm. See the [Map](https://uvalib.github.io/reusable-web-library/#places-map) example.

```html
<!-- CDN: Leaflet first (defer keeps it before the module scripts), then the element. -->
<script
  defer
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
  crossorigin=""
></script>
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-map.js"
></script>

<!-- The child list is the list of places, before the script runs and after. -->
<uvalib-map label="Places on Grounds" count-label="photos">
  <ul>
    <li>
      <a href="/places/rotunda" data-lat="38.0356" data-lng="-78.5034" data-count="2702"
        >The Rotunda</a
      >
    </li>
    <li>
      <a
        href="/places/alderman"
        data-lat="38.0367"
        data-lng="-78.5055"
        data-count="640"
        data-description="The main library."
        >Alderman Library</a
      >
    </li>
  </ul>
</uvalib-map>
```

```js
// npm: give the element the Leaflet module (npm i leaflet).
import * as L from 'leaflet';
import '@uvalib/web-components/uvalib-map.js';

const map = document.querySelector('uvalib-map');
map.leaflet = L;
map.items = [
  {
    id: 'rotunda',
    name: 'The Rotunda',
    lat: 38.0356,
    lng: -78.5034,
    count: 2702,
    href: '/places/rotunda',
  },
  { id: 'stadium', name: 'Scott Stadium', lat: 38.0311, lng: -78.5137, count: 1150 }, // no href: a button
];
map.addEventListener('select', (e) => console.log(e.detail.item.id));
```

- **Leaflet.** The `leaflet` property (the module namespace, or its `default`) wins; otherwise `window.L` (leaflet.js from a script tag, also loaded `async` or after the element: it looks again once the page has loaded). Without either, only the list is shown, with one console warning a second after the page loads. Leaflet's `leaflet.css` is **optional**: the element carries the layout rules the map needs (panes, tiles, controls, tooltip), in shadow DOM and light DOM alike, so there is nothing to adopt into the shadow root. A page that also loads `leaflet.css` (for its own maps) keeps the element's sizes and colours.
- **Places.** `items` (`[{ id?, name, lat, lng, count?, href?, description? }]`) wins over the children while non-empty. Children: one `<ul>` or `<ol>` of `<li>`, each with an `<a href>` carrying `data-lat`, `data-lng` and optionally `data-count`, `data-id` and `data-description` (or those on the `<li>` itself, for a place without a page). A place without valid coordinates is listed but has no marker. Hrefs other than relative, http(s), `mailto:` and `tel:` become plain text. The list follows changes to the children.
- **Markers.** Each is a real link (a button when there is no `href`) named “The Rotunda, 2,702 photos”: `count-label` is the noun (default “items”; a count of one drops a trailing s). The dot is 24 to 56px, by the square root of the count, in a target of at least 44px; smaller dots sit above larger ones. Tab, or the arrow keys, Home and End, move between the markers shown (a group counts as one, and an open ring's places follow it); Enter (or Space) follows the link, or chooses the place. A hover or focus shows a tooltip with the name and count (it is also in the marker's name and the list, never the only source) that stays until another place is hovered or focused, the pointer leaves the map, or Escape.
- **Places close together.** Markers whose 44px targets would overlap at the current zoom (WCAG 2.5.8 needs nothing more for targets that size) are drawn as **one group marker**, recomputed after every zoom, resize and change of places (greedy, in screen space, largest count first; no plugin). A group is a button showing how many places it holds, with a second ring (not colour alone), sized by their summed count (32 to 64px), and named “The Rotunda and 2 more places, 3,610 photos”: the largest place's name, “and N more” with `place-label` as the noun (default “places”; one drops a trailing s: “and 1 more place”; set `place-label="rooms"` for “and 2 more rooms”), then the total. Choosing it (click, Enter or Space) zooms in, centred on its places, to the first level at which they part (a jump under reduced motion), and focus moves to the largest place's marker. When they cannot part (one shared point, or already at the maximum zoom) it spreads them in a ring around the group instead, each 44px target 24px clear of the others and of the group (`aria-expanded="true"` on the group), with focus on the first; Escape, choosing the group again, or any zoom closes the ring and focus returns to the group. `select` fires only for places, never for a group. Every place stays reachable by pointer (group, then zoom or ring), by keyboard and by the list. A very large group's ring can be wider than the map (it pans to centre it).
- **The list and the map are linked.** Hovering or focusing a list entry highlights its marker (a ring and a larger dot, not colour alone) and brings it into view; hovering or focusing a marker outlines its list entry. A place inside a group highlights the group, whose tooltip names that place (“Dome Room, 600 photos, One of 3 places here”); a group highlights all its places' entries.
- **The region.** The map is `role="region"` named “<label>, map” (`label` is required: one console warning without it), after a “Skip map, go to the list” link (shown on focus; it moves focus to the list, which is named “<label>, list”) and a visible line of key instructions. With the map itself focused, Leaflet's own keys pan (arrows) and zoom (+ and −). The wheel does not zoom (no scroll trap); the zoom buttons are 44px with the library focus ring. The attribution stays, readable (13px, underlined links).
- **Opening view.** The bounds of the places, as close as the largest marker allows (half zoom steps), moved clear of the zoom buttons and attribution when a marker would sit under them; or `center="lat,lng"` and `zoom`. It refits on resize until the visitor moves the map.
- **Tiles.** `tile-url` (default `https://tile.openstreetmap.org/{z}/{x}/{y}.png`) and `attribution` (HTML; default “© OpenStreetMap contributors”). OpenStreetMap's tiles are for light use only: their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) asks for the attribution (kept here) and no heavy traffic. For a busy page use a library-hosted tile server or a commercial provider, and set both attributes.
- **Dark mode.** In the page's dark mode, `dark-tile-url` gives dark tiles; without it the light tiles are inverted with a CSS filter on the tile pane only (`--uvalib-map-dark-filter`, default `invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)`), so markers, controls, the tooltip and the attribution are never filtered. Everything else follows the role tokens.
- **Motion, colours and layout.** `prefers-reduced-motion` turns off Leaflet's zoom, fade and marker animations, inertia and the highlight's transition, and panning to a place jumps. In forced colors the markers, controls, tooltip and list entries keep borders, and the highlight is a Highlight outline. The map is `--uvalib-map-height` tall (default `min(24rem, 75vw)`, at least 12rem); the list sits under it in as many columns as fit, one on a phone, with no sideways scroll at 320px.
- **Before the script loads.** `base.css` shows the key instructions and holds the map's height above the child list, so the list does not move when the map is drawn.
- **Modes.** Shadow DOM (default) or `no-shadow-dom`; `no-style` keeps Leaflet's layout, the map height, the 44px targets and the hidden marker names, and drops the colours.
- **Events and analytics.** `select` (`detail: { item }`, bubbling, composed and cancelable) when a marker is chosen; cancel it to stay on the page for a place with an `href`. Analytics: `select` with the map's label and the place's position from 1, `expand` with the label and the number of places in the group chosen, and `zoom` with the label and the zoom level, 1 s after the last zoom-button press. Never a place's name, coordinates or URL.

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

## Buttons and forms

`base.css` also gives host content the library's buttons and fields, so a page's own search box, toggles and links-as-buttons match library.virginia.edu. Link `base.css` (see [Install](#install)) and add the classes:

```html
<form class="uvalib-search-form" role="search" action="/search">
  <label for="q">Search the collections</label>
  <input class="uvalib-input" id="q" name="q" type="search" />
  <button class="uvalib-button" type="submit">Search</button>
</form>

<button class="uvalib-button" type="button">Primary</button>
<button class="uvalib-button uvalib-button--secondary" type="button">Secondary</button>
<button class="uvalib-button uvalib-button--subtle" type="button">Subtle</button>
<a class="uvalib-button uvalib-button--secondary" href="/next">Next page</a>
<button class="uvalib-button" type="button" aria-pressed="false">Show original line breaks</button>
```

- **`.uvalib-button`** is the library's button: blue-alt (`#007bac`) with white text and a 5px radius, darker on hover. Use it on `<button>` or `<a>`. `--secondary` is the outline, `--subtle` the pale blue one; `--small` and `--large` are the theme's sizes. Every button is at least 44px tall (small: 32px), has the library's orange focus ring, and a grey disabled look (`disabled`, or `aria-disabled="true"` while busy) that ignores the pointer (`pointer-events: none`: no hover, no click; an `aria-disabled` link still needs your script to ignore keyboard activation).
- **Toggles:** a `.uvalib-button` with `aria-pressed` is an outline with an empty box while off, and filled with a ticked box while on, so the state never rests on colour alone. A pressed toggle is filled whatever its variant (`--secondary` or `--subtle` style only the off state). Flip `aria-pressed` in your script; do not use a checkbox look-alike or `role="switch"` for it.
- **`.uvalib-input`** is a 44px text field; **`.uvalib-search-form`** puts the label, field and button in one row that wraps on phones. Keep a visible `<label>` (or at least an `aria-label`).
- **Dark mode and forced colors:** they follow the `--uva-color-button-*` role tokens. `base.css` carries every role token it reads itself (the same values as `tokens.css`), so a page that links only `base.css` stays readable under `data-uva-color-scheme`; link `tokens.css` too for your own content's other `--uva-color-*` tokens. Turn dark mode on with `color-scheme-switch` (see [Dark mode](#dark-mode)). In Windows high-contrast mode they keep visible outlines, show hover and press as a Highlight outline (dashed while pressed), a highlighted pressed toggle, and GrayText when disabled.
- **Cascade:** like the rest of `base.css` the rules are unlayered, so a host reset such as `button { background: none }` does not undo them; restyle with a more specific selector. They are only in `base.css`: `<site-page>` does not install them. The components' own buttons (bento-box, events-section, library-weekly-hours) keep their look, in light DOM too.
- **`hidden` hides them.** Every `base.css` class that sets `display` (buttons, fields, the search form, badges, media, the toolbar, the empty state, skeletons, messages, the results list) is hidden by the `hidden` attribute, so `button.hidden = true` takes it out of sight, the tab order and the accessibility tree. The rule is scoped to those classes (`:where(.uvalib-button, …)[hidden] { display: none !important }`), not a global `[hidden]` reset, so a page's own `[hidden]` content behaves as it did before.

## Messages

An inline message for the page's own content: a search error, a notice that results are partial, a saved confirmation. It has the severity look of `<site-alerts>` (the alert background, a thick start border in the severity colour) at the size of the content around it. The class is in `base.css`.

```html
<!-- An error that appears after an action: role="alert" announces it at once. -->
<div class="uvalib-message uvalib-message--error" role="alert">
  <strong class="uvalib-message__label">Error:</strong> the search could not be run.
  <a href="/search">Try again</a>
</div>

<!-- A notice: role="status" announces it politely. -->
<div class="uvalib-message uvalib-message--notice" role="status">
  <strong class="uvalib-message__label">Note:</strong> search by meaning isn't available right now,
  so these are keyword results.
</div>

<div class="uvalib-message uvalib-message--warning">
  <strong class="uvalib-message__label">Warning:</strong> some records are still being added.
</div>
<div class="uvalib-message uvalib-message--success" role="status">
  <svg class="uvalib-message__icon" aria-hidden="true" viewBox="0 0 16 16">
    <path d="M2 8l4 4 8-8" fill="none" stroke="currentColor" stroke-width="2" />
  </svg>
  <strong class="uvalib-message__label">Saved:</strong> your list was updated.
</div>
```

- **Kinds:** `--error`, `--warning`, `--info` (or its alias `--notice`) and `--success`; a plain `.uvalib-message` looks like `--info`. Text and links are 7:1 or more (WCAG AAA) on every kind in light and dark (the `--uva-color-alert-*` and `--uva-color-status-success-*` role tokens, which `base.css` carries itself). Links are underlined, with a focus ring in the text colour.
- **Never colour alone:** start the text with the severity in words (“Error:”, “Warning:”, “Note:”, “Saved:”), in `.uvalib-message__label` (bold); an icon (`.uvalib-message__icon`) is decorative, `aria-hidden="true"`, and never replaces the word. There is no CSS-generated prefix: screen readers read generated content inconsistently, it is not translated with the page, and it would double the word you wrote.
- **Live regions:** use `role="alert"` only for an error that appears in response to what the visitor did (it interrupts); use `role="status"` for a notice or confirmation (polite). For a status to be announced reliably, put the empty `role="status"` container in the page first and fill it later, rather than inserting the whole element. A message that is there when the page loads needs no role. Do not put an alert role on a message that is always shown.
- **Forced colors:** every message keeps a system-colour border, thicker at the start. In the flow of the page it is a block with the content's own width, its first and last child without outer margins.

## Tables

Data tables in the page's own content (holdings, schedules, statistics) in the library look: library.virginia.edu's W3.CSS tables (left-aligned cells padded 8px, the first column 16px from the edge, top-aligned, a light rule between rows), the same rules `<library-weekly-hours>` draws. The classes are in `base.css`. See the [Tables](https://uvalib.github.io/reusable-web-library/#tables) example.

```html
<!-- Holdings grouped by library: a heading per library, then its table. -->
<h3>Clemons Library</h3>
<table class="uvalib-table">
  <caption>
    Clemons Library holdings
  </caption>
  <thead>
    <tr>
      <th scope="col">Location</th>
      <th scope="col">Call number</th>
      <th scope="col">Barcode</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Stacks</td>
      <td>PS3545 .O337 Z5 2004</td>
      <td>X004812345</td>
    </tr>
  </tbody>
</table>
<h3>Law Library</h3>
<table class="uvalib-table">
  <caption>
    Law Library holdings
  </caption>
  <thead>
    <tr>
      <th scope="col">Location</th>
      <th scope="col">Call number</th>
      <th scope="col">Barcode</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Law Library Stacks, Lower Level</td>
      <td>KF4550 .A2 1787a vol. 1–4 suppl.</td>
      <td>35000101234567890123456789</td>
    </tr>
  </tbody>
</table>

<!-- A striped, compact schedule with a number column. -->
<table class="uvalib-table uvalib-table--striped uvalib-table--compact">
  <caption>
    Study rooms this week
  </caption>
  <thead>
    <tr>
      <th scope="col">Day</th>
      <th scope="col">Hours</th>
      <th scope="col" class="uvalib-table__num">Rooms free</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Monday</th>
      <td>8 a.m. – midnight</td>
      <td class="uvalib-table__num">12</td>
    </tr>
    <tr>
      <th scope="row">Tuesday</th>
      <td>8 a.m. – midnight</td>
      <td class="uvalib-table__num">7</td>
    </tr>
  </tbody>
</table>

<!-- A wide table scrolls inside its own region, named by the caption. -->
<div class="uvalib-table-scroll" role="region" tabindex="0" aria-labelledby="circ-caption">
  <table class="uvalib-table">
    <caption id="circ-caption">
      Items borrowed per month, 2025
    </caption>
    <thead>
      <tr>
        <th scope="col">Library</th>
        <th scope="col" class="uvalib-table__num">Jan</th>
        <th scope="col" class="uvalib-table__num">Feb</th>
        <!-- … -->
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Clemons Library</th>
        <td class="uvalib-table__num">4,210</td>
        <td class="uvalib-table__num">3,987</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Opt-in: rows stack below 30em of the wrapper's width. Explicit roles are required. -->
<div class="uvalib-table-stack">
  <table class="uvalib-table uvalib-table--stack" role="table">
    <caption>
      Clemons Library holdings
    </caption>
    <thead role="rowgroup">
      <tr role="row">
        <th scope="col" role="columnheader">Location</th>
        <th scope="col" role="columnheader">Call number</th>
      </tr>
    </thead>
    <tbody role="rowgroup">
      <tr role="row">
        <td role="cell" data-label="Location">Stacks</td>
        <td role="cell" data-label="Call number">PS3545 .O337 Z5 2004</td>
      </tr>
    </tbody>
  </table>
</div>
```

- **`.uvalib-table`** on a `<table>`: full width, collapsed borders, bold left-aligned header cells, a 2px rule under the header row and a 1px rule between rows (`--uva-color-table-border`). Cells wrap long values anywhere, so a long barcode, call number or URL never pushes the table past a phone's width.
- **Every table needs an accessible name:** a `<caption>` (drawn as a bold line above the table; keep it visible) or `aria-labelledby` pointing at a visible heading. Header cells are `<th>` with `scope="col"` or `scope="row"` (a row's first cell is often its header: a day, a library); use `<td>` for data. Do not use a table for layout, and do not leave empty header cells: give them visually hidden text.
- **Modifiers:** `--striped` (every even body row on `--uva-color-table-stripe`; body text is 12.5:1 on it in light and 12.6:1 in dark, AAA), `--compact` (4px by 8px cells), and **`.uvalib-table__num`** on a `<th>` or `<td>` for numbers: right-aligned with tabular digits, so columns line up. Put it on the column's header too.
- **Wide tables:** wrap the table in `<div class="uvalib-table-scroll" role="region" tabindex="0" aria-labelledby="CAPTION-ID">` (give the caption that id). The wrapper scrolls sideways inside itself, never the page; `tabindex="0"` lets keyboard users focus and scroll it (it shows the library focus ring), and the region is named by the caption. Inside it, cells break only words that cannot fit. This is the default for any table wider than a phone.
- **Stacked rows (opt-in):** in a `.uvalib-table-stack` wrapper (a size container), `.uvalib-table--stack` turns each row into a block when the wrapper is 30em wide or narrower (480px at 16px; in a sidebar too), each cell headed by its `data-label` (drawn by CSS and hidden from screen readers, which hear the column header). Changing a table's display removes its table semantics in some browsers (Safari/WebKit), so **a stacked table must carry explicit roles**: `role="table"` on the table, `rowgroup` on `<thead>`/`<tbody>`, `row`, `columnheader` (and `rowheader` for a `<th scope="row">`) and `cell`. Prefer the scroll wrapper; stack only short tables whose rows read well as cards.
- **Grouped tables** (holdings by library, items by location): a heading per group followed by its table, each table with its own caption. The heading level follows the page's outline (Virgo's record design uses `<h5>` for locations because of where they sit; on your page it may be `<h2>` or `<h3>`), never a fixed level.
- **Forced colors** draws the rules in the system text colour and drops the stripes; **print** draws the rules black, drops the stripes, and lets a scroll-wrapped table print in full. `hidden` hides a table, the wrappers and a stacked row.

## Sidebar layout

A sidebar beside the main content on wide screens, stacked on narrow ones: library.virginia.edu's sidebar pages (a quarter-width first sidebar, 3.5rem from the content) and the Electronic Text Collections' reading pages (a sticky Contents sidebar beside the text). The classes are in `base.css`; there is nothing to load. See the [Sidebar layout](https://uvalib.github.io/reusable-web-library/#sidebar-layout) example.

```html
<!-- A reading page: the contents first in the source, so they also come first when stacked. -->
<div
  class="uvalib-sidebar-layout uvalib-sidebar-layout--sticky uvalib-sidebar-layout--print-hide-sidebar"
>
  <uvalib-contents class="uvalib-sidebar-layout__sidebar">
    <ol>
      <li><a href="#preface">Preface</a></li>
      <li><a href="#part-1">Part I. The Key</a></li>
    </ol>
  </uvalib-contents>
  <article class="uvalib-sidebar-layout__main">
    <h2 id="preface">Preface</h2>
    …
    <uvalib-pager prev-href="…" prev-label="…" next-href="…" next-label="…"></uvalib-pager>
  </article>
</div>

<!-- Related links on the right: the sidebar after the main content in the source. -->
<div class="uvalib-sidebar-layout">
  <div class="uvalib-sidebar-layout__main">…</div>
  <aside class="uvalib-sidebar-layout__sidebar" aria-labelledby="related-heading">
    <h2 id="related-heading">Related</h2>
    …
  </aside>
</div>
```

- **`.uvalib-sidebar-layout`** holds exactly two children: **`__sidebar`** and **`__main`**. Side by side, the sidebar is about a quarter of the layout, `clamp(14rem, 25%, 20rem)`, with 3.5rem between it and the content; the main content takes the rest and can shrink below its content's width, so a long word wraps and a wide table scrolls inside its `.uvalib-table-scroll` instead of pushing the page sideways. Stacked, the two are full width and 2rem apart.
- **When:** from **913px of the layout's own width** (a container query), so it works in `<site-page>`'s main, a drawer or any column. 913px is library.virginia.edu's desktop breakpoint (993px of viewport) less `<site-page>`'s 40px gutters on each side, so on a `<site-page>` the layout changes where library.virginia.edu's does (a classic, non-overlay scrollbar moves it about 15px later). The layout fills its parent like any block; inside a shrink-wrapped flex or grid item, give it a width.
- **Order is the source order,** side by side and stacked, so the reading and focus order always match what is seen (nothing is reordered with CSS). Sidebar first: a left-hand sidebar that stacks above the content, right for a reading page's contents. Sidebar after the main content: a right-hand sidebar that stacks below it (related links, a contact box). No modifier is needed for either.
- **Landmarks are yours:** no role is added. For navigation, make the sidebar the `<nav>` itself: put the class on `<uvalib-contents>` (it is a `<nav>` landmark) or on a `<nav aria-label="…">`. For related content, an `<aside>` (complementary) named by its heading. Do not wrap a `<nav>` in another element with `role="navigation"`, and in a sidebar do not skip heading levels; if one category header is a link, make them all links.
- **`--sticky`** keeps the sidebar in view while the page scrolls, **only when side by side** (never stacked): it sticks 1rem from the top (`--uvalib-sidebar-sticky-top`) and, when taller than the window, scrolls by itself. `<site-page>`'s header is not sticky, so nothing covers it; a site with a fixed header sets the offset to the header's height. Use the layout's `--sticky` **or** `<uvalib-contents sticky>` in a plain sidebar, not both; `--sticky` also covers a sidebar holding more than the contents. A sticky sidebar that can overflow needs something focusable in it (links), so keyboard users can scroll it.
- **`<uvalib-contents>` in the sidebar:** keep its default `collapse-below` (64rem of viewport). Below that it is a closed Contents button, so on phones the text comes first; between the layout's breakpoint and 64rem it is that button at the top of the side-by-side sidebar. With `base.css` linked, the page does not move when it upgrades.
- **Custom properties:** `--uvalib-sidebar-width` (default `clamp(14rem, 25%, 20rem)`), `--uvalib-sidebar-gap` (3.5rem), `--uvalib-sidebar-stack-gap` (2rem), `--uvalib-sidebar-sticky-top` (1rem).
- **Print** always stacks it, never stuck or clipped. **`--print-hide-sidebar`** leaves the sidebar out of the printout (a reading page's contents are no use on paper); without it the sidebar prints above or below the content as in the source. `hidden` hides the layout. Forced colors changes nothing: the layout draws no colours of its own.

## Reading texts (edition.css)

`edition.css` styles TEI texts converted to class-annotated HTML, where each element's class is its TEI element name (`<div class="lg">`, `<span class="pb">`, `<ins class="add">`), as Electronic Text Collections' converter, TEI Boilerplate and most TEI-to-HTML stylesheets write them. Put the converted text in an element with `class="uvalib-edition"`. Every rule is inside `:where()` (zero specificity), so any rule of the site's own wins; it carries the dark-mode role tokens it reads, like `pagefind.css`.

```html
<link rel="stylesheet" href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css" />
<link
  rel="stylesheet"
  href="https://unpkg.internal.lib.virginia.edu/web-components/v1/edition.css"
/>
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-lightbox.js"
></script>

<uvalib-lightbox selector=".uvalib-edition a.pb-image"></uvalib-lightbox>
<label class="uvalib-edition__lines"><input type="checkbox" /> Show original line breaks</label>
<label class="uvalib-edition__readings"><input type="checkbox" /> Show original readings</label>
<div class="uvalib-edition" lang="en">
  <section class="div div-letter">
    <span class="pb" data-n="1"><a class="pb-image" href="…/default.jpg">p. 1</a></span>
    <div class="opener">
      <div class="dateline">May 3, 1859</div>
      <div class="salute">My dear Sister,</div>
    </div>
    <p class="p">
      The lawn is <ins class="add">all</ins> in bloom. I walked <del class="del">yesterday</del>
      <br class="lb" />
      this morning to the <span class="orig" title="Regularized: weather">wether</span>…
    </p>
  </section>
</div>
```

- **The look** is the library's, not a facsimile's: Franklin Gothic (`--uva-font-family`; serif body text is on the UX team's deprecated list), a 70ch measure at 1.125rem with a 1.7 line height, headings in the theme's colour and scale, epigraphs and quotations as the theme's blockquote (1px orange start border, italic), ornaments as a centred muted ⁂, footnotes after a rule in smaller text, and page breaks as small muted labels (a link to the page image is underlined in the link colour, at least 24px tall, with the library focus ring). Headings and title pages are left-aligned except where the text says `rend-center`.
- **Class vocabulary.** Structure: `div` (and `div-*`, the TEI `@type`: `div-letter`, `div-poem`, `div-chapter`), `head` (`head-sub`), `p`, `ab`, `seg-*`, `list` (`list-simple`, `label`, `list-head`), `table-wrap`. Verse: `lg`, `l` (with `data-n`, shown as a line number). Drama: `sp`, `speaker`, `stage`. Letters: `opener`, `closer`, `dateline`, `salute`, `signed`, `postscript` (or `seg-postscript`). Front and back matter: `epigraph`, `argument`, `trailer`, `byline`, `dedication`, `bibl`, `cit`, `q`, `titlepage` (or ETC's `titlePage`), `titlePart`, `docTitle`, `docAuthor`, `docImprint`, `docDate`. Figures: `figure`, `figDesc` (or a `head` inside it). Editorial: `add`, `del`, `sic`, `orig`, `reg`, `corr`, `unclear`, `gap`. Notes: `noteref`, `footnotes`, `note` (`note-foot`, `note-end`, `note-n`, `note-body`), `note-inline` (a box as `aside`, bracketed as `span`). Breaks: `lb`, `pb` (`pb-n` for a label, `a.pb-image` for a link to the page image), `ornament`, `textbreak`. Renditions: `rend-italic`, `rend-bold`, `rend-roman`, `rend-smallcaps` (or `rend-small-caps`), `rend-underline`, `rend-sup`, `rend-sub`, `rend-center`, `rend-right`, `rend-left`, `rend-indent`, `rend-indent2`, `rend-indent3` (`rend-indent4` on verse lines), `rend-no-indent`, `rend-hang`.
- **Editorial marks never rest on colour or strike-through alone.** An addition (raised, smaller) and a deletion (struck through) are announced by screen readers as "added: … (end added)" and "deleted: … (end deleted)" (generated text hidden from sight); an empty deletion shows "[deletion]". Unclear text is followed by a small "[?]" read as "(unclear)"; an empty `gap` shows "[…]" read as "gap in the text". A note reference is read as "Note 1". Line numbers and ornaments are hidden from screen readers.
- **Readings** (`title` on `orig`, `reg`, `sic`, `corr` or `abbr`) get a dotted underline. A `title` shows only on mouse hover and most screen readers do not read it on plain text, so the readings toggle (a checkbox `.uvalib-edition__readings`, or the class `uvalib-edition--readings` on the edition) shows every reading inline in brackets, and print always does. Without the toggle, keyboard and touch users cannot reach them.
- **Original line breaks.** Prose reflows: `br.lb` is hidden. CSS cannot give a `<br>` a space (browsers ignore `content` on it), so **the converter must keep whitespace before each `<br class="lb">`** or the words on either side run together (ETC's text does: all 12,061 in a sample of 70 pages; a contents label built from a heading's text, which drops the `<br>`, needs the same care); or write `<span class="lb"></span>`, which edition.css spaces itself. A line ending inside a word (`ca<lb/>pite`) needs the converter to drop the break. Lineation is shown by a checked `.uvalib-edition__lines` (a `<label>` round a checkbox, drawn like the library's outline toggle and filled while checked, or the checkbox itself) inside the edition or anywhere in an element before it, or by the class `uvalib-edition--lines` (for a script toggle such as a `.uvalib-button[aria-pressed]`). Verse lines (`l`) always break.
- **Page images:** `<uvalib-lightbox selector=".uvalib-edition a.pb-image">` opens each `a.pb-image` in the viewer (Previous and Next through the pages); without JavaScript the link opens the image. A page break that starts a section sits on its own line at the end.
- **Dark mode** via the role tokens; **forced colors** keeps the page labels, the note box and the checked toggle visible; **print** shows the text full width in black, keeps the page-break labels, shows every reading, and hides the toggles. Wide tables in `table-wrap` scroll sideways; give the wrapper `tabindex="0"` and a name in the converter if it can scroll. See the [edition example](https://uvalib.github.io/reusable-web-library/#edition).

## Back to top

`<uvalib-back-to-top>` is a “Back to top” button for long pages: minutes, finding aids, transcriptions, long result lists. Entry: `uvalib-back-to-top.js` on the CDN, `@uvalib/web-components/uvalib-back-to-top.js` on npm. See the [Back to top](https://uvalib.github.io/reusable-web-library/#back-to-top) example.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-back-to-top.js"
></script>

<site-page>
  <h1>Minutes of the Board of Visitors</h1>
  …
  <uvalib-back-to-top></uvalib-back-to-top>
</site-page>
```

- **When it shows.** Hidden until the top `offset` pixels (default 400) have scrolled out of view, watched with an IntersectionObserver on a 1px-wide sentinel it adds to `<body>`, positioned at the top of the page (no scroll listener). Hidden means `visibility: hidden`: not a tab stop and not in the accessibility tree. If it has focus as it hides, focus moves to the target.
- **What it does.** A real `<button>` with visible text (`label`, default “Back to top”) and an arrow. It scrolls to the top, smoothly unless the visitor prefers reduced motion, and moves focus to the page's `<h1>` (the first in `<main>`, else the first on the page, else `#top`), or to the element `target` selects, adding `tabindex="-1"` when that element is not focusable, so keyboard and screen reader users land at the top too.
- **Where it sits.** Fixed in the bottom corner on the end side, 1rem in (or the safe-area inset), 44px tall, with the outline (`.uvalib-button--secondary`) look on a solid background. **Put it last in the page's content** (inside `<site-page>`, after everything else): the element is an empty block `--uvalib-back-to-top-space` (default 4.75rem) tall, the space the button needs, so the last lines can scroll clear of it; once that space is in view the button sits in it instead of floating, so it never covers the footer either. While scrolling it floats over content like any fixed button; it never widens the page at 320px. It is hidden in print. `<site-page>` has no attribute for it: load `uvalib-back-to-top.js` and add the element.
- **Colours.** Dark mode follows the role tokens; in forced colors it is a ButtonFace button with a ButtonText border.
- **Analytics.** `['uvalib-back-to-top', 'click']`.

## Tokens and theming

- **Tokens:** inherited `--uva-*` custom properties (for example `--uva-brand-blue`, `--uva-font-family`), set on `:root` or an ancestor of the component. The full set is in `tokens.css`. Components read tokens with fallbacks and never set them.
- **Parts (shadow mode):** on a page, `site-page::part(header)`, `site-page::part(footer)` and `site-page::part(main)`. For a standalone element, `site-header::part(header)` or `site-footer::part(footer)`.
- **Light mode** has no shadow parts; use ordinary selectors, which win over the layered component styles.
- **Fonts and layout shift:** `<site-page>` and `<site-style>` load the Library's Adobe Fonts kit (Franklin Gothic URW). On a slow connection the page is drawn first in the next font of `--uva-font-family` and redrawn when the kit arrives. That next font is **"UVA Franklin Fallback"**: the system's Arial (Liberation Sans on Linux) scaled to Franklin Gothic's widths at each weight (400, 500, 700 and italic), with its line height, so paragraphs wrap the same before and after and the page does not move. `tokens.css`, `base.css` and the styles `<site-page>` and `<site-style>` install all define it. `<site-page>` and `<site-style>` also load its four faces up front, so italic or medium text drawn before the kit arrives is never set in plain Arial first. The faces are scaled to Franklin Gothic's average widths, so most text keeps its lines, but an individual heading can still rewrap: depending on its letters, a string's width in the two fonts differs by a few percent either way. Setting the Adobe Fonts project's `font-display` to `optional` would remove the swap, and so any shift, entirely. If you set your own `--uva-font-family`, keep `"UVA Franklin Fallback"` right after `franklin-gothic-urw`. Where neither Arial nor Liberation Sans is installed (Android), the next font in the stack is used, as before. The kit's `font-display` is set in the Adobe Fonts project (today `auto`: text can stay hidden for up to about 3 seconds before the fallback shows), not by these components. Other kit families, such as LTC Caslon Pro, have no fallback here.
- **States:** runtime state you can style without new attributes, in both modes, through custom states (`ElementInternals.states`): `uvalib-combobox:state(open)` (the popup is showing), `:state(invalid)` (shown as invalid, with `aria-invalid`) and `:state(loading)`; `uvalib-filter-drawer:state(modal)` (at or below the breakpoint) and `:state(open)`; `uvalib-lightbox:state(open)`; `uvalib-tag-list:state(expanded)` (after Show all). They are read-only from the page and never appear as attributes; in a browser without custom states they simply never match, so use them for extra styling, not for anything the page needs.
- **Own width, not the viewport's:** `<uvalib-photo-grid>`, `<uvalib-card-grid>`, `<uvalib-metadata>`, `<events-section>`, `<bento-box>` and base.css's `.uvalib-toolbar` and `.uvalib-result-list` are CSS size containers (`container-type: inline-size`) and change layout by their own width, so they adapt in a sidebar or a drawer. Container query `em`s are the container's own; inline-size containment means they fill their parent but do not size to their content, so give one a width in a shrink-to-fit box. To query them from your own CSS, name your own container rather than relying on the nearest one.
- **Line wrapping:** short headings the components render (card titles, list and section headings, the lightbox caption, the empty state's heading, a non-link result title) use `text-wrap: balance`, and longer text (card excerpts, result snippets, metadata values, messages, the empty state's sentence) `text-wrap: pretty`. Never on badges or buttons: balanced lines leave empty space in a box. It is look, so `no-style` drops it in the components (base.css keeps it); browsers without it wrap as before. Override with `text-wrap: wrap`.
- **Highlight:** `--uva-color-highlight` and `--uva-color-on-highlight` colour highlighted search terms (`<mark>` in `.uvalib-result__snippet`): library.virginia.edu's orange-200 (`--uva-brand-orange-200`, `#ffc999`) with dark text (9.5:1) in light, `#854200` with white text (7.6:1) in dark. Read them for your own highlights, with the light values as fallbacks: `background: var(--uva-color-highlight, #ffc999); color: var(--uva-color-on-highlight, #2b2b2b)`, and keep the highlight bold (or otherwise marked) so it is not colour alone.

## Dark mode

Dark mode is **off by default**. Without it nothing changes: no control, no dark styles, always light, even when the visitor's OS is dark and even when the host page sets its own `color-scheme`.

**Opt in** only when the site's own content supports it (see the caveat below), with the boolean `color-scheme-switch` on `<site-page>`, or on a standalone `<site-header>`:

```html
<site-page color-scheme-switch> … </site-page>
```

- **System by default:** the page follows the visitor's `prefers-color-scheme`, live.
- **The control:** a native radio group, "Theme": Light, Dark, System ("System" also tells screen readers what it currently resolves to). On wide screens it sits at the end of the utility-links row; on narrow screens (992px and below) it is the last item of the Menu popover, with its legend shown. The `vendor` header, which has no Menu, shows it after its link, on a row of its own on narrow screens.
- **Storage:** the choice is remembered per site (origin) in `localStorage` under `uvalib-color-scheme`, as `light` or `dark`; System removes the key. Other tabs follow through the `storage` event. If storage is unavailable the choice still applies to the page. A stored choice is never cleared because the OS preference happens to match it.
- **Mechanism:** the component sets `data-uva-color-scheme` (`system`, `light` or `dark`) on `<html>`. The rules under that attribute set `color-scheme` on the root and the `--uva-color-*` role tokens below as `light-dark()` pairs, and the library's own components set their `color-scheme` from `--uva-color-scheme` (default `light`); the site's content inside `<site-page>` and `<site-style>` keeps the page's. With `no-style` the attribute and an inline `color-scheme` are still set on `<html>`; style off them yourself.
- **Ownership:** every `<site-page>` or `<site-header>` with the switch owns the attribute; it is removed when the last of them is turned off or disconnected. A connected `<site-page>` or `<site-header>` without the switch removes a stray `data-uva-color-scheme` (for example from the snippet below on a page without the switch) unless another component on the page owns it; the stored choice is left alone.
- **Logo:** while the page shows dark mode, every header shows the reversed (white) logo from `https://static.lib.virginia.edu/files/downloads/LibraryLogos/` (it is not on the library website, so it does not follow `root-link-domain`). Under forced colors (a Windows contrast theme), which repaints the header, it follows the OS theme instead.
- **Footer:** already dark, it is the same in both schemes.
- **Alerts:** `<site-alerts>` reads the `--uva-color-alert-*` role tokens (`-text`, `-link`, `-header-bg`, `-header-text`, and `-bg` / `-border` for `critical`, `warning`, `info`, `regional` and `regional-info`): library.virginia.edu's colours in light, a muted dark palette in dark, text 7:1 or more on every alert in both. The focus ring follows the text colour, so it passes on the dark alerts too.
- **Pre-footer band:** dark `#005679`, white text; unstyled links in it are white too (the site's own link colours still win).

**Avoid a flash of light on load.** Module scripts run after the first paint, so on pages whose `<site-page>` (or `<site-header>`) has `color-scheme-switch`, and only there, put this classic inline script in `<head>`, together with linked `tokens.css` and `base.css` (`<site-page>` also sets the attribute when it connects, so pages without it only flash briefly):

<!-- prettier-ignore -->
```html
<link rel="stylesheet" href="https://unpkg.internal.lib.virginia.edu/web-components/v1/tokens.css" />
<link rel="stylesheet" href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css" />
<script>try{var s=localStorage.getItem('uvalib-color-scheme')}catch(e){}if(window.CSS&&CSS.supports('color','light-dark(#000,#fff)'))document.documentElement.dataset.uvaColorScheme=s==='light'||s==='dark'?s:'system'</script>
```

**Content Security Policy:** allow the reversed logo (`img-src https://static.lib.virginia.edu`) and the inline snippet (a `'sha256-…'` hash of its exact text, or a nonce on the `<script>`).

**Browser support:** dark mode needs CSS `light-dark()` (Chrome and Edge 123, Firefox 120, Safari 17.5). Elsewhere no control is shown, no attribute is set, and the page stays light.

**Host content (caveat):** the components only theme themselves and the page background and text. The site's own CSS must follow too: read the role tokens, with their light values as fallbacks (`color: var(--uva-color-link, #232d4b)`), or style off `:root[data-uva-color-scheme]`. Hard-coded colours in the site's CSS stay as they are. Iframes and third-party widgets will not follow. With `no-global-styles` or standalone components, link `tokens.css`, which holds the role tokens and the opt-in rules (the npm package exports it as `@uvalib/web-components/tokens.css`).

**Role tokens.** Defined only while dark mode is on; components fall back to the palette token or value they always used, so light mode is unchanged. Do not flip the palette tokens instead: `--uva-brand-blue` is both text on white and a background under white text. With dark mode on, the role tokens resolve on `:root`, so `--uva-brand-*` overrides set on `:root` still apply in Light, but overrides scoped below `:root` (for example `site-header { --uva-brand-blue: … }`) are ignored for the colours the role tokens cover; set them on `:root`, or override the `--uva-color-*` token there instead.

| Token                         | Used for                                                    | Light                                | Dark                 |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------ | -------------------- |
| `--uva-color-surface`         | page background                                             | `#ffffff`                            | `#10172b`            |
| `--uva-color-surface-raised`  | header, nav bar, panels, popover, inputs, buttons, chips    | `#ffffff`                            | `#232d4b`            |
| `--uva-color-surface-hover`   | hover and open-group background                             | `--uva-grey-100` (`#dadada`)         | `#2c3858`            |
| `--uva-color-text`            | text                                                        | `--uva-grey-darkest` (`#2b2b2b`)     | `#e8e8e8`            |
| `--uva-color-text-muted`      | secondary labels                                            | `#4b5563`                            | `#adadad`            |
| `--uva-color-link`            | links, headings, accent text                                | `--uva-brand-blue` (`#232d4b`)       | `#87b9d9`            |
| `--uva-color-utility-link`    | header utility and site links                               | `--uva-blue-alt-dark` (`#005679`)    | `#91d8f2`            |
| `--uva-color-focus`           | focus rings                                                 | `--uva-brand-orange` (`#e57200`)     | `#ffb370`            |
| `--uva-color-current`         | current-page underline                                      | `--uva-brand-orange` (`#e57200`)     | `#e57200`            |
| `--uva-color-accent-bg`       | pressed chip, slider range and thumbs, skip link, selection | `--uva-brand-blue` (`#232d4b`)       | `#87b9d9`            |
| `--uva-color-on-accent`       | text on `--uva-color-accent-bg`                             | `#ffffff`                            | `#10172b`            |
| `--uva-color-control-border`  | borders of controls (chips, inputs, the theme control)      | `--uva-grey` (`#808080`)             | `#7a84a0`            |
| `--uva-color-input-text`      | date input text                                             | `#1f2937`                            | `#e8e8e8`            |
| `--uva-color-border`          | decorative borders and rules (dark only)                    | each component's own (`#ccc`, …)     | `#7a84a0`            |
| `--uva-color-track`           | slider track                                                | `#e5e7eb`                            | `#2c3858`            |
| `--uva-color-shadow`          | panel shadow                                                | `rgba(0, 0, 0, 0.2)`                 | `rgba(0, 0, 0, 0.6)` |
| `--uva-color-pre-footer-bg`   | pre-footer band background                                  | `--uva-blue-alt-300` (`#bfe7f7`)     | `#005679`            |
| `--uva-color-pre-footer-text` | pre-footer band text                                        | `--uva-grey-darkest` (`#2b2b2b`)     | `#ffffff`            |
| `--uva-color-highlight`       | highlighted search terms (`<mark>` in results)              | `--uva-brand-orange-200` (`#ffc999`) | `#854200`            |
| `--uva-color-on-highlight`    | text on `--uva-color-highlight`                             | `--uva-grey-darkest` (`#2b2b2b`)     | `#ffffff`            |

`--uva-color-scheme` is the scheme the components follow (`light dark`, `light` or `dark`). See the [Dark mode](https://uvalib.github.io/reusable-web-library/#dark-mode) example in the playground.

## Search and filter components

`<uvalib-filter>` (a checkbox facet with optional scope chips and See more / See less), `<uvalib-date-range>` (a year slider plus date inputs) and `<uvalib-date-histogram>` (counts as bars) are for search results pages. They are not page chrome, so use them inside `<site-page>`. Each has its own entry: `uvalib-filter.js`, `uvalib-date-range.js` and `uvalib-date-histogram.js` on the CDN, `@uvalib/web-components/uvalib-filter.js` and the same path for the others on npm.

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

The filter and the date range are controlled: set `value` (and `scopeValue`) from your own state after each event. The date range also fires `uvalib-date-range-value` (`detail: { value: [start, end] }`) for every change to the range it shows, including a `value`, `min` or `max` set in script, so other components (such as a linked `<uvalib-date-histogram>`) can follow it; it is not a visitor action and is never sent to analytics. `date-range-change` stays the visitor's own change. `min` and `max` are required for the date range; without valid ones it renders nothing and warns once in the console. All three support `no-shadow-dom` and `no-style`. See the [Search facets](https://uvalib.github.io/reusable-web-library/#search-facets) example in the playground and the generated reference below.

`<uvalib-date-histogram>` draws one button per month (grouped by year), per year, or per decade (`granularity="decade"`, five to a row labelled 1800, 1850, …, named "1810s: 22 meetings"; choosing one selects `1810/1819`, and a linked date range gets `1810-01-01` to `1819-12-31`). `granularity="auto"` picks months when every count is a month within 3 years, years up to 30 years, and decades beyond. For a long span such as 1817–2026 use decades rather than a sideways-scrolling year row: 210 year bars at the 24px minimum would be over 5,000px wide. Give it `items` (`{ date: 'YYYY' | 'YYYY-MM', count }`) or a child `<table>` (two columns, or a year-by-month grid). The table stays in the page for assistive technology and for visitors without JavaScript, and "Show as table" shows it again. `unit="photos"` names a bar "October 2015: 5,311 photos". Arrow keys move between bars. `selected` is one bucket or a range (`2015-10` or `2015-10/2016-03`); the pressed bars also get a ring and a stripe. A choice fires `select` with `{ from, to }` as ISO dates. `range-for="dates"` keeps a `<uvalib-date-range id="dates">` in step: a bar sets its `value`, and any change to the range's value, from its controls or set in script (a Clear button, Back/Forward, a restored URL), highlights the overlapping bars; the range fires `uvalib-date-range-value` for every change, which other code can listen for too. On (re)connect the range's value wins when it holds a selection, and the histogram never writes a rounded value back. Setting `selected` in script updates the date range and does not fire `select`. A value equal to that range's own `min` and `max` selects nothing. `scale="log"` sizes bars by log(count + 1). On a narrow screen each year row scrolls inside the component ("Scroll sideways to see more."); year bars wrap. `variant="strip"` is a non-interactive per-year row (`role="img"`) for a card, per decade with `granularity="decade"`. A date that is not a bucket at the current granularity (a bare year on a month chart, a day, "undated") is a chip.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-date-histogram.js"
></script>
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-date-range.js"
></script>

<uvalib-date-range
  id="dates"
  min="2005-01-01"
  max="2017-12-31"
  label="Photo dates"
></uvalib-date-range>
<uvalib-date-histogram
  id="hist"
  range-for="dates"
  granularity="month"
  unit="photos"
  label="Photos by date"
></uvalib-date-histogram>
<script type="module">
  const hist = document.querySelector('#hist');
  hist.items = [
    { date: '2015-10', count: 5311 },
    { date: '2015-11', count: 842 },
  ];
  hist.addEventListener('select', (e) => console.log(e.detail)); // { from, to }
</script>
```

### Filter groups

A search page's facets (Availability, Subject, Format, Date, Author…) can each be a filter group: `<uvalib-filter>` has six opt-in attributes for that, and without them it is exactly as before (same markup, order and events).

- `collapsible` turns the legend into a disclosure button (`aria-expanded`, `aria-controls`) with the library's caret, as in `<uvalib-contents>` and the main navigation (it flips at once, with no motion). Enter and Space toggle it. `collapsed` starts it closed and is reflected as the visitor toggles; nothing is remembered, so the page decides each time. While closed, the button shows how many values are selected ("Subject, 2 selected"), so a closed group never hides an active filter. Each toggle fires `toggle` with `{ open }`. `heading-level="2"` to `"6"` puts the legend's text (or button) in that heading for the page outline; by default there is none, as before. base.css holds a `collapsible collapsed` group at its 44px button until the script loads, so the page does not move.
- `searchable` adds a search field above the values (labelled "Search Subject", or `search-label`) that narrows them as the visitor types: case- and accent-insensitive ("eco" finds "Écologie"), the matched text bold and underlined in a `<mark>`. A line under it says "12 of 340 subjects" (`unit="subjects"`; the default is "values"), also said politely once typing pauses. Checked values always stay in the list, pinned at the top, so a selection never disappears while filtering. While searching, every match is shown (no See more), up to 100 ("type more to narrow them"); clearing the search brings `limit` and See more back. Escape clears the search (and, while there is text, does not close a surrounding filter drawer). The field has no `name`, so it is never submitted with a form.
- `sortable` adds "Sort by: Count | Name (A–Z)": two native radios drawn as a segmented control (one tab stop, arrow keys choose), the current sort filled and ticked on every group, so it is never left to colour or to an icon on some groups only. `sort="count"` (the default) is most results first, ties in the data's order; `sort="name"` is A–Z. Without `sortable` the data's own order is kept, unless you set `sort="name"`. The visitor's choice updates `sort` and fires `sort` with `{ sort }`.
- `clearable` adds a 44px "Clear" button (named "Clear Subject filters"), shown only while something in the group is selected. It fires one `filter-change` with `{ name, value: [] }` and moves focus to the group's first checkbox.
- `apply-button` stages checkbox changes until the visitor presses Apply, for searches that are slow to run (one search per Apply instead of one per checkbox). Changed rows say "not applied" in words, a polite status says "3 changes not applied yet", and the button reads "Apply 3 changes". Apply fires `filter-change` once with the new value; Reset goes back to the applied `value`. Setting a different `value` from the page drops staged changes (the same value, re-set after another group's search, keeps them). Clear acts at once.
- `match="any"` or `match="all"` says under the legend how the group's values combine ("Matches any selected value" / "Matches all selected values"), and describes the group to assistive technology. It changes only the text; your search decides the logic. No text by default.

Analytics: `toggle` (1 open, 0 closed), `sort` (`Subject: name`), `clear` and `apply` with the number of values, and `search` with the number of matches once a search pauses, never the typed text; with `apply-button`, each value's `facet-change` is sent when Apply is pressed.

```html
<uvalib-filter
  id="subjects"
  collapsible
  heading-level="2"
  searchable
  sortable
  clearable
  match="any"
  unit="subjects"
  limit="5"
></uvalib-filter>
<uvalib-filter id="formats" collapsible collapsed heading-level="2" apply-button></uvalib-filter>
<script type="module">
  await customElements.whenDefined('uvalib-filter');
  const facet = (name, title, keys) => ({
    name,
    title,
    position: 0,
    buckets: keys.map(([key, doc_count]) => ({ key, doc_count, selected: false })),
  });
  const groups = {
    subjects: facet('subject', 'Subject', [
      ['History', 40],
      ['Écologie', 12],
    ]),
    formats: facet('format', 'Format', [
      ['Book', 120],
      ['Map', 18],
    ]),
  };
  for (const [id, filter] of Object.entries(groups)) {
    const el = document.getElementById(id);
    el.filter = filter;
    // Controlled: run the search, then set value from your search state.
    el.addEventListener('filter-change', (e) => (el.value = e.detail.value));
  }
</script>
```

## Combobox

`<uvalib-combobox>` is a text field that suggests values as you type, from a local list or a URL: a person, place or subject picker. It follows the WAI-ARIA APG [editable combobox with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/) and looks like `.uvalib-input`. Entry: `uvalib-combobox.js` on the CDN, `@uvalib/web-components/uvalib-combobox.js` on npm.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-combobox.js"
></script>

<!-- Local items, set in script (objects or strings). -->
<form action="/search">
  <uvalib-combobox
    id="person"
    name="person"
    label="Person"
    description="Type part of a name."
  ></uvalib-combobox>
  <button class="uvalib-button" type="submit">Search</button>
</form>
<script type="module">
  document.querySelector('#person').items = [
    { value: 'p-101', label: 'Avery Ashby', description: 'Photographer' },
    { value: 'p-102', label: 'Bea Brandt' },
  ];
</script>

<!-- <option> children, directly or in a <datalist>. A fallback <input list> works before
     the script loads (give it aria-label); its text and name carry over. -->
<uvalib-combobox label="Subject" name="subject">
  <input name="subject" list="subjects" aria-label="Subject" />
  <datalist id="subjects">
    <option value="architecture">Architecture</option>
    <option value="athletics" data-description="Sports, games and teams">Athletics</option>
  </datalist>
</uvalib-combobox>

<!-- A URL: {q} is the typed text, URL-encoded. -->
<uvalib-combobox
  id="place"
  label="Place"
  name="place"
  src="/api/places?q={q}"
  min-length="2"
></uvalib-combobox>
<script type="module">
  // Only if the response is not already an array of { value, label?, description? }.
  document.querySelector('#place').transform = (data) =>
    data.results.map((r) => ({ value: r.id, label: r.name }));
</script>
```

- **Suggestions.** `items` (`[{ value, label?, description?, disabled? }]` or strings) wins over the children while set; `<option>` children use `label` or their text, `value`, `data-description` and `disabled`. Local matching ignores case and accents and finds the text anywhere in the label: labels that start with it come first, then those with a word that starts with it. At most `max-results` are shown (default 50; `0` for all), so 16,000 records stay fast; the popup then says “Showing 50 of 1,234. Type more to narrow them.” The matched text is bold and underlined in a `<mark>`.
- **`src`.** Fetched 250 ms after the last keystroke once the text has `min-length` characters (default 1); a newer keystroke aborts the older request, and answers are cached per text. The response is a JSON array of the same shape, or `transform(data, query)` maps it. A failed load shows and announces “Couldn't load suggestions” and never throws.
- **Keys** (as the APG example). Down opens the list on the first suggestion and moves, wrapping; Up opens on the last; Alt+Down opens without moving and Alt+Up closes. Enter chooses the active suggestion and does not submit the form; with none active, Enter submits as in any field. Escape closes the list, and a second Escape clears the field. Home, End, Left and Right move the caret. Tab leaves without choosing. Typing never picks a suggestion for you.
- **Free text or a choice.** `value` is the text in the field and `selected` the chosen suggestion (or null). Typing after a choice keeps the text and drops the choice; leaving the field with text that is exactly one suggestion's label (ignoring case and accents) chooses it. `must-choose` makes any other text invalid. Set `selected` (an item) or `value` in script to show a value; neither fires `change`.
- **Forms.** The element is form-associated: with `name` it submits the chosen suggestion's `value`, or else the text, in a plain `<form>`. A reset restores the `value` attribute; `required`, `disabled` and a disabled `<fieldset>` work as on an `<input>`.
- **Events.** `select` (`detail: { item }`, the object you gave) when a suggestion is chosen; `change` (`detail: { value, item }`) when the value is committed: a choice, a clear, or leaving the field with changed text. Both bubble and are composed. The field's own `input` events reach the page; its native `change` and `select` do not.
- **Accessibility.** A visible `label` is required (one console warning without it); `description` is a hint read with the field (`aria-describedby`). The field is a real `<input role="combobox">` with `aria-expanded`, `aria-controls` and `aria-activedescendant`; the popup is a `role="listbox"`. A polite status says “5 suggestions”, “No suggestions” or “Loading suggestions” half a second after the list settles, never on the first render. The clear button is a real button named “Clear <label>”, 44px, shown only with text, and returns focus to the field. Suggestions are at least 44px tall; the active one has a fill, a bar at its start and an outline (Highlight in forced colors), not colour alone.
- **Layout.** The popup sits under the field, as wide as it, so it never overflows a 320px screen, and follows the field when the page or a scrolling container scrolls; a long list scrolls inside it with the active suggestion kept in view. Where the browser supports the Popover API and CSS anchor positioning (Chrome, Edge and Safari today), it is a manual popover in the top layer anchored to the field, so an ancestor with `overflow: hidden` or a scrolling panel (such as `<uvalib-filter-drawer>`'s) never clips it, it opens above the field when there is no room below, and inside a modal dialog it shows above the dialog. Elsewhere (Firefox today) it is positioned inside the element, and an ancestor with `overflow: hidden` clips it. Its ARIA is the same either way. Dark mode follows the role tokens. `no-style` keeps the layout, the 44px targets and the hidden status.
- **States.** `:state(open)` while the popup shows, `:state(invalid)` while the text is shown as invalid, `:state(loading)` while `src` loads (see [Tokens and theming](#tokens-and-theming)).
- **Before the script loads.** `base.css` shows the label (from the attribute) and holds the field's height, plus one line for a `description`, so nothing below moves on upgrade. A fallback `<input>` child is a working field meanwhile (with `list`, the browser's own suggestions); once upgraded it is disabled so it does not submit twice. Other children stay hidden.
- **Analytics.** `select` with the label and the suggestion's position (from 1), and `clear` with the label. Never the typed text or a suggestion's text or value: they can be people's names.

## List filter

`<uvalib-list-filter>` is a text field that filters a long list already on the page as you type: a collection's 473 texts, a staff directory, a table of databases. The list is your own markup and stays complete without the script; the field looks like `.uvalib-input`. Entry: `uvalib-list-filter.js` on the CDN, `@uvalib/web-components/uvalib-list-filter.js` on npm. See the [List filter](https://uvalib.github.io/reusable-web-library/#list-filter) example.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-list-filter.js"
></script>

<uvalib-list-filter
  for="doc-list"
  noun="texts"
  singular="text"
  placeholder="Title or author"
  query-param
></uvalib-list-filter>
<ol id="doc-list">
  <li data-filter-text="amanda c. armentrout to william f. brand, 1866 armentrout, amanda c">
    <a href="/text/A2956/">Amanda C. Armentrout to William F. Brand, August 17, 1866</a>
    <span>Armentrout, Amanda C · 1866</span>
  </li>
  <!-- … -->
</ol>
```

- **The list.** `for` is the id of an element whose children are the items: a `<ul>` or `<ol>`, a `<dl>` of `<div>` rows, a card grid, or a `<table>` (the rows of its `<tbody>` elements; the header stays). `selector` picks the items instead, inside `for` when both are set, else anywhere in the page (or the shadow root the element is in).
- **Matching.** Every word typed must appear in the item, in any order (“kate armentrout” finds “Angus to Kate Armentrout”), ignoring case and accents (“eneide” finds “L’Énéide”). The item's `data-filter-text` is matched when present (put the title, author and dates there, as ETC does), otherwise its text. Items that do not match get the `hidden` attribute, and a small rule keeps them hidden even if your CSS gives them a `display`; clearing the field removes it from all of them.
- **Fast with thousands of items.** The items' text is read and folded once, on the first keystroke; each keystroke then compares strings and touches only the items whose state changes. In the tests a 3,000-item list takes from under 1 ms to about 25 ms per keystroke, style and layout included (the slowest is showing all 3,000 again); the test fails above 150 ms. Items added or removed later, and `data-filter-text` changes, are picked up; after changing an item's text in script, call `refresh()`.
- **Groups.** For a list in headed sections, put `data-filter-group` on each section's wrapper (its heading and its list) and point `selector` at the items: a group whose items are all hidden is hidden too, heading and all. Groups are wrappers, not heading-and-sibling pairs, to keep the rule simple and the markup explicit.
  ```html
  <uvalib-list-filter selector="#by-letter li" noun="people"></uvalib-list-filter>
  <div id="by-letter">
    <section data-filter-group>
      <h2>A</h2>
      <ul>
        <li>Ada Lovelace</li>
      </ul>
    </section>
    <section data-filter-group>
      <h2>B</h2>
      <ul>
        <li>Bruno Taut</li>
      </ul>
    </section>
  </div>
  ```
- **The field.** A visible `label` (default “Filter”; `hide-label` keeps it for screen readers only, when a heading beside the field says it) and an optional `placeholder`. A Clear button (a real button named “Clear Filter”, 44px, shown only with text) or Escape empties the field, and focus stays in it. Enter does nothing: the list is already filtered.
- **The count.** Under the field: “Showing all 473 texts”, “Showing 12 of 473 texts”, updated at once (`noun` is the plural, default “items”; `singular` the word for one). A polite status announces it once the typing settles (a second after the last keystroke), never on every key and never at load. When nothing matches, a `.uvalib-message` under the count says “No texts match “zzz”.”, and that is what is announced. To show the count somewhere else, point `results-count` at a `<uvalib-results-count>` with `total` and `noun` in its markup (so it shows the count before the script and does not announce it at load): the filter sets its `shown` and `total`, and leaves the visible count and the announcement to it.
- **In the URL.** `query-param` (a bare attribute means `filter`; `query-param="q"` names it) reads the filter from the URL at start and writes it back with `history.replaceState` a moment after typing (and before the page is left), so a filtered list can be shared or bookmarked and Back returns to it. Hash routes keep it in the hash, as the lightbox does. Off by default.
- **Events.** `uvalib-list-filter-change` (`detail: { query, shown, total }`, bubbling and composed) each time the filter is applied with a new query: typing, Clear, Escape, `value` set in script, the URL at start, Back and Forward. `value` (the field's text) can be read and set; `shown` and `total` are read-only.
- **No jump on upgrade.** With `base.css`, the label, field and count's height are held before the script runs (less the label with `hide-label`, less the count with `results-count`), and the whole list is shown, so nothing moves when it upgrades. A filter restored from the URL does hide items at load.
- **Accessibility.** The field is a labelled `<input type="search">` (the browser's own clear icon is hidden, as the 44px Clear button does its job); the focus ring is the library's 3px orange. The count, the status and the message use the muted and alert role tokens, which keep at least 4.5:1 in light and dark. `no-style` keeps the layout, the 44px targets and the hidden status. Removing the element shows the whole list again.
- **Analytics.** `['uvalib-list-filter', 'filter', '', <how many match>]` once the typing settles on a new query (the same words in another case or order do not count again), and `['uvalib-list-filter', 'clear']` when the visitor empties the field. Never the typed text. A filter restored from the URL or set in script is not reported.

## Filter drawer

`<uvalib-filter-drawer>` holds a search page's form and filters: a plain sidebar on wide screens, and at and below `breakpoint` (default `48rem`) a “Search and filters” button that opens them in a modal panel from the side, as Virgo does on phones. Entry: `uvalib-filter-drawer.js` on the CDN, `@uvalib/web-components/uvalib-filter-drawer.js` on npm. See the [Filter drawer](https://uvalib.github.io/reusable-web-library/#filter-drawer) example.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-filter-drawer.js"
></script>

<div class="search-layout">
  <uvalib-filter-drawer label="Search and filters" live="results-count status">
    <form class="uvalib-search-form" role="search">…</form>
    <uvalib-filter id="decade"></uvalib-filter>
  </uvalib-filter-drawer>
  <section>
    <uvalib-results-count id="results-count" total="1204"></uvalib-results-count>
    <p id="status" role="status"></p>
    …
  </section>
</div>
<script type="module">
  const drawer = document.querySelector('uvalib-filter-drawer');
  document.querySelector('#decade').addEventListener('filter-change', (e) => {
    drawer.count = e.detail.value.length; // the number of filters set, on the button
  });
</script>
```

- **Wide screens.** The children are shown as written: no button, no dialog role. Lay out the sidebar column yourself (a grid with the drawer in the first column above `48rem`).
- **Narrow screens.** Only the button is shown (44px, `aria-haspopup="dialog"`, `aria-expanded`). It opens a native `<dialog>` with `showModal()`, named by its visible heading (the `label`), with a 44px Close button that takes focus. Close, Escape and a click on the backdrop close it, and focus returns to the button. Widening the window past the breakpoint closes it and leaves focus where it was. `show()` and `close()` open and close it from script (call `close()` after a search, say); `open` says whether it is open; `open` and `close` events follow.
- **The page behind is inert.** A modal dialog makes everything outside it inert, `<site-page>`'s shadow header, skip link and alerts included, so focus cannot reach them and no script has to send it back. The only way out is Escape, Close, the backdrop or the browser's own controls: no keyboard trap.
- **Announcements from behind.** Inert content is not announced, so a results count or status notice outside the panel would go silent while the visitor filters. List their ids in `live`: while the panel is open the drawer watches them (also inside a component's open shadow root, such as `<uvalib-results-count>`'s live region) and repeats each new announcement in its own polite live region inside the panel, cleared after 5 seconds. Regions inside the drawer need no entry.
- **Same nodes.** The children are moved between the sidebar and the panel (with `moveBefore()` where the browser has it), never re-created: typed text, checked boxes, listeners and each `<uvalib-filter>`'s state stay, through open, close and resizes. In shadow DOM they never move at all (the slot does). Children added later are included.
- **Count.** `count` (a number the page sets) is shown on the button when above 0 and read as “Search and filters, 3 active”. The drawer does not count inputs itself: only the page knows which of them are filters.
- **Look.** The panel slides in from the start side (no slide with reduced motion), `--uvalib-filter-drawer-width` wide (default `min(24rem, 100% - 3rem)`, leaving a strip of backdrop at 320px), scrolling on its own. Dark mode follows the role tokens; in forced colors the panel keeps a visible edge.
- **Before the script loads.** On wide screens the children show as the sidebar, as they will once it upgrades. At and below the default `48rem`, `base.css` hides them and holds the button's 44px, so a phone never shows the filters in full and nothing moves when the element upgrades (no layout shift). With your own `breakpoint`, `base.css` leaves the drawer alone: add the same rule for your width to the page's CSS (`(max-width: …)`, as the element's own media query):

  ```css
  @media (max-width: 60rem) {
    :where(uvalib-filter-drawer[breakpoint='60rem']):not(:defined) {
      display: block;
      min-block-size: 44px;
    }
    :where(uvalib-filter-drawer[breakpoint='60rem']):not(:defined) > * {
      display: none;
    }
  }
  ```

- **Analytics.** `open` and `close` with the drawer's `label`, only when the visitor does it (not a resize or a script).

## Dialog

`<uvalib-dialog>` is a modal dialog for content and short forms: search tips, Cite, a sign-in prompt, a request form. It looks and behaves like the library's other dialogs (`<uvalib-lightbox>`, `<uvalib-filter-drawer>`): a native `<dialog>` opened with `showModal()`, a visible heading that names it, a 44px Close button, the same tokens, backdrop, dark mode and forced colors. Use it instead of a hand-built modal, a `role="dialog"` div or a framework's dialog (such as PrimeVue's). Entry: `uvalib-dialog.js` on the CDN, `@uvalib/web-components/uvalib-dialog.js` on npm. See the [Dialog](https://uvalib.github.io/reusable-web-library/#dialog) example.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-dialog.js"
></script>

<!-- A content dialog opened by a button anywhere in the page. -->
<button type="button" class="uvalib-button" data-uvalib-dialog="search-tips">Search tips</button>

<uvalib-dialog id="search-tips" label="Search tips">
  <ul>
    <li>Put a phrase in quotes: <code>"board of visitors"</code>.</li>
    <li>Use <code>OR</code> for either word: <code>Jefferson OR Madison</code>.</li>
  </ul>
  <p>
    <a href="https://guides.lib.virginia.edu/" target="_blank" rel="noopener"
      >Research guides (opens in a new tab)</a
    >
  </p>
</uvalib-dialog>

<!-- A form dialog: method="dialog" closes it with the button's value. -->
<button type="button" class="uvalib-button" data-uvalib-dialog="email-cite">Email citation</button>

<uvalib-dialog id="email-cite" label="Email this citation" size="small">
  <form method="dialog">
    <div class="uvalib-message uvalib-message--error" role="alert" id="cite-errors" hidden></div>
    <label for="cite-email">Email <span class="uvalib-required">(required)</span></label>
    <input
      class="uvalib-input"
      id="cite-email"
      name="email"
      type="email"
      required
      autofocus
      aria-describedby="cite-email-help"
    />
    <span class="uvalib-help" id="cite-email-help">We send the citation to this address only.</span>
    <button class="uvalib-button" value="send">Send</button>
    <button class="uvalib-button uvalib-button--secondary" value="cancel" formnovalidate>
      Cancel
    </button>
  </form>
</uvalib-dialog>

<script type="module">
  const dialog = document.querySelector('#email-cite');
  dialog.addEventListener('uvalib-dialog-close', (e) => {
    if (e.detail.returnValue === 'send') {
      /* send it */
    }
  });
  // From script (after a sign-in check, say): focus returns to what had focus.
  // dialog.show();  dialog.close('cancel');
</script>
```

- **Opening.** A `<button type="button" data-uvalib-dialog="<id>">` anywhere in the document opens the dialog with that id: one delegated listener, so buttons a framework renders later work too (also inside another component's shadow root). Where the browser has invoker commands, `<button commandfor="<id>" command="--show-modal">` works too; the built-in `show-modal` command only applies to a real `<dialog>`, so a custom element needs the `--show-modal` custom command (`--close` closes it). Keep `data-uvalib-dialog` for browsers without invokers; no polyfill is needed. From script: `show()`, `close(returnValue?)`, or set `open` (it reflects, so `<uvalib-dialog open>` and a framework's `:open` binding work).
- **Focus.** On open, focus moves to the content's `[autofocus]` element if there is one (a form dialog: put `autofocus` on the first field), else to the heading (`tabindex="-1"`), so a screen reader starts at the top and long content opens at its start (the APG's advice for content dialogs). On every close, whichever way (Close, Escape, the backdrop, Cancel, a form submit, `close()`, the element being removed), focus returns to the element that opened it; if that element is gone, to `return-focus` (a selector, or an element set as the property). Virgo's dialogs sent focus to the top of the page instead.
- **Modal.** `showModal()` makes the rest of the page inert, `<site-page>`'s shadow header, skip link and alerts included: Tab and a screen reader's virtual cursor stay in the dialog with no trap script, and nothing else needs `inert` or `aria-hidden`.
- **Dismissal.** Escape always closes it (if a control inside uses Escape itself, such as a combobox, it must stop the key while it handles it). A click on the backdrop closes it (`closedby="any"`; in Safari, which lacks `closedby`, the same check in script), but a press that starts inside and ends on the backdrop (selecting text, a drag) does not. `persistent` keeps the backdrop from closing it, for a form that would lose typed text; Escape and Close still work.
- **Forms.** A `<form method="dialog">` (or a submitter with `formmethod="dialog"`) closes it on submit with the submitter's `value` as `returnValue`, after the browser's own validation; give Cancel `formnovalidate`. A `<button data-uvalib-dialog-close="cancel">` closes it without submitting. Other forms submit as usual (call `close()` yourself when done). `uvalib-dialog-close` has `detail.returnValue` and `detail.reason` (`close-button`, `button`, `escape`, `backdrop`, `form`, `api` or `removed`); `uvalib-dialog-open` has `detail.reason` (`button` or `api`).
- **Required and help text.** Say "required" in words (`<span class="uvalib-required">(required)</span>` in the label, plus `required` on the field), never with colour or an asterisk alone. Help text is `.uvalib-help`, tied to its field with `aria-describedby`. Both are in `base.css` in the muted text colour, 7:1 or more in light and dark (WCAG AAA): Virgo's grey failed contrast.
- **Errors.** Never only red outlines. On a failed submit, fill an error summary at the top of the form, `<div class="uvalib-message uvalib-message--error" role="alert">`, that starts with “Error:” and lists each problem as a link to its field; set `aria-invalid="true"` on each bad field and put its own message next to it, tied with `aria-describedby`. Then move focus to the first bad field. Clear it all when the field is fixed.
- **Status messages.** A "Copied" or "Sent" confirmation inside the dialog is a `<div class="uvalib-message uvalib-message--success" role="status">` that is in the dialog from the start and filled when it happens (text 7:1 or more in light and dark), not a toast: Virgo's copy toast failed contrast and disappeared before it could be read. Keep focus where it was.
- **Links.** A link that opens a new tab or window says so in its text (“(opens in a new tab)”); better, open it in the same tab.
- **Sizes.** `size="small"` (30rem), `medium` (the default, 40rem) or `large` (60rem) at most; `--uvalib-dialog-width` sets another width. On phones it is the viewport less 16px on each side, never taller than the viewport less 32px; the content scrolls inside it and the heading and Close stay in view (320px reflow).
- **Content stays yours.** In shadow DOM the children are slotted, never moved: ids, `getElementById`, the page's CSS and listeners, and framework-rendered content keep working (use the default shadow mode with Vue, React and the like). With `no-shadow-dom` they are moved into the dialog element, in the same document. `description` (or a `slot="description"` child) is shown under the heading and set as `aria-describedby`; use it only for a short sentence.
- **Look.** It fades in (no motion with reduced motion); in forced colors it keeps a 2px system-colour edge. Style it with `::part(dialog)`, `header`, `heading`, `close`, `description` and `body`, and `:state(open)`.
- **Before the script loads.** `base.css` hides `uvalib-dialog:not(:defined)`, so the content never shows in the page; once defined, a closed dialog renders nothing.
- **Analytics.** `['uvalib-dialog', 'open', '<label>']` when a visitor's button opens it and `['uvalib-dialog', 'close', '<label>']` when the visitor closes it; nothing for `show()`, `close()` or `open` from script, and never the content or what was typed.

## Results, badges and tags

For search pages, Virgo-like result lists and digital collections: badges and labels, a toolbar above the results, a results count that screen readers hear, keyword lists, an empty state and loading placeholders. The classes are in `base.css` (no script); `<uvalib-tag-list>` and `<uvalib-results-count>` are elements with their own entries (`uvalib-tag-list.js`, `uvalib-results-count.js`; npm `@uvalib/web-components/uvalib-tag-list.js`, `…/uvalib-results-count.js`). See the [Results toolbar & badges](https://uvalib.github.io/reusable-web-library/#results-toolbar) example.

### Badges

```html
<span class="uvalib-badge">Plain</span>
<span class="uvalib-badge uvalib-badge--category">Faculty &amp; Staff Portraits</span>
<span class="uvalib-badge uvalib-badge--status uvalib-badge--success">Done</span>
<span class="uvalib-badge uvalib-badge--status uvalib-badge--warning">Processing</span>
<span class="uvalib-badge uvalib-badge--status uvalib-badge--danger">Failed</span>
<span class="uvalib-badge uvalib-badge--status uvalib-badge--info">Largest</span>
<span class="uvalib-badge uvalib-badge--new">New</span>
<span class="uvalib-badge uvalib-badge--body">At body size</span>

<!-- A count over an image: the wrapper positions it at the top-left corner. -->
<div class="uvalib-media">
  <img src="rotunda.jpg" alt="The Rotunda in snow" width="600" height="400" />
  <span class="uvalib-badge uvalib-badge--count">13 photos</span>
</div>
<!-- Several: wrap them. -->
<div class="uvalib-media">
  <img src="lawn.jpg" alt="The Lawn" width="600" height="400" />
  <div class="uvalib-media__badges">
    <span class="uvalib-badge uvalib-badge--count">51 events · 10,700 photos</span>
    <span class="uvalib-badge uvalib-badge--new">New</span>
  </div>
</div>

<!-- A decorative icon before the word (the word carries the meaning). -->
<span class="uvalib-badge uvalib-badge--status uvalib-badge--success">
  <svg aria-hidden="true" viewBox="0 0 16 16">
    <path d="M2 8l4 4 8-8" fill="none" stroke="currentColor" stroke-width="2" />
  </svg>
  Done
</span>
```

- **Sizes:** small text (0.875rem) by default, the card chip's size; `--body` is body size.
- **`--category`** is the `<uvalib-card>` chip exactly (`--uva-blue-alt-300` with `--uva-blue-alt-dark` text, 6.13:1, in both schemes). **`--count`** is for media: near-black at 82% with white text, at least 11:1 over any picture (AAA). **`--status`** with `--success`, `--warning`, `--danger` or `--info` reads the alert role tokens (and `--uva-color-status-success-*`): text 7:1 or more in light and dark. **`--new`** is the accent (brand blue, AAA). The plain badge is neutral grey (AAA).
- **Never colour alone:** a status badge always says its state in words; an icon is decorative (`aria-hidden="true"`). In forced colors every badge keeps an outline.
- **On cards and links:** a badge inside a link is part of its name, so keep it short and meaningful (“13 photos”), or put it outside the link. Inside `<uvalib-card>`, use `slot="badge"` and `slot="chip"` instead.

### Results toolbar

```html
<div class="uvalib-toolbar">
  <div class="uvalib-toolbar__field uvalib-toolbar__field--grow">
    <label for="filter">Filter shoots</label>
    <input class="uvalib-input" id="filter" type="search" />
  </div>
  <div class="uvalib-toolbar__field">
    <label for="category">Category</label>
    <select class="uvalib-input" id="category">
      <option value="">All categories</option>
      <option>Faculty &amp; Staff Portraits</option>
    </select>
  </div>
  <div class="uvalib-toolbar__group" role="group" aria-label="Decade">
    <button class="uvalib-button uvalib-button--small" type="button" aria-pressed="false">
      2000s
    </button>
    <button class="uvalib-button uvalib-button--small" type="button" aria-pressed="true">
      2010s
    </button>
  </div>
  <uvalib-results-count
    class="uvalib-toolbar__summary"
    shown="48"
    total="3694"
    noun="shoots"
    singular="shoot"
  ></uvalib-results-count>
</div>
```

- **`.uvalib-toolbar`** is a wrapping row with consistent gaps (0.75rem by 1rem), controls aligned on their bottom edge. **`__field`** stacks a label over its control (keep the visible `<label>`); **`__field--grow`** (or a `.uvalib-search-form` in the toolbar) takes the spare width. **`__group`** holds a chip group (`.uvalib-button` toggles with `aria-pressed`; give the group a name with `role="group"` and `aria-label`). **`__summary`** sits at the end in muted text (AAA). When the toolbar itself is 30em wide or narrower (480px at 16px; a phone, a 250px sidebar or a drawer) every item takes the full width, in source order: it is a CSS size container (`uvalib-toolbar`), so it follows its own width, not the viewport's. In a shrink-to-fit box (a flex item with no basis), give it a width.
- **`<uvalib-results-count>`** writes “Showing 48 of 3,694 shoots” (“Showing all 12 shoots”, “Showing 1 shoot”, “No shoots” for a total or a shown of 0) from `shown`, `total`, `noun` and `singular`, and keeps it in sync at once; a missing or blank `shown` / `total` is unset, not 0. A hidden polite live region announces it once the text has not changed for a second (`announce-delay`), then clears itself after five seconds. The first render is never announced, but when it had no count yet (results still loading), the first count that arrives is. A count that comes back after a different one (a new search with as many results) is announced again. Update `shown` / `total` from your script after each filter change, and leave them unset while loading rather than setting 0. `<bento-box>` and `<uvalib-pagefind-search>` announce their own counts, so do not add one beside them.

```js
const count = document.querySelector('uvalib-results-count');
filter.addEventListener('input', () => {
  const hits = shoots.filter((s) => s.title.toLowerCase().includes(filter.value.toLowerCase()));
  render(hits.slice(0, 48));
  count.shown = Math.min(hits.length, 48);
  count.total = hits.length;
});
```

### Results list

For long result sets (hundreds or thousands of rows that re-render as the visitor types), plain list rows from `base.css` are much lighter than a `<uvalib-card>` per result: no element per row, no script. See the [Results list](https://uvalib.github.io/reusable-web-library/#results-list) example.

```html
<h2>1999</h2>
<ul class="uvalib-result-list">
  <li class="uvalib-result">
    <p class="uvalib-result__meta">
      <span class="uvalib-badge uvalib-badge--category">March 12, 1999</span>
      <span>14 pages</span>
    </p>
    <h3 class="uvalib-result__title"><a href="/minutes/1999-03-12">Meeting of the Board</a></h3>
    <p class="uvalib-result__snippet">
      The board approved the <mark>library</mark> renovation budget …
    </p>
    <div class="uvalib-result__actions">
      <a
        class="uvalib-button uvalib-button--secondary uvalib-button--small"
        href="/minutes/1999-03-12.pdf"
      >
        PDF<span class="visually-hidden"> of Meeting of the Board, March 12, 1999</span>
      </a>
    </div>
  </li>
</ul>

<!-- Loading: a skeleton row the size of a row, hidden from assistive technology. -->
<ul class="uvalib-result-list" aria-hidden="true">
  <li class="uvalib-result">
    <span class="uvalib-result__meta"
      ><span class="uvalib-skeleton-text" style="inline-size: 8rem"></span
    ></span>
    <span class="uvalib-result__title"><span class="uvalib-skeleton-text"></span></span>
    <span class="uvalib-result__snippet"
      ><span class="uvalib-skeleton-text"></span><span class="uvalib-skeleton-text"></span
    ></span>
  </li>
</ul>
```

- **`.uvalib-result-list`** is a `<ul>` without bullets; **`.uvalib-result`** a row, separated by a rule. In a row: **`__meta`** (badges, a date, a format, in small muted text), **`__title`** (the row's one link: on a heading holding the `<a>`, or on the `<a>` itself; only as wide as its text), **`__snippet`** and **`__actions`** (secondary actions, at the end of the row when the list is wide and below the text, wrapping, when the list itself is 40em wide or narrower: the list is a CSS size container, `uvalib-result-list`, so a list in a sidebar or a drawer gets the narrow layout as a phone does; in a shrink-to-fit box, give it a width). Put meta, title and snippet first, actions last. Keep one link per row and give each action a unique name (a visually hidden “of <title>, <date>”).
- **Highlights:** a `<mark>` in `__snippet` is bold on `--uva-color-highlight` with `--uva-color-on-highlight` text (9.5:1 light, 7.6:1 dark), and the system Highlight colours in forced colors: never colour alone. A `<mark>` elsewhere is left to the page.
- **Groups:** for date-sorted results, a heading and one list per group (by year, say); none for relevance order.
- **Speed:** each row has `content-visibility: auto` with `contain-intrinsic-block-size: auto 7rem`, so rows off screen are not laid out or painted until they scroll near. They stay in the DOM and the accessibility tree; find-in-page, fragment links and focus still reach them (the browser renders a row as it is found). The rows keep 0.5rem of inline padding because that property also clips painting to the row, and the focus rings need the room. Render the rows as one HTML string or a `DocumentFragment` rather than one element at a time.
- **Phones:** actions wrap below the text, and nothing scrolls sideways at 320px. Room for a button fixed in a corner (back to top, say) is the page's to leave, for example with padding below the list.
- **`hidden`** on a row hides it, for filtering in place.

### Tag lists

```html
<uvalib-tag-list label="Subjects" track-label limit="8" href-template="/search?q={tag}">
  <span>Rotunda</span>
  <span>Lawn</span>
  <a href="/collections/snow">Snow</a>
</uvalib-tag-list>
<!-- Plain text tags: no href-template and no links. -->
<uvalib-tag-list label="AI tags" hide-label>
  <span>building</span>
  <span>columns</span>
</uvalib-tag-list>
```

A labelled list (`label`, shown above it or visually hidden with `hide-label`) that wraps. Each tag is a link (an `<a href>` child, or any tag when `href-template` has `{tag}`, URL-encoded) or plain text; links are outlined pills in the link colour, plain tags the filled chip; every tag and the toggle are at least 2rem (34px) tall and wide and 0.5rem apart (WCAG 2.5.8 with room to spare; not AAA's 44px, which would make the pills button-sized), and at least 24px with `no-style`. A child's `lang` and `dir` are kept, and so is inline markup inside it (`em`, `cite`, `abbr`, `bdi`, a `span lang`…), copied element by element, never parsed as HTML; a blank `href` counts as none. `limit` shows that many and a “Show all N” button (`aria-expanded`, `aria-controls`); the rest appear in place and focus stays on the button, which then reads “Show fewer”. Apps can set `items` (`[{ label, href?, lang?, dir? }]`) instead of children, and route with the cancelable `uvalib-tag-list-navigate` event. Analytics never sends a tag's text, as tags can come from a record, a person or a machine, and by default not the label either, which a template may fill from a record: the name is `list N`, the list's place among the page's tag lists, with the tag's position as the value. Add `track-label` when the label is fixed text you wrote (“Subjects”) to send it instead (see [Analytics](#analytics)).

### Empty and loading states

```html
<div class="uvalib-empty-state">
  <svg class="uvalib-empty-state__icon" aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
    <path d="M16 16l5 5" stroke="currentColor" stroke-width="2" />
  </svg>
  <h2>No photos match “snow”</h2>
  <p>Try another word, or clear the filters.</p>
  <button class="uvalib-button uvalib-button--secondary" type="button">Clear filters</button>
</div>

<div class="results" aria-busy="true">
  <div aria-hidden="true">
    <div class="uvalib-skeleton uvalib-skeleton--media"></div>
    <p><span class="uvalib-skeleton-text"></span><span class="uvalib-skeleton-text"></span></p>
  </div>
  <p class="visually-hidden" role="status">Loading results</p>
</div>
```

- **`.uvalib-empty-state`**: an optional decorative icon (`__icon`, `aria-hidden`), a heading at the page's next level, a sentence and one action, centred in a dashed box. When it replaces results, the results count already announces “No shoots”; it needs no live region of its own.
- **`.uvalib-skeleton`** is a box: give it a height, or `--media` for a 3:2 image. **`.uvalib-skeleton-text`** reserves exactly one line of text (the last of several is shorter). Make the placeholders the same size as what replaces them, so nothing shifts. They shimmer, except under `prefers-reduced-motion`, and are outlined in forced colors.
- **Hide them from assistive technology** (`aria-hidden="true"` on their container), mark the region `aria-busy="true"` while it loads, and say “Loading results” once in a polite status (or rely on the results count when the results arrive). Remove `aria-busy` and the placeholders together.

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
- **States.** On the first load a polite `role="status"` says "Loading hours…". Later loads keep the current rows on screen (the weekly table gets `aria-busy="true"`) until the new data lands. If the data cannot be loaded the status says "Hours are unavailable right now."; `<library-weekly-hours>` keeps its week header and adds a Retry button, and both elements retry quietly on their timers. Only user actions (the week buttons, Retry) are announced; midnight rollovers and background refreshes are silent. Read the read-only `state` (`loading`, `ready` or `error`) from script. On the first load `<library-weekly-hours>` draws its rows straight away (Building hours and each space, as soon as the library list is in) with invisible placeholder hours, so the table has its final height in the page's own font and nothing below it moves when the hours arrive. `--library-weekly-hours-min-height` can reserve space even before the library list is in (it applies while the element has a `loading` attribute), and `library-weekly-hours:not(:defined) { display: block; min-height: … }` before it upgrades. `<site-hours-section>` has `--site-hours-list-min-height` for the same purpose.
- **Harrison special case.** `<library-hours-setup>` adds `hide-building-hours` to `library-slug="harrison"`: Harrison's building calendar (LibCal 4114) is also the calendar of its own "Harrison/Small Building & Exhibitions" space, so the building row would repeat it.
- **Light DOM output** keeps the class names Drupal's CSS targets (`home-hours-block`, `hours-locations`, `weekly-hours-header-section`, `weekly-hours-body-section`, `date--mobile`, `lib-space-link`, …). `<library-weekly-hours>` keeps a few layout rules even with `no-style` (the host is `display: block`, the week header is a flex row, `[hidden]` hides), scoped to the tag in `@layer uvalib`. `headinglevelstart` is still read as an alias of `heading-level`. With neither set, the week heading's `aria-level` is one below the nearest heading before the element in the page (3 under each library's `<h2>` on /hours), or 2 when there is none, while its class stays `heading-h2`, the one the library website's CSS styles; set `heading-level` to override both. `<site-hours-section>` does not infer its level: on the home page it sits in a side column after another section's cards, where the heading before it in the page is not its parent, so it keeps its explicit default.
- **Testing a site's analytics and accessibility.** `@uvalib/web-components/testing` (npm only, for Playwright; not on the CDN) has the helpers library sites share: `stubMatomo(page, { siteId? })` (call it before `page.goto`: `…/matomo.js` gets an empty script and `…/matomo.php` a 204, so nothing reaches Matomo, and `siteId` becomes the `matomo-id` of each `<site-page>` without one), `matomoQueue(page)` (a copy of `window._paq`: the page views, site searches and events, in order), `waitForUpgrade(page, { selector?, timeout? })` (every `<site-page>`, or `selector`, defined and rendered), `strictAxe(page, { include?, exclude?, AxeBuilder? })` (axe after `waitForUpgrade`, with `LIGHTHOUSE_RULES` forced on and the WCAG 2.x A/AA and best-practice tags `STRICT_AXE_TAGS`; it needs the optional peer dependency `@axe-core/playwright`, loaded only when it runs) and `formatViolations(violations)` (one line each). See [accessibility testing](skills/uvalib-web-components/reference/accessibility-testing.md).

  ```js
  import { test, expect } from '@playwright/test';
  import { stubMatomo, matomoQueue, waitForUpgrade } from '@uvalib/web-components/testing';

  test('a search is one site search', async ({ page }) => {
    await stubMatomo(page, { siteId: 42 });
    await page.goto('./search/');
    await waitForUpgrade(page);
    await page.getByLabel('Search').fill('rotunda');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect
      .poll(async () => (await matomoQueue(page)).filter((c) => c[0] === 'trackSiteSearch'))
      .toEqual([['trackSiteSearch', 'rotunda', 'Keyword', 4]]);
  });

  test('Do Not Track sends nothing', async ({ page }) => {
    await page.addInitScript(() =>
      Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1' }),
    );
    await stubMatomo(page, { siteId: 42 });
    await page.goto('./');
    await waitForUpgrade(page);
    expect(await matomoQueue(page)).toEqual([]);
  });
  ```

- **Drupal switch.** Replace the old `…/web-components/cdn-vX.Y.Z/@uvalib/site-hours/<file>.js` script URLs with `https://unpkg.internal.lib.virginia.edu/web-components/v1/<tag>.js` (`site-hours-section.js` on the home page, `library-hours-setup.js` on /hours). The markup stays the same. `library-daily-hours` is not migrated.

## Library events

`<events-section>` shows upcoming library events from LibCal as a grid of cards, as on the library.virginia.edu home page. Each card is one link to the event's LibCal page: its title, a date column (month, day, weekday) and its time. Entry: `events-section.js` on the CDN, `@uvalib/web-components/events-section.js` on npm.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/events-section.js"
></script>
<h2>Library events</h2>
<events-section limit="8" no-shadow-dom no-style></events-section>
```

- **Attributes.** `limit` (default 8): at most this many events. `category`: only one LibCal category (its id, such as `38740` for the Robertson Media Center; several comma-separated). `query`: only events matching a search (LibCal's event search). `heading-level` (1 to 6): the level of each card's title heading. Leave it unset and the element works it out from the page: one below the nearest heading before it in document order (an `<h2>` above gives `<h3>` titles, an `<h3>` gives `<h4>`), skipping hidden headings and other components' own headings, or 3 when there is none. Set it only to override. `max-title-length`: still accepted from old pages (see below). `no-shadow-dom` and `no-style` as for every element.
- **Titles** are clamped to three lines with CSS, with the whole title still in the DOM, so screen readers read all of it. With `max-title-length` a longer title is cut with "…" for the eye only; assistive technology still gets the whole title. A title of exactly that many characters is not cut.
- **Dates and times** are always America/New_York, whatever the visitor's time zone: "11:00 AM - 12:00 PM EST" (EST or EDT for the event's own date), "All day" for all-day events, and "Nov 23, 7:00 PM - Nov 24, 1:00 AM EST" for an event over several days (whose date column shows its start). The date column is abbreviated on screen; screen readers get the full date ("Monday, November 16") from a `<time datetime>`, so each link reads title, date, then time. Events that have ended are left out before `limit` applies.
- **Data.** LibCal's API 1.0 at `https://cal.lib.virginia.edu/api/1.0/events` (or `event_search` with `query`), for the library's public events calendar, 30 days ahead (LibCal's maximum), with LibCal's public, read-only events widget key (already public in the old bundles). LibCal allows any origin, so the element works on any site. It fetches ten more events than `limit` (at most 100), so the list still fills once ended events are dropped. Elements asking for the same events share one request, and a page left open checks every minute, dropping events that have ended and fetching again, quietly and keeping the cards on screen, once its answer is an hour old; each attempt times out after 10 seconds and failed attempts are retried twice, a second apart. To repoint (tests, a proxy), set `window.uvalibEventsEndpoints = { events: '…', search: '…' }` before the define script runs, or assign `customElements.get('events-section').endpoints` (or `EventsSection.endpoints` from npm) afterwards; `limit`, `category` and `search` are added to those URLs.
- **States.** Read the read-only `state`: `loading`, `ready`, `empty` or `error`. A polite `role="status"` line says "Loading events…" while the first load runs, nothing once the events are in, "No upcoming events." when there are none, and "Events are unavailable right now." with a Retry button when they cannot be loaded; after an error the element also retries quietly every minute. While a Retry runs the button stays, disabled (`aria-disabled`, "Retrying…"), so keyboard focus is not lost; afterwards focus moves to the first event, back to Retry if it failed again, or to the status line if there are no events.
- **Layout shift.** From its first render the element draws `limit` invisible placeholder cards (the real DOM and classes, `aria-hidden`), so it has its final height in the page's own font and grid, and the events replace them in place. When fewer events than `limit` come back the grid collapses to the real ones once they arrive, which moves what follows: a page that usually has fewer (such as /rmc, which usually has 4 of its 8) avoids that with a smaller `limit`. With no events, and on an error, it keeps one card row, so a failure does not leave a long blank area on a phone. The status line sits over the top of the cards at a constant height, so it never moves anything either. To reserve the space before the script has run, add `events-section:not(:defined) { display: block; min-height: … }` (the [Events example](https://uvalib.github.io/reusable-web-library/#events) shows the values for the styled cards: 9rem cards 2rem apart, in one column, two from a 40rem-wide container and four from 75rem, matched with a container query on a wrapper); `--events-section-min-height` also applies while the element has its `loading` attribute.
- **Light DOM output** keeps the classes the Drupal theme styles: `div.event-container` > `div.event` > `a.event-url` > `.event-title`, `p.event-date` (`span.event--month`, `span.event--day`, `span.event--wkday`) and `p.event-time`. A few rules apply even with `no-style`, scoped to the tag in `@layer uvalib`: the host is a block, placeholders are invisible, titles are clamped and underlined on hover, and `[hidden]` hides. In light DOM (with or without `no-style`) it also installs one unlayered rule, `events-section .event-url .event-title { margin-block-start: 1rem; }`: the Drupal theme gives `h3` a 3rem top margin (and `h4` 1rem), which would make every card 2rem taller now that titles are `h3` by default, so the cards keep the old h4 geometry whatever `heading-level` is, with no theme change. The old element's repeated `homehoursMonth` / `homehoursDay` / `homehoursWeekDay` ids and its `see-more` slot are gone. Styled (without `no-style`) the cards follow the Drupal look with the dark-mode role tokens; the date column is `--uva-brand-orange-dark` (#b35900) behind white text (4.8:1), because white on the brand orange is only 3.1:1.
- **Drupal switch.** Replace the old `…/web-components/cdn-v2.0.8/@uvalib/bento-box/events-section.js` and `https://unpkg.com/@uvalib/cdn-builds@1.0.2/build/events-section.js` script URLs with `https://unpkg.internal.lib.virginia.edu/web-components/v1/events-section.js`. The markup stays the same on all five pages: the card headings follow each page's own headings (`<h3>` under the home page's `<h2>`, `<h4>` under /rmc's `<h3>`), so no `heading-level` is needed. The inline script that sets `max-title-length` is no longer needed (titles clamp to three lines) and can go. To reserve the cards' height before the script runs, set `events-section:not(:defined) { display: block; min-height: … }` from your own page's layout: in the Drupal-like test fixture (the theme's 17px root, heading margins, paragraph padding and event grid, but not its fonts), eight cards measure about 1593px in one column and 373px in four (two rows of about 170px), but the real theme's fonts and page width decide it. A recommended theme fix, outside this package: the theme's date column is white on `--uva-brand-orange` (#E57200), 3.1:1, which fails WCAG AA for its small text; #B35900, which styled mode uses, gives 4.8:1.

## Search results (bento-box)

`<bento-box>` is the library's search results page, library.virginia.edu/search: a search bar, then, for the query, a "You searched for" heading and a grid of result sections: the Virgo catalog, Virgo articles, the subject guides (LibGuides) and the library website. Entry: `bento-box.js` on the CDN, `@uvalib/web-components/bento-box.js` on npm; it registers the four sections too (`<catalog-section>`, `<articles-section>`, `<libguides-section>`, `<website-section>`), which also work on their own with `query` and `limit`.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/bento-box.js"
></script>
<h1>Search Library resources</h1>
<bento-box limit="3" no-shadow-dom no-style></bento-box>
```

- **Attributes.** `limit` (default 5): results per section, at most. `boxes` (default `catalog,articles,libguides,website`): the sections and their order, as a comma list or a JSON array (`boxes='["catalog","articles"]'`); unknown names are ignored. `search-describe` (default "This page searches Virgo, Virgo articles, subject guides, and the Library website."): the line under the search bar. `no-result-describe` (default "No results found."): what a section says when it finds nothing. `placeholder` (default "Search anything..."): the input's placeholder. `query`: the search when the URL has none. `heading-level` (1 to 6): the level of "You searched for"; the sections' headings are one below. Leave it unset: it is one below the nearest heading before the element, so `<h2>` then `<h3>` under the page's `<h1>`. `no-shadow-dom` and `no-style` as for every element.
- **The query** comes from the page URL, `?q=` (preferred) or the old `?query=`, which win over the `query` attribute. Searching pushes `?q=…` (encoded, dropping an old `?query=`) to the history, so the results can be bookmarked and shared, and Back and Forward bring each query back. With no query only the search bar and its description show, and nothing is fetched. Every query is encoded wherever it goes (requests, "See all" forms, the URL), so `&`, `#` and `+` are searched as typed.
- **Sources.** Virgo's guest token (`POST https://search.lib.virginia.edu/authorize`, fetched once per page and shared, fetched again after a 401); the catalog (`pool-solr-ws-uva-library.internal.lib.virginia.edu`) and articles (`pool-eds-ws.internal.lib.virginia.edu`) pools; the LibGuides search proxy (`qmo3jwybkg.execute-api.us-east-1.amazonaws.com/production/library/libguides-proxy`); and Drupal's search index, `/jsonapi/index/default_index` on the page's own origin. The first three allow any origin, so the catalog, articles and guides work on any site. The Drupal index sends no CORS headers, so the website section only works on library.virginia.edu itself (elsewhere, leave it out with `boxes="catalog,articles,libguides"`, or point it at a same-origin copy). To repoint any of them (tests, a proxy), set `window.uvalibBentoEndpoints = { authorize, catalog, articles, guides, website }` (any of the keys) before the define script runs, or assign `customElements.get('bento-box').endpoints` (`BentoBox.endpoints` from npm) afterwards. Each request times out after 10 seconds; server errors and timeouts are tried once more. Identical requests share one fetch; a section's request is aborted when its query changes or it leaves the page, and a slower answer for an older query never replaces a newer one.
- **What each section shows.** Catalog: one entry per work (a work with several editions shows once, with "N editions"), its authors (five, then "and N more"), published date (a bare year as is, a full date as "Jul 28, 2026", never shifted by a time zone) and formats. Articles: the same, with the publication type; records Virgo hides from guests keep their link under the title "Article details available after signing in to Virgo". Subject guides: the page and its guide, author and subjects, and the matching text. Website: the page title and Drupal's excerpt. Matched words are in `<mark>`. Everything from these services is read as text and http(s) links and rendered with Lit; their HTML is never inserted, so markup in a title shows as text. "See all" goes to each source's own search for the query; its button names the section for screen readers after the visible text, so voice control can use what it sees ("See all 138,420 results in Virgo catalog"). Braces in a query become spaces in Virgo's `keyword: {…}` clause, so they cannot end it early.
- **States.** Each section has a read-only `state`: `loading`, `ready`, `empty` or `error`, and fires `bento-state` (bubbling) when it changes. While loading its list has `aria-busy="true"` and no message; "No results found." shows only once the answer is in. An error says, for example, "Virgo catalog results are unavailable right now." with a Retry button that stays, disabled, while it runs, so keyboard focus is not lost; afterwards focus moves to the first result, back to Retry, or to the message. One polite `role="status"` line in the box says "Results updated." (or "Results updated. Some results are unavailable.") once every section has settled: one announcement per search rather than one per section, so four sections landing a few hundred milliseconds apart do not talk over each other.
- **Layout shift.** While a section loads it draws `limit` invisible placeholder entries (the real DOM and classes, `aria-hidden`), and every entry has a fixed shape: titles clamp to two lines (the whole title stays in the DOM), and authors, dates, formats and the guide byline stay on one line each, with an empty, hidden line when a record has none. So the results replace the placeholders in place. With fewer results than `limit` the list collapses once they arrive; empty and failed sections keep one entry's height under their message. To reserve the space before the script has run, add `bento-box:not(:defined) { display: block; min-height: … }` from your own layout: the [Search results example](https://uvalib.github.io/reusable-web-library/#search-results) shows the values for the styled box (one column below a 48rem container, two from there, matched with a container query on a wrapper). A query long enough to wrap the "You searched for" heading still moves what follows by a line.
- **Light DOM output** keeps the classes the Drupal theme styles under `.uvalib-bento-search`: `.bento-search-bar` (on a `<bento-search>` element, as before) with its `form`, `input`, `button.uvalib-button-home-search` and `p`; `.bs-header` (`h2`, `.bs-search-term`, `p`); `.bs-results-container` with each section as `.bs-results--block`; `.bs-results--header` (`h3` and the "See all" form and `.uvalib-button`), `.bs-results--body`, `ol.bs-results--list`, `.bs-results--list--entry`, `.bs-results--title`, `ul.ul-0`, `ul.ul-1`, `.bs-results--author`, `.bs-results--date`, `.bs-results--format`, `.bs-results--qty`, `.bs-results--teaser`, and the website's `.bento-section-title` and `.bento-section-desc`. Fixes to the markup: each `ul.ul-1` now sits in an `li` of its `ul.ul-0` (the theme's `ul.ul-0 ul.ul-1` still matches), the input has a real label and the submit button a text name (both visually hidden), the format line has no `aria-label` repeating its text, and the repeated `id="no-results"` is gone. A few rules apply even with `no-style`, scoped to the tags in `@layer uvalib`: the hosts are blocks, placeholders are invisible, the clamps and one-line rules above, the message shares the list's grid cell, and `[hidden]` hides. Styled (without `no-style`) the box follows the Drupal look with the dark-mode role tokens.
- **Drupal switch.** Replace the old `…/web-components/cdn-v2.2.38/@uvalib/bento-box/bento-box.js` script URL with `https://unpkg.internal.lib.virginia.edu/web-components/v1/bento-box.js`. The markup stays: `<bento-box no-style no-shadow-dom limit="3">`. The `uvalib-bento-search` body class is Drupal's and stays as it is; the headings follow the page's `<h1>` (`<h2>`, then `<h3>` sections), so no `heading-level` is needed. Links that used `?query=` keep working; new searches use `?q=`.

## Static-site search (Pagefind)

Static sites that search with [Pagefind](https://pagefind.app) (such as Electronic Text Collections) keep Pagefind's own index and script, and take the library look and the accessibility fixes from two files: `pagefind.css`, a theme for Pagefind's default UI (1.x), and `<uvalib-pagefind-search>`, a small element (about 4 KB gzipped, no Lit) that starts that UI with the library's defaults.

```html
<link rel="stylesheet" href="https://unpkg.internal.lib.virginia.edu/web-components/v1/base.css" />
<link
  rel="stylesheet"
  href="https://unpkg.internal.lib.virginia.edu/web-components/v1/pagefind.css"
/>
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-pagefind-search.js"
></script>

<uvalib-pagefind-search
  bundle-path="/pagefind/s0/"
  merge-index='[{"bundlePath": "/pagefind/s1/"}, {"bundlePath": "/pagefind/s2/"}]'
  placeholder="Search all texts"
  show-sub-results
  filter-params="collection author"
></uvalib-pagefind-search>
```

- **`pagefind.css` replaces Pagefind's `pagefind-ui.css`**: link one or the other, never both (the stock rules carry Svelte hash classes that out-rank the theme's). It maps Pagefind's `--pagefind-ui-*` custom properties to the library tokens (set them yourself for small changes) and restyles its classes: the field and the Clear button like `.uvalib-input` and a small outline `.uvalib-button`, the filters like `<uvalib-filter>` (a fieldset of native checkbox rows, "value (count)", long facets scroll in their own box), result titles in the link colour, excerpts with library.virginia.edu's `<mark>` colour, metadata tags, and "Load more results" as a `.uvalib-button`. It carries the dark-mode role tokens it reads (like `base.css`) and keeps every control visible in forced colors.
- **What it fixes in the stock UI:** text at 16px and up (the stock scale makes it 12.8px), a readable placeholder (stock: 20% opacity), the library focus ring on every control, a hidden Clear button that can no longer take focus (stock: invisible but focusable), native checkboxes (the stock ones vanish in forced colors), 44px targets for the filter headings, rows and buttons, no fixed heights that clip zoomed or spaced text, no arrow glyph read out before each sub-result, and a 320px reflow. Text is 7:1 or more (WCAG AAA) in light and dark, except the Load more button's white on blue-alt in light mode (4.7:1, as on every `.uvalib-button`).
- **What needs script, done by `<uvalib-pagefind-search>`:** a visible `<label>` for the field (the stock field is named only by its `title` and has no id to point a label at), a polite status region that announces "7 results for virginia" once results settle (the stock message is not a live region), focus kept in the field after Clear and Escape (the stock UI blurs it) and moved to the first new result after "Load more results", and the loading placeholders' dots hidden from screen readers. It also reads `?q=` when it starts (and again on Back and Forward) and writes the settled query back with `history.replaceState` (`query-param`, default `q`; empty turns it off), and reports to `<site-analytics>`: the settled search (`trackSearch`, category `Pagefind`, with the result count, once per query and filter set) and `['uvalib-pagefind-search', 'filter-change', '<filter>: <value>', 1 | 0]`.
- **Filters in the URL: `filter-params`.** List Pagefind filter names, space-separated (`filter-params="collection author"`), and each becomes a URL parameter of the same name, so a collection page can link to `/search/?collection=Manuscripts` ("Search this collection") or `/search/?q=virginia&collection=Manuscripts`. A repeated parameter (`?collection=A&collection=B`) checks several values; as with boxes checked by hand, Pagefind then wants pages with every one. At start (and on Back and Forward) the element loads the index, waits for Pagefind's filter list, checks the URL's values and applies them with the query, so there is one search; those filter groups start open (added to any `openFilters` in `options`), so the visitor sees why the results are narrowed. Values the index does not have are dropped without an error (matched without regard to case, then written back in the index's own case), so a stale link searches everything rather than showing no results; if the filter list never appears (an index with no filters), it searches without them after 10 s. Checking or unchecking a named filter writes it back with `history.replaceState`, keeping every other parameter; unchecking the last value removes the parameter. Filters not named stay out of the URL. A filter set from the URL is not a `filter-change` event; the settled search is still reported once, with the filters in its key. Without a query, the filters wait for the first search, as in Pagefind. Do not add your own `triggerFilters` script for this.
- **A search from the URL holds the page still: `searching`.** Pagefind's results arrive after the page has painted, so a page opened with `?q=` used to push everything below the search (the footer) down as they loaded: Lighthouse measured CLS 0.274 on Electronic Text Collections. Mark the element `searching` when the URL has a query, in the page's HTML before any script runs, with one line after the element (or server-side):

  ```html
  <uvalib-pagefind-search bundle-path="/pagefind/s0/" show-sub-results></uvalib-pagefind-search>
  <script>
    if (new URLSearchParams(location.search).get('q'))
      document.querySelector('uvalib-pagefind-search').setAttribute('searching', '');
  </script>
  ```

  From first paint, `pagefind.css` then holds a window's height for the results and draws one screen of placeholder results (bars like base.css's `.uvalib-skeleton-text`, sized like Pagefind's result rows, with two sections each under `show-sub-results`); once the script runs, the element puts the same placeholders in the page (`page-size` rows, `aria-hidden`, with base.css's shimmer, which stops under reduced motion) and hides Pagefind's results area until the results, or "no results", have loaded. Then the element still reaches the bottom of the window until the visitor uses the search (types, clears or clicks in it), so a short list or "no results" does not pull the footer up into view; after that it is as tall as its content. The polite status region announces the count as before, and the analytics are unchanged. On Back and Forward to a new query the element does the same itself. Without `searching` it does not hold at start: its script runs after first paint, when holding would itself push the footer down. With the snippet, Electronic Text Collections' search measured CLS 0.000 (full page, 1 result and no results, phone and desktop; 0.13–0.44 without it), so a site's own `min-height` hold on the element can go. Add `no-skeleton` to turn all of this off. The snippet uses `q`: use your `query-param`.

- **Still open** (in Pagefind's markup, not fixable from outside without rewriting it): filter checkbox ids are built from the filter and value (`author-Jefferson, Thomas`), so they can contain spaces and repeat if a page has two search UIs.
- The element loads `<bundle-path>pagefind-ui.js` unless `window.PagefindUI` already exists; Pagefind itself stays the site's. `el.ready` resolves with the `PagefindUI` instance, for `triggerFilters` (filters from your own script; for filters from the URL use `filter-params`). Attributes are read when it connects; removing the element destroys the Pagefind UI, and inserting it again starts a new one (`bundle-path` and each `merge-index` path get their trailing `/` if missing, and `options` cannot move the UI out of the element). Without the element, the theme still styles `new PagefindUI({ element })`, but then the field needs a label and the results a live region from your own script. See the [Pagefind example](https://uvalib.github.io/reusable-web-library/#pagefind-search) in the playground and the reference below.

## Analytics

`<site-analytics>` and `<uvalib-analytics>` are one element under two names (`site-analytics.js`, `uvalib-analytics.js`; npm `@uvalib/web-components/site-analytics.js`, `…/uvalib-analytics.js`). It has no visual output: it loads Matomo (`https://analytics.lib.virginia.edu/matomo.js`), records the page view and forwards the events below to Matomo.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-analytics.js"
></script>
<uvalib-analytics matomoid="10"></uvalib-analytics>
```

- **Attributes.** `matomoid`: the Matomo site id; without it, the site whose URL the page is under (the library's site registry), and with none, the element does nothing. `matomourl` (default `https://analytics.lib.virginia.edu/`, ending in `/`): the Matomo server. `spa`: no page view on load; a single-page app records each view with a pageview event. `spa="auto"`: the element records them itself, one on load and one per same-document route change (see below). `variables`: custom dimensions as a JSON object, `variables='{"1":"staff"}'`, set before the page view. `downloads="event"`: count downloads without their URLs (see below).
- **Events.** Both tags listen on `document` for both families, `uvalib-analytics-*` (the original names) and `site-analytics-*`. Fire them bubbling and composed from anywhere, or with `trackEvent(el, parts)` and `trackSearch(el, query, category?, count?)` from `@uvalib/web-components/base.js` (which follow the opt-outs below; `analyticsAllowed(el)` tells you whether `el` may report), or the mixins (`UvalibAnalyticsMixin`: `_analyticsEvent`, `_analyticsSearch`, firing `uvalib-analytics-*`; `SiteAnalyticsMixin`: `analyticsEvent`, `analyticsSearch`, firing `site-analytics-*`).
  - `…-event`: `detail: { event: [category, action, name?, value?] }` (`track` is accepted as the old name), a Matomo `trackEvent`.
  - `…-search`: `detail: { searchQuery, searchCategory?, resultCount? }`, a Matomo site search; an unknown count (null or missing) is sent as Matomo's "unknown".
  - `…-pageview`: `detail: { customTitle?, referrer? }`, a page view; the title defaults to the document's, a referrer without `http` is a path on this origin, and with none the document's referrer is used.
  - `…-content`: `detail: { name, piece, target?, interaction? }`, a Matomo content impression (`trackContentImpression`), or with `interaction` a `trackContentInteraction`; `trackContent(el, { name, piece, target?, interaction? })` from `@uvalib/web-components/base.js` fires it.
- **Site search in your own search UI: `createSearchTracker`.** `<bento-box>` and `<uvalib-pagefind-search>` report their searches; a page with its own search box uses `createSearchTracker({ element?, debounce? })` from `analytics.js` (CDN `https://unpkg.internal.lib.virginia.edu/web-components/v1/analytics.js`, npm `@uvalib/web-components/analytics.js` or `base.js`) rather than calling `trackSearch` itself. It sends one Matomo site search per search the visitor settles on, with the result count (0 included) and a category, through `trackSearch`, so the opt-outs below apply; the query goes only into Matomo's site-search keyword, never into an event. Each method takes `{ query, count?, category?, key? }`:
  - `typed(search)`: search-as-you-type; sent once the results have stayed the same for `debounce` ms (default 1000), and a later call replaces it.
  - `settled(search)`: a submitted or server-backed search, when its results arrive; sent at once.
  - `restored(search)`: the page opened from a link with a query, or Back/Forward; nothing is sent, and the same search again (Enter) is not counted.
  - `cancel()`: the field was cleared or the search failed; a typed search still waiting is dropped. Send nothing for errors.
  - `reset()`: forget the last search sent, so the same one counts again.

  A search is never sent twice in a row for the same `key` (default: the query and the category); pass the query and the active filters as `key` when filters make a new search. `element` (default `document`) is where it reports from, so a `no-analytics` ancestor silences it.

  ```html
  <script type="module">
    import { createSearchTracker } from 'https://unpkg.internal.lib.virginia.edu/web-components/v1/analytics.js';
    const form = document.querySelector('#search');
    const tracker = createSearchTracker({ element: form });
    const fromUrl = new URLSearchParams(location.search).get('q');
    if (fromUrl) tracker.restored({ query: fromUrl, category: 'Keyword', count: show(fromUrl) });
    form.q.addEventListener('input', () => {
      const query = form.q.value;
      if (!query.trim()) return tracker.cancel();
      tracker.typed({ query, category: 'Keyword', count: show(query) });
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const results = await search(form.q.value); // your own search
        tracker.settled({ query: form.q.value, category: 'Keyword', count: results.length });
      } catch {
        tracker.cancel(); // never on an error
      }
    });
  </script>
  ```

- **Nothing is lost or counted twice.** Every call goes through Matomo's `_paq` queue, which matomo.js replays when it loads, so events fired before it arrives are kept (and nothing waits for it if it is blocked). However many analytics elements a page has, from any copy of this library (an npm build next to a CDN script, two CDN versions), matomo.js is loaded and the page view recorded once and only one element forwards each event; if it is removed, the next one takes over. A Matomo snippet already on the page (a `matomo.js` script, or a `_paq` that sets a site id) is used as it is: nothing is loaded or recorded again, and the element only forwards the events.
- **Matomo's own link tracking** (`enableLinkTracking`, on unless `spa` or `downloads="event"`, as in the old element) still records clicks on links to other sites and downloads with their URLs, result links included. Besides Matomo's own download types (pdf, doc*, xls*, ppt*, …), links to the library's file types count as downloads: epub, mobi, csv, tsv, json, xml, zip, tar, gz, mp3, mp4, m4a, tif, tiff, jp2, mrc, ris, bib and txt (`addDownloadExtensions`). The components' own events never carry titles or URLs.
- **`downloads="event"`: downloads without their URLs.** Opt in when file URLs carry ids you do not want in analytics (`<site-analytics downloads="event">`, `<uvalib-analytics downloads="event">`, or `<site-page matomo-id="N" matomo-downloads="event">`). Matomo's link tracking is then left off (no `enableLinkTracking`, no `addDownloadExtensions`), and the element sends instead:
  - for a left or middle click on a download, the event `['download', '<extension>']`: no URL and no file name. A download is a link with the `download` attribute (the extension of its file name, else of its URL, else `file`) or a link to a file of the types above (Matomo's and the library's), in light or shadow DOM;
  - for a click on a light DOM link to another site, Matomo's outlink (`trackLink`, with the URL), as its link tracking would have; with `spa` there are none, as before.

  Links with Matomo's `matomo_ignore` class, and links under `no-analytics`, send nothing. A `data-uvalib-track` on the link still sends its own event too, so a fixed label can go with it (`data-uvalib-track="bov,pdf-download,result"`). Default: unchanged. It has no effect when a Matomo snippet is already on the page.

- **`spa="auto"`** records a page view on load and on every same-document route change (`history.replaceState`, such as a search page syncing its filters to the URL, and reloads are never page views): a hash change, Back and Forward (`popstate`), the Navigation API's `currententrychange` where the browser has it, and `history.pushState` (wrapped once per page, shared by every copy of this library, and left in place). The view is recorded on the next frame, so the title the app sets right after navigating is the one counted, with the URL as the custom URL and the previous view's URL as the referrer. A change to the URL already counted (`replaceState`, a second `pushState` to the same URL, the several events one Back fires) is not counted again. Opening `<uvalib-lightbox url-param>` pushes one history entry, so this counts that open as a page view; stepping through the images replaces the entry and is not another view. Bare `spa` keeps its meaning: no automatic views.
- **`data-uvalib-track` for host content.** A click on an element with `data-uvalib-track="category,action[,name[,value]]"`, or on anything inside it, sends that Matomo event (the nearest tagged element wins; `value` must be a number). It works in light and shadow DOM (one capture-phase listener on `document`, reading the click's composed path) and needs an analytics element on the page. Use your site's name or the widget as the category and a fixed verb as the action, and never put titles, URLs or personal data in it: `<a href="/spaces" data-uvalib-track="home-page,banner-click,Study spaces">`.
- **`<site-page matomo-id="N">`** (and optional `matomo-url` and `matomo-downloads`) adds one `<site-analytics>` for that site and loads its code only then. Off by default. While that code loads, what the components report is kept and handed over, so an early bento search is not lost. If the page already has a `<site-analytics>` or `<uvalib-analytics>` (including the old v0.0.12 one), site-page adds none and that element does the recording.
- **What the library's components send.** They only fire `uvalib-analytics-*` events, so nothing happens without an analytics element (the old v0.0.12 element records them too). Every event is `[category, action, name?, value?]`: the category is the component's tag, the action a fixed verb, the name a short label from the library's own chrome or data (never a URL, never typed text), the value a number. Each one follows a visitor's action or a real failure: nothing is sent on render, re-render, the initial state or a restored one (a filter value set by the app, a remembered colour scheme). Errors are sent once per element and kind of failure.

  | Component                                    | Action                                                                                                                            | Name                                                                                                                                      | Value                             |
  | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
  | `site-header`                                | `link-click` (a utility or site link)                                                                                             | the link's label                                                                                                                          |                                   |
  | `site-header`                                | `menu-open` (the phone Menu popover)                                                                                              |                                                                                                                                           |                                   |
  | `site-header`                                | `skip-link`, `logo-click`                                                                                                         |                                                                                                                                           |                                   |
  | `site-header`                                | `color-scheme`                                                                                                                    | `light`, `dark` or `system`                                                                                                               |                                   |
  | `site-main-nav`                              | `menu-open` (a group opens, not closes)                                                                                           | the group's label                                                                                                                         |                                   |
  | `site-main-nav`                              | `link-click`                                                                                                                      | `Group > Link` (a top-level link: its label)                                                                                              |                                   |
  | `site-footer`                                | `link-click` (not the pre-footer's)                                                                                               | `Column: Link`, e.g. `About: Staff directory`; `Contact us: Phone`, `Contact us: Email`; `Social: Facebook`, `Social: Instagram`          |                                   |
  | `uvalib-breadcrumbs`                         | `link-click`                                                                                                                      | `level N` (never the label)                                                                                                               | N, from 1                         |
  | `uvalib-card`                                | `card-click`                                                                                                                      | `single`, or the card's place in its grid (`1`, `2`, …); never the title or URL                                                           | that place, from 1, in a grid     |
  | `uvalib-pager`                               | `page-change`                                                                                                                     | `next`, `previous` or `number` (never the label or URL)                                                                                   | the page, for `number` only       |
  | `uvalib-pager`                               | `load-more`                                                                                                                       | (empty)                                                                                                                                   | the next page                     |
  | `uvalib-tabs`                                | `change`                                                                                                                          | the tab's label (capped at 100 characters; not a URL)                                                                                     |                                   |
  | `uvalib-contents`                            | `link-click`                                                                                                                      | `level N` (never the label or URL)                                                                                                        | N, from 1 (the top level)         |
  | `uvalib-contents`                            | `toggle` (the narrow-screen disclosure)                                                                                           | `open` or `close`                                                                                                                         |                                   |
  | `uvalib-metadata`                            | `copy-citation` (downloads are left to Matomo's, or to `downloads="event"`)                                                       |                                                                                                                                           |                                   |
  | `uvalib-metadata`                            | `show-all`, `show-fewer` (a long list's toggle)                                                                                   | `row N` (the row's place in the list; never its label or values)                                                                          |                                   |
  | `uvalib-citation`                            | `format` (once the visitor settles on one), `copy`, `download` (the RIS link)                                                     | the format's name (`MLA`, `APA`…), or `ris` for `download`; never the citation                                                            |                                   |
  | `uvalib-lightbox`                            | `open`, `next`, `previous`, `full-size`                                                                                           | `image N` (never the URL or the caption)                                                                                                  | N, from 1                         |
  | `uvalib-lightbox` (versions)                 | `compare`                                                                                                                         | `switch`, `wipe` or `fade` (never a version's label or URL)                                                                               | the version's place, from 1       |
  | `uvalib-image-regions`                       | `select` (an outline clicked; nothing on hover or focus)                                                                          | the list's `label` (never a region's label)                                                                                               | the region's number, from 1       |
  | `uvalib-tag-list`                            | `tag-click`                                                                                                                       | `list N` (the list's place on the page), or with `track-label` the list's own fixed `label`; never the tag's text or URL                  | the tag's place, from 1           |
  | `uvalib-tag-list`                            | `show-all`, `show-fewer`                                                                                                          | `list N`, or with `track-label` the `label`                                                                                               |                                   |
  | `site-alerts`                                | a content impression, once per alert per page view: `trackContentImpression('Library alert', '<severity>: <title>')`              |                                                                                                                                           |                                   |
  | `site-alerts`                                | `dismiss`, `link-click` (a link in an alert's text)                                                                               | `<severity>: <title>`                                                                                                                     |                                   |
  | `site-alerts`                                | `error` (the alerts script failed to load)                                                                                        | `alerts-script`                                                                                                                           |                                   |
  | `events-section`                             | `event-click`                                                                                                                     | the `category` id, or `all`                                                                                                               | the event's position, from 1      |
  | `events-section`                             | `error`                                                                                                                           | `events-load`                                                                                                                             |                                   |
  | `site-hours-section`                         | `link-click`                                                                                                                      | `See all hours`                                                                                                                           |                                   |
  | `site-hours-section`, `library-weekly-hours` | `error`                                                                                                                           | `hours-load`                                                                                                                              |                                   |
  | `library-weekly-hours`                       | `week-change`                                                                                                                     | `next` or `previous`                                                                                                                      |                                   |
  | `uvalib-chip-group`                          | `change` (single: 1 s after the last change, and only if it differs from where it started; multi: each toggle)                    | `<group label>: <chip label>`                                                                                                             | the chip's count, when it has one |
  | `uvalib-chip-group`                          | `select` (links mode)                                                                                                             | the group's label (never the chip or its URL)                                                                                             |                                   |
  | `uvalib-combobox`                            | `select` (a suggestion chosen)                                                                                                    | the field's label (never the typed text or the suggestion)                                                                                | the suggestion's position, from 1 |
  | `uvalib-combobox`                            | `clear` (the clear button, or Escape on a closed list)                                                                            | the field's label                                                                                                                         |                                   |
  | `uvalib-combobox`                            | `error` (`src` failed to load)                                                                                                    | `load`                                                                                                                                    |                                   |
  | `uvalib-list-filter`                         | `filter` (once the typing settles on a new query, 1 s after the last keystroke)                                                   | empty (never the typed text)                                                                                                              | how many items match              |
  | `uvalib-list-filter`                         | `clear` (the clear button, Escape, or the field emptied by typing)                                                                |                                                                                                                                           |                                   |
  | `uvalib-filter-drawer`                       | `open`, `close` (by the visitor: the button, Close, Escape or the backdrop; not a resize or a script)                             | the drawer's `label`                                                                                                                      |                                   |
  | `uvalib-back-to-top`                         | `click`                                                                                                                           |                                                                                                                                           |                                   |
  | `uvalib-dialog`                              | `open` (a visitor's button), `close` (by the visitor: Close, a close button, Escape, the backdrop or a dialog form; not a script) | the dialog's `label` (never its content)                                                                                                  |
  | `uvalib-map`                                 | `select` (a marker chosen: click, Enter or Space)                                                                                 | the map's label (never the place's name, coordinates or URL)                                                                              | the place's position, from 1      |
  | `uvalib-map`                                 | `zoom` (1 s after the last zoom-button press)                                                                                     | the map's label                                                                                                                           | the zoom level                    |
  | `uvalib-map`                                 | `expand` (a group of places chosen: it zooms in or opens its ring)                                                                | the map's label                                                                                                                           | the number of places in the group |
  | `uvalib-filter`                              | `facet-change`                                                                                                                    | `<filter title>: <value>` (the facet value as the search service returns it, such as a format, library or subject; cut at 100 characters) | 1 checked, 0 unchecked            |
  | `uvalib-filter`                              | `scope-change`                                                                                                                    | the scope's label                                                                                                                         | 1 pressed, 0 not                  |
  | `uvalib-filter`                              | `see-more`, `see-less`                                                                                                            | the filter's title                                                                                                                        |                                   |
  | `uvalib-date-range`                          | `range-change` (1 s after the last change, and only if the years differ)                                                          | `<from year>–<to year>`                                                                                                                   |                                   |
  | `uvalib-date-histogram`                      | `select` (not when the selection is cleared, set in script, or restored from a date range)                                        | `<from>–<to>` when both ends are ISO dates, otherwise `other`                                                                             |                                   |
  | `bento-box`                                  | `result-click`                                                                                                                    | the section (`Virgo catalog`, `Virgo articles`, `Subject guides`, `Library website`)                                                      | the result's position, from 1     |
  | `bento-box`                                  | `see-all-click`, `retry`                                                                                                          | the section                                                                                                                               |                                   |
  | `bento-box`                                  | `error`                                                                                                                           | `section-load: <section>`                                                                                                                 |                                   |

  `<bento-box>` also sends a Matomo site search per section once its results are in (not on an error, not again on a re-render): the query, the section as category, and the section's total (0 when nothing was found). A new query, also by Back or Forward, is a new search. The `<library-weekly-hours>` elements `<library-hours-setup>` creates report as `library-weekly-hours`. Alert severities are `Critical`, `Warning`, `Information`, `Header` or `Regional warning` / `Regional information`. Names are capped at 100 characters. `<uvalib-photo-grid>` and `<uvalib-results-count>` report nothing.

- **Privacy.** The components never send URLs, paths, record titles, ids, email addresses or phone numbers, or anything a visitor typed: only the fixed names above, positions and counts, labels of the library's own links, and the titles of library alerts (written by the library for everyone). The one exception is search: bento-box's queries are what visitors typed, and are sent as Matomo site searches.
- **Opting out.** Nothing is sent from a component, a `data-uvalib-track` element or an event fired by hand when:
  - the page has `<html data-uvalib-analytics="off">` (then, as with Do Not Track, `<site-analytics>` loads no matomo.js and records no page view either);
  - the element or an ancestor, across shadow roots, has the `no-analytics` attribute (`<div no-analytics>` around a private widget, `<bento-box no-analytics>`);
  - the browser sends Do Not Track (`navigator.doNotTrack === '1'`) or Global Privacy Control (`navigator.globalPrivacyControl === true`). Then the analytics element also loads no matomo.js and records no page view, automatic or not.
- **Drupal switch.** Replace the script URL `https://unpkg.internal.lib.virginia.edu/v0.0.12/uvalib-analytics.js` with `https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-analytics.js`. The markup stays: `<uvalib-analytics matomoid="10">`.

## Components

Generated from `dist/custom-elements.json` by `scripts/gen-reference.mjs`; do not edit between the markers by hand.

<!-- components:start -->
<!-- prettier-ignore-start -->

### `<articles-section>`

Virgo's first article results for `query`. Articles Virgo hides from guests keep their link, under a neutral title ("Article details available after signing in to Virgo").

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text. Empty: nothing is fetched and the section is `empty`. |
| `limit` | `number` | `5` | How many results to show (at most). |
| `no-result-describe` | `string` | `'No results found.'` | The message shown when nothing is found. |
| `heading-level` | `number \| undefined` |  | The level of the section's heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page, or 3 when there is none. `<bento-box>` sets it one below its own heading. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `bento-state` | Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled. |
| `uvalib-analytics-search` | For `<site-analytics>`: once per settled search (results or none, not an error): the query, the section's `analyticsName` as category and its total when known. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; `['bento-box', 'retry', <section>]` for its Retry button; `['bento-box', 'error', 'section-load: <section>']` once when its results cannot be loaded; never titles or URLs. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-link` |  | Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`). |
| `--uva-color-border` |  | Dark-mode role token: the block's border and entry rules (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: background (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the header band (else #dadada). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<bento-box>`

The library's search results page (library.virginia.edu/search): a search bar and, for the query, a grid of result sections from Virgo's catalog and articles, the subject guides and the library website. The query comes from the page URL (`?q=`, or the old `?query=`), else the `query` attribute; searching pushes `?q=` to the history, and Back and Forward restore the query. With no query only the search bar shows and nothing is fetched. Light DOM output keeps the classes the Drupal theme styles under `.uvalib-bento-search`. Registers `catalog-section`, `articles-section`, `libguides-section` and `website-section`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text when the page URL has none (`?q=` or `?query=` win). |
| `limit` | `number` | `5` | How many results each section shows (at most). |
| `search-describe` | `string` | `'This page searches Virgo, Virgo articles, subject guides, and the Library website.'` | The line under the search bar. |
| `no-result-describe` | `string` | `'No results found.'` | What a section says when it finds nothing. |
| `placeholder` | `string` | `'Search anything...'` | The search input's placeholder. |
| `boxes` | `BentoBoxName[]` | `['catalog', 'articles', 'libguides', 'website']` | The sections, in order: `catalog`, `articles`, `libguides`, `website`, as a comma list (`boxes="catalog,articles"`) or a JSON array. Default: all four. |
| `heading-level` | `number \| undefined` |  | The level of the "You searched for" heading, 1 to 6; the sections' headings are one below. Unset (the default), it is one below the nearest heading before the element in the page (the page's `<h1>` gives `<h2>`, then `<h3>` sections), or 2 when there is none. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-control-border` |  | Dark-mode role token: the search input's border (else #808080). |
| `--uva-color-input-text` |  | Dark-mode role token: the search input's text (else #1f2937). |
| `--uva-color-surface-raised` |  | Dark-mode role token: the search input's background (else #fff). |
| `--uva-color-accent-bg` |  | Dark-mode role token: the search button (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: the search button's icon (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<catalog-section>`

The Virgo catalog's first results for `query` (books, journals, archives, maps, music, theses, videos…). A work with several editions shows once, noting how many.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text. Empty: nothing is fetched and the section is `empty`. |
| `limit` | `number` | `5` | How many results to show (at most). |
| `no-result-describe` | `string` | `'No results found.'` | The message shown when nothing is found. |
| `heading-level` | `number \| undefined` |  | The level of the section's heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page, or 3 when there is none. `<bento-box>` sets it one below its own heading. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `bento-state` | Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled. |
| `uvalib-analytics-search` | For `<site-analytics>`: once per settled search (results or none, not an error): the query, the section's `analyticsName` as category and its total when known. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; `['bento-box', 'retry', <section>]` for its Retry button; `['bento-box', 'error', 'section-load: <section>']` once when its results cannot be loaded; never titles or URLs. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-link` |  | Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`). |
| `--uva-color-border` |  | Dark-mode role token: the block's border and entry rules (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: background (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the header band (else #dadada). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<events-section>`

Upcoming UVA Library events from LibCal, as on the library.virginia.edu home page: a grid of cards, each one link with the event's title, a date column (month, day, weekday) and its time, in America/New_York. Events that have ended are left out. Light DOM output keeps the classes the Drupal theme styles (`event-container`, `event`, `event-url`, `event-title`, `event-date`, `event--month`, `event--day`, `event--wkday`, `event-time`).

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `8` | How many events to show (at most; fewer when fewer are coming up). |
| `category` | `string \| undefined` |  | Only events in this LibCal category (its id, for example `38740`; several comma-separated). |
| `query` | `string \| undefined` |  | Only events matching this search text (LibCal's event search). |
| `max-title-length` | `number \| undefined` |  | Cut titles longer than this many characters, with "…", for sighted users; assistive technology still gets the whole title. Titles are clamped to three lines anyway, so this is only kept for old pages. |
| `heading-level` | `number \| undefined` |  | The level of each event's title heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page (an `<h2>` above gives `<h3>` titles), or 3 when there is none. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a click on an event, `['events-section', 'event-click', <category id, or all>, <position, from 1>]` (never its title or URL), and `['events-section', 'error', 'events-load']` once when the events cannot be loaded. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--events-section-min-height` | `0` | Height the element keeps during its first load (while it has the `loading` attribute). Its placeholder cards already hold the final height; this only matters for a page that wants more. Applies with `no-style` too. Pages can reserve height before the element upgrades with `events-section:not(:defined) { display: block; min-height: … }`. |
| `--uva-brand-orange-dark` | `#b35900` | Background of the date column (white text on it is 4.8:1). |
| `--uva-brand-blue` | `#232d4b` | Event title colour. |
| `--uva-color-link` |  | Dark-mode role token: event title colour (else `--uva-brand-blue`). |
| `--uva-color-text` |  | Dark-mode role token: time and status text (else #2b2b2b). |
| `--uva-color-border` |  | Dark-mode role token: card border (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: card and button background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<libguides-section>`

The first subject guide pages (LibGuides) matching `query`: the page and its guide, then its author and subjects and the matching text. Only text and links are taken from Springshare's HTML.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text. Empty: nothing is fetched and the section is `empty`. |
| `limit` | `number` | `5` | How many results to show (at most). |
| `no-result-describe` | `string` | `'No results found.'` | The message shown when nothing is found. |
| `heading-level` | `number \| undefined` |  | The level of the section's heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page, or 3 when there is none. `<bento-box>` sets it one below its own heading. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `bento-state` | Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled. |
| `uvalib-analytics-search` | For `<site-analytics>`: once per settled search (results or none, not an error): the query, the section's `analyticsName` as category and its total when known. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; `['bento-box', 'retry', <section>]` for its Retry button; `['bento-box', 'error', 'section-load: <section>']` once when its results cannot be loaded; never titles or URLs. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-link` |  | Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`). |
| `--uva-color-border` |  | Dark-mode role token: the block's border and entry rules (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: background (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the header band (else #dadada). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

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
| `heading-level` | `number \| undefined` |  | `aria-level` (1–6) of the week heading, also its `heading-h<n>` class. Unset (the default), the level is one below the nearest heading before the element in the page (`aria-level` 3 under a library's `<h2>` on /hours), or 2 when there is none, and the class stays `heading-h2`, the one the library website's CSS styles. |
| `headinglevelstart` | `number \| undefined` |  | Old name of `heading-level`, still accepted; `heading-level` wins. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `building-hours` | The "Building hours" table row (shadow mode). |

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: `['library-weekly-hours', 'week-change', 'next' \| 'previous']` for the week buttons, and `['library-weekly-hours', 'error', 'hours-load']` once when the hours cannot be loaded. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--library-weekly-hours-min-height` | `0` | Height the element keeps during its first load (while it has the `loading` attribute, before any rows show), so content below does not jump when the hours arrive. Applies with `no-style` too. Pages can reserve the same height before the element upgrades with `library-weekly-hours:not(:defined) { display: block; min-height: … }`. |
| `--uva-brand-orange` | `#e57200` | Border of today's column; focus ring colour. |
| `--uva-brand-blue` | `#232d4b` | Header and button colour. |
| `--uva-color-border` |  | Dark-mode role token: table cell borders (else #dadada). |
| `--uva-color-current` |  | Dark-mode role token: today's column border (else `--uva-brand-orange`). |
| `--uva-color-link` |  | Dark-mode role token: heading, button text and border (else `--uva-brand-blue`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: button background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<site-alerts>`

Live UVA Library alerts, drawn as library.virginia.edu draws them. The alerts project (github.com/uvalib/uvalib-alerts) keeps the data: a headless `<uvalib-alerts>` loaded at runtime from the alerts CDN (`alerts-env`, or `alerts-src`), one per document, shared by every `<site-alerts>` and created hidden at the end of `<body>`. It keeps the live connection, the dismissals (per site, synced across tabs) and the regional matching (the page URL, followed through single-page-app navigation). If its script fails to load, one console warning is logged and nothing is shown. `show` picks the alerts: `header` (the banner: a polite `role="status"` row on teal), `list` (critical, warning and information alerts, most severe first; only critical ones are an assertive `role="alert"`), `regional` (alerts targeted at this page), `sitewide` (header and list) or `all` (the default). Each list alert has a decorative icon and a visually hidden "Critical:", "Warning:" or "Information:" before its title, a heading (`heading-level`, default 2, as on library.virginia.edu). Warning and information alerts have a dismiss button; after a dismissal focus moves to the next alert's button (or the alert), else to the page's `<main>`, never to `<body>`. Alert bodies are server-sanitized HTML, re-sanitized with the browser's `setHTML()` where it exists. `<site-page>` places three of these itself (banner, list band, regional); use this element directly only on pages without `<site-page>`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `show` | `SiteAlertsShow` | `'all'` | Which alerts to show: `header`, `list`, `regional`, `sitewide` (header and list) or `all`. |
| `alerts-env` | `string` | `'production'` | Alerts environment: `production` (default) or `staging`. Any other value logs one console warning and uses production. Ignored when `alerts-src` is set. |
| `alerts-src` | `string \| undefined` |  | Alerts base URL (holding `config.json`, `alerts.json` and `v1/uvalib-alerts.js`); overrides `alerts-env`. For a custom domain, local development and tests. |
| `heading-level` |  | `DEFAULT_LEVEL` | The level of each list alert's title heading, 1 to 6 (default 2). |
| `storage-key` | `string \| undefined` |  | The localStorage key for dismissed alerts, passed to the headless element (default: the alerts project's, `uvalib-alerts-seen`). Elements with different keys use different headless elements. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `site-alerts-change` | The number of alerts this element shows changed: `detail` is `{ count }`. Bubbles and is composed. The host also has `data-empty` while it shows none. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-teal` | `#25cad3` | Header banner background. |
| `--uva-red-100` | `#fbcfda` | Critical alert background (`--uva-red-B` #b30000 border). |
| `--uva-yellow-100` | `#fef6c8` | Warning alert and regional alert background (`--uva-yellow` #ecc602 border). |
| `--uva-blue-alt-300` | `#bfe7f7` | Information alert background (`--uva-blue-alt` #007bac border). |
| `--uva-teal-200` | `#c8f2f4` | Information regional alert background (`--uva-teal` border). |
| `--uva-grey-darkest` | `#2b2b2b` | Alert text. |
| `--uva-blue-alt-B` | `#141e3c` | Links in alert text. |
| `--uva-color-alert-text` |  | Dark-mode role token: alert text, icons and focus ring (else `--uva-grey-darkest`; the banner's is `--uva-color-alert-header-text`, else #000). |
| `--uva-color-alert-link` |  | Dark-mode role token: links in alert text (else `--uva-blue-alt-B`). |
| `--uva-color-alert-header-bg` |  | Dark-mode role token: banner background (else `--uva-teal`). |
| `--uva-color-alert-critical-bg` |  | Dark-mode role token: critical alert background; `-border` for its border. Also `--uva-color-alert-warning-*`, `--uva-color-alert-info-*`, `--uva-color-alert-regional-*` and `--uva-color-alert-regional-info-*`. |

### `<site-analytics>`

Matomo analytics, with no visual output. Loads matomo.js for the site and records the page view, then forwards the events below, fired anywhere in the page, to Matomo. Every call goes through Matomo's `_paq` queue, so events fired before matomo.js loads are kept. One tracker per page: however many `<site-analytics>` and `<uvalib-analytics>` elements there are (from any copy of this library), matomo.js is loaded and the page view recorded once, and only one element forwards each event; if it is removed, the next takes over. A Matomo snippet already on the page is used as it is (nothing is loaded or recorded again). When the browser sends Do Not Track or Global Privacy Control, or the page has `<html data-uvalib-analytics="off">`, it loads nothing and records nothing. A click on an element with `data-uvalib-track="category,action[,name[,value]]"` (or inside one, in light or shadow DOM) sends that event, unless `<html data-uvalib-analytics="off">` or a `no-analytics` ancestor opts it out. With `downloads="event"` downloads are counted as `['download', '<extension>']` events, without their URLs, instead of by Matomo's link tracking. The same element is registered as `<uvalib-analytics>` by `uvalib-analytics.js`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `matomourl` | `string` | `'https://analytics.lib.virginia.edu/'` | The Matomo server, ending in `/` (attribute `matomourl`). |
| `matomoid` | `number \| undefined` |  | The Matomo site id (attribute `matomoid`). Default: the site whose URL the page is under. |
| `spa` | `boolean \| 'auto'` | `false` | A single-page app. `spa` (no value): it records its own page views (`uvalib-analytics-pageview`), none on load. `spa="auto"`: a page view on load and one per same-document route change (hash change, Back and Forward, `history.pushState`), once the title has settled, never twice in a row for the same URL, with the previous URL as the referrer. Either way Matomo's link tracking is off. |
| `variables` | `Record<string, unknown> \| null` | `null` | Custom dimensions, a JSON object of `{ id: value }`, set before the page view. |
| `downloads` | `string \| undefined` |  | `event`: count downloads without their URLs. Matomo's link tracking is left off; a left or middle click on a link to a file (the `download` attribute, or a download file type) sends the event `['download', '<extension>']` (no URL, no file name), and a click on a link to another site is still sent as an outlink (`trackLink`), as Matomo's link tracking would. Off by default. Read when Matomo is set up; no effect with a Matomo snippet already on the page. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Listens for (on document)

| Event | Description |
|---|---|
| `uvalib-analytics-pageview` | Listened for on `document` (not fired): records a page view; `detail` is `{ customTitle?, referrer? }` (default: the document's title and referrer; a referrer without `http` is taken as a path on this origin). |
| `uvalib-analytics-search` | Listened for on `document` (not fired): a Matomo site search; `detail` is `{ searchQuery, searchCategory?, resultCount? }`. |
| `uvalib-analytics-event` | Listened for on `document` (not fired): a Matomo event; `detail` is `{ event: [category, action, name?, value?] }` (`track` is the old name of `event`). |
| `uvalib-analytics-content` | Listened for on `document` (not fired): a Matomo content impression; `detail` is `{ name, piece, target?, interaction? }` (with `interaction`, a content interaction instead). |
| `site-analytics-pageview` | Listened for on `document` too: the same as `uvalib-analytics-pageview`. |
| `site-analytics-search` | Listened for on `document` too: the same as `uvalib-analytics-search`. |
| `site-analytics-event` | Listened for on `document` too: the same as `uvalib-analytics-event`. |
| `site-analytics-content` | Listened for on `document` too: the same as `uvalib-analytics-content`. |

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

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a click on one of the footer's own links (not the pre-footer's), `['site-footer', 'link-click', '<Column>: <Link>']`, for example `Using the Library: Get help`; the phone and email links are `Contact us: Phone` and `Contact us: Email`, the social links `Social: Facebook` and `Social: Instagram`. Never a URL. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Main footer background (also the skip-link background in the shared accessibility sheet, which the footer does not render). |
| `--uva-blue-alt-300` | `#bfe7f7` | Pre-footer band background. |
| `--uva-blue-alt-darkest` | `#141e3c` | Copyright bar background. |
| `--uva-brand-orange` | `#e57200` | Social icon hover colour and focus-visible outline. Footer link and text colours are fixed white. |
| `--uva-color-pre-footer-bg` |  | Dark-mode role token: pre-footer band background (else `--uva-blue-alt-300`). |
| `--uva-color-pre-footer-text` |  | Dark-mode role token: pre-footer band text (else inherited). The footer itself is the same in both schemes. |

### `<site-header>`

UVA Library site header: logo, utility navigation, and a popover menu on narrow screens. A site can replace the library utility links (My account, Ask a Librarian, Hours, Give, Alerts, Search) with its own: give the header `<a slot="site-links" href="…">` children. They are shown, in order, in the inline nav and the Menu popover, with `href` as written (not joined to `root-link-domain`) and their `aria-current`, `target`, `rel` and `hreflang`. The source anchors themselves stay hidden. Children that are not `<a href>` with text (empty or whitespace-only text counts as none) are ignored with one console warning. The `vendor` variant ignores site links and keeps its own reduced link set. The full header also shows the UVA Library main navigation (`<site-main-nav>`): a row under the logo row on wide screens, and an accordion at the top of the Menu popover on narrow ones (992px and below), above the utility or site links. `no-main-nav` turns it off, leaving the header exactly as it was without it; the `vendor` variant never shows it. A `<nav slot="main-nav">` child replaces its links (see `<site-main-nav>`), and `main-nav-src` loads them from JSON; `main-nav-current` sets the URL marked current. `color-scheme-switch` opts in to dark mode (off by default; see the README's "Dark mode"): a Light / Dark / System radio group ("Theme") at the end of the utility-links row on wide screens and at the bottom of the Menu popover on narrow ones. The `vendor` variant, which has no Menu, shows it after its inline link, on a row of its own under the logo row on narrow screens. In dark mode the logo is the reversed (white) one. `site-name` shows a sub-site's name after the logo, past a thin divider, as a link to the site's home (`site-name-href`, default `/`); the logo still links to library.virginia.edu. The name is not a heading (the page keeps its own `<h1>`) and its link is named "<name> home". On wide screens it sits in the logo row, wrapping to at most two lines (keep it short), so the header is no taller, while the links (and theme control) fit beside it on one line; when they would not, and at 992px and below, it gets its own lines under the logo, so the links are laid out exactly as without it. The `vendor` variant shows it too.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `variant` | `'full' \| 'vendor'` | `'full'` |  |
| `site-links-label` | `string \| undefined` |  | Accessible name of the nav when site links replace the utility links (default "Site"; the popover nav's name adds " menu"). |
| `site-name` | `string \| undefined` |  | The sub-site's name, shown after the library logo as a link to the site's home (`site-name-href`). The logo still links to library.virginia.edu. Not a heading. |
| `site-name-href` | `string \| undefined` |  | Where the site name links (default `/`, the site's own home). |
| `no-main-nav` | `boolean` | `false` | Hide the UVA Library main navigation (the row under the logo and the popover accordion). |
| `main-nav-label` | `string \| undefined` |  | Accessible name of the main navigation (default "Main"). |
| `main-nav-src` | `string \| undefined` |  | URL of JSON main navigation items (`MainNavItem[]`, needs CORS), passed to `<site-main-nav items-src>`. |
| `main-nav-current` | `string \| undefined` |  | The URL whose main-navigation link is marked current, passed to `<site-main-nav current>`. Default: the page location, followed through same-document navigations. |
| `color-scheme-switch` | `boolean` | `false` | Opt in to dark mode: the page follows the OS light or dark preference ("System"), and a Light / Dark / System control (at the end of the utility-links row on wide screens, at the bottom of the Menu popover on narrow ones) lets the visitor override it, remembered per site in localStorage (`uvalib-color-scheme`). Sets `data-uva-color-scheme` on the root element, and swaps in the reversed logo while dark. Ignored (the page stays light and no control is shown) in browsers without CSS `light-dark()`. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| `skip-link` | Shadow mode only: optional skip link, rendered first inside `<header>` (`<site-page>` uses it). |
| `alerts` | Optional alert banner (`<site-page>` passes its `<site-alerts show="header">`), shown as a full-bleed row at the very top of `<header>` (flush with its top and both edges, outside its padding), after the skip link and before the logo row. In light mode the children are moved to the start of `<header>`. The header never loads alerts itself. |
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
| `uvalib-analytics-event` | For `<site-analytics>`: the visitor picked a colour scheme, `['site-header', 'color-scheme', 'light' \| 'dark' \| 'system']` (not the initial value); `['site-header', 'link-click', <label>]` for a utility or site link, `['site-header', 'logo-click']`, `['site-header', 'site-name-click']` (the `site-name` link), `['site-header', 'skip-link']` (a slotted skip link) and `['site-header', 'menu-open']` when the Menu popover opens; and the main navigation's menu opens and link clicks (see `<site-main-nav>`). Never a URL. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Utility link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Menu button colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline), and the underline colour of an `aria-current` link (also bold, with a 3px underline). |
| `--uva-brand-blue` | `#232d4b` | Skip-link background for a skip link slotted into `skip-link` (shadow mode, shared accessibility sheet). |
| `--uva-color-surface-raised` |  | Dark-mode role token: header, Menu popover and theme control background (else #ffffff). |
| `--uva-color-utility-link` |  | Dark-mode role token: utility and site link colour (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: Menu button and theme control text (else `--uva-grey-darkest`). |
| `--uva-color-border` |  | Dark-mode role token: popover border and rules (else #ccc). |
| `--uva-color-control-border` |  | Dark-mode role token: theme control border (else `--uva-grey`, #808080). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected theme option and skip-link background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: selected theme option and skip-link text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-current` |  | Dark-mode role token: current-page underline (else `--uva-brand-orange`). |

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
| `uvalib-analytics-event` | For `<site-analytics>`: `['site-hours-section', 'link-click', 'See all hours']` for a "See all hours" link, and `['site-hours-section', 'error', 'hours-load']` once when the libraries or their hours cannot be loaded. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Heading and link colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour. |
| `--site-hours-list-min-height` | `0` | Height the list keeps while the hours load, so the link and content below do not jump when they arrive (seven `limited` libraries take about 12.75rem). |
| `--uva-color-link` |  | Dark-mode role token: heading and link colour (else `--uva-brand-blue`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<site-main-nav>`

The UVA Library main navigation (About, Using the Library, Research & teaching support, Get help), as on library.virginia.edu, following the WAI-ARIA disclosure navigation pattern: one `<nav>` landmark; each group is a `<button aria-expanded aria-controls>` followed by its list of links, and an entry with no group is a plain link. Click, Enter or Space toggles a group and only one is open at a time; Escape closes it and returns focus to its button; arrow keys, Home and End move between the buttons and between a panel's links, and ArrowDown on an open button moves into its panel. In the `bar` layout a panel also closes when focus leaves the nav or on a pointer press outside it. There is no hover-to-open. The items come from, in order of precedence: a `<nav slot="main-nav">` child holding `<ul><li><a href>…</a></li></ul>` (a direct link) or `<li><span>Group</span><ul><li><a href>…` (a group), kept hidden and watched for changes; the `items` property; JSON at `items-src`; and the snapshot of the live menu bundled with the component (see `pnpm sync:main-nav`). Invalid entries are skipped and levels deeper than two are flattened, each with one console warning. Relative hrefs are joined to `root-link-domain`; absolute ones are kept, and fragment-only ones (`#…`, a hash route) stay on this page. A plain click on a link closes the open group. The link for the current page (`current`, default the page location, followed through same-document navigations; host and path, ignoring the query, the hash, a trailing slash and a leading `www.`) gets `aria-current="page"`, and its group button `aria-current="true"`, shown bold with a thick underline. Of links that differ only by hash, the one with the page's hash is marked, else the one without a hash; if every one has a hash, the first is marked while the page has none, and none for a hash none has. `<site-header>` renders it: as a row under the logo on wide screens and as an accordion in the Menu popover on narrow ones.

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
| `uvalib-analytics-event` | For `<site-analytics>`: a group was opened, `['site-main-nav', 'menu-open', <the group's label>]` (not on close), and a link was clicked, `['site-main-nav', 'link-click', '<Group> > <Link>']` (a top-level link: its label alone; never the URL). Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-grey-darkest` | `#2b2b2b` | Top-level button colour. |
| `--uva-brand-blue` | `#232d4b` | Bar bottom border, chevrons, panel links, and the hover and expanded button text. |
| `--uva-grey-100` | `#dadada` | Hover and expanded button background, and panel link hover background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour, and the underline of the current page's link and group (also bold, with a 3px underline). |
| `--uva-font-family` | `franklin-gothic-urw, "UVA Franklin Fallback", Arial, Helvetica, sans-serif` | Font family. |
| `--uva-color-text` |  | Dark-mode role token: top-level button text (else `--uva-grey-darkest`). |
| `--uva-color-link` |  | Dark-mode role token: chevrons, panel links, hover text and the focus ring over hover (else `--uva-brand-blue`). |
| `--uva-color-surface-hover` |  | Dark-mode role token: hover and open-group background (else `--uva-grey-100`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: bar and panel background (else #ffffff). |
| `--uva-color-accent-bg` |  | Dark-mode role token: bar bottom rule (else `--uva-brand-blue`). |
| `--uva-color-shadow` |  | Dark-mode role token: panel shadow colour (else rgba(0, 0, 0, 0.2)). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-current` |  | Dark-mode role token: current-page underline (else `--uva-brand-orange`). |

### `<site-page>`

Page wrapper: skip link (inside the header landmark in shadow mode), header, a single `<main>`, footer (unless `no-footer`), and global page styles. Side-effect free: `site-page.ts` registers `<site-header>` (and its `<site-main-nav>`) and `<site-footer>`. The header shows the UVA Library main navigation by default (`no-main-nav` turns it off; `header-variant="vendor"` never shows it). Shows live UVA Library alerts by default with `<site-alerts>` (its code loads only then), placed as Virgo places them: a full-bleed `<site-alerts show="header">` banner at the top of the header landmark (after the skip link), a full-bleed band between the header and `<main>` holding `<site-alerts show="list">` (a `<section aria-label="Library alerts">` region, hidden while the list has nothing to show), and `<site-alerts show="regional">` as the first child of `<main>`, inside its padding. Their data comes from one headless `<uvalib-alerts>`, loaded once per document, with a module script, from the alerts CDN (`alerts-env`, or `alerts-src`); if it fails to load, one console warning is logged and the page works as before. `no-alerts` renders no alert elements and loads nothing. A `slot="breadcrumbs"` child (a `<uvalib-breadcrumbs>`) is placed where library.virginia.edu puts the trail: after the header and the alert list band, before `<main>` and outside it (so the skip link lands past it), with the same gutters as `<main>`. Printing leaves out the chrome: the skip link, header (with the main navigation and the header alert), alert list band, regional alerts, breadcrumbs, pre-footer and footer are not printed, `<main>` loses its gutters, and the content prints black on white (a dark scheme prints light), its links underlined. A short line above the content says where the page came from ("UVA Library — <site name or page title>" and the page's URL). `print-chrome` prints the page as it is shown instead. With `no-style` none of this applies.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `header-variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-global-styles` | `boolean` | `false` |  |
| `no-footer` | `boolean` | `false` | Hide the footer (and any pre-footer band), for tools and app-like pages where the site footer does not belong. The footer is kept hidden rather than removed, so toggling the attribute keeps pre-footer content. |
| `print-chrome` | `boolean` | `false` | Print the header, alerts, breadcrumbs and footer too. By default printing leaves them out and prints only `<main>`, black on white. |
| `site-links-label` | `string \| undefined` |  | Accessible name of the header navigation when site links are given (default "Site"). |
| `site-name` | `string \| undefined` |  | The sub-site's name, forwarded to `<site-header site-name>`: shown after the logo as a link to the site's home. |
| `site-name-href` | `string \| undefined` |  | Where the site name links, forwarded to `<site-header site-name-href>` (default `/`). |
| `no-main-nav` | `boolean` | `false` | Hide the UVA Library main navigation in the header. |
| `main-nav-label` | `string \| undefined` |  | Accessible name of the header's main navigation (default "Main"). |
| `main-nav-src` | `string \| undefined` |  | URL of JSON main navigation items, forwarded to `<site-header main-nav-src>`. |
| `main-nav-current` | `string \| undefined` |  | The URL whose main-navigation link is marked current, forwarded to `<site-header main-nav-current>`. Default: the page location, followed through same-document navigations; set it when a single-page app's route is not its URL. |
| `alerts-env` | `string` | `'production'` | Alerts environment: `production` (default) or `staging`. Any other value logs one console warning and uses production. Ignored when `alerts-src` is set. |
| `alerts-src` | `string \| undefined` |  | Alerts base URL (holding `config.json`, `alerts.json` and `v1/uvalib-alerts.js`); overrides `alerts-env`. For a custom domain, local development and tests. |
| `no-alerts` | `boolean` | `false` | Render no alert elements and load no alerts script. |
| `color-scheme-switch` | `boolean` | `false` | Opt in to dark mode, forwarded to `<site-header color-scheme-switch>`: the page follows the OS preference, and a Light / Dark / System control in the header lets the visitor override it (remembered per site). Off by default: the page is always light. The page's own content must support it (see the README's "Dark mode"). |
| `matomo-id` | `number \| undefined` |  | Opt in to Matomo analytics: the site's Matomo id. The page then adds one `<site-analytics>` for it (loading its code only then), which records the page view and what the library's components report (see the README's "Analytics"). Off by default. With an analytics element or a Matomo snippet already on the page nothing is counted twice. |
| `matomo-url` | `string \| undefined` |  | The Matomo server for `matomo-id`, ending in `/` (default: the library's). |
| `matomo-downloads` | `string \| undefined` |  | `event`: the `<site-analytics downloads="event">` option for `matomo-id`, counting downloads as `['download', '<extension>']` events without their URLs. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | Main page content, rendered inside the single `<main>`. |
| `breadcrumbs` | Optional breadcrumb trail (a `<uvalib-breadcrumbs>`), shown between the header (and alert list band) and `<main>`. In light mode it is moved there, never into `<main>`. |
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
| `--uva-font-family` | `franklin-gothic-urw, "UVA Franklin Fallback", Arial, Helvetica, sans-serif` | Page font family (global styles). |
| `--uva-font-size-base` | `17px` | Page base font size (global styles). |
| `--uva-grey-darkest` | `#2b2b2b` | Page text colour (global styles). |
| `--uva-color-surface` |  | Dark-mode role token: page background (global styles; else none). |
| `--uva-color-text` |  | Dark-mode role token: page text (global styles; else `--uva-grey-darkest`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: skip-link background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: skip-link text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

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
| `--uva-font-family` | `franklin-gothic-urw, "UVA Franklin Fallback", Arial, Helvetica, sans-serif` | Font family. |
| `--uva-font-size-base` | `17px` | Base font size. |
| `--uva-grey-darkest` | `#2b2b2b` | Text colour. |
| `--uva-color-text` |  | Dark-mode role token: text colour (else `--uva-grey-darkest`). |
| `--uva-color-surface` |  | Dark-mode role token: page background (else none). |

### `<uvalib-analytics>`

`<site-analytics>` under its original name, for markup such as Drupal's `<uvalib-analytics matomoid="10">`: the same element, attributes and events. A constructor can be registered only once, hence the subclass.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `matomourl` | `string` | `'https://analytics.lib.virginia.edu/'` | The Matomo server, ending in `/` (attribute `matomourl`). |
| `matomoid` | `number \| undefined` |  | The Matomo site id (attribute `matomoid`). Default: the site whose URL the page is under. |
| `spa` | `boolean \| 'auto'` | `false` | A single-page app. `spa` (no value): it records its own page views (`uvalib-analytics-pageview`), none on load. `spa="auto"`: a page view on load and one per same-document route change (hash change, Back and Forward, `history.pushState`), once the title has settled, never twice in a row for the same URL, with the previous URL as the referrer. Either way Matomo's link tracking is off. |
| `variables` | `Record<string, unknown> \| null` | `null` | Custom dimensions, a JSON object of `{ id: value }`, set before the page view. |
| `downloads` | `string \| undefined` |  | `event`: count downloads without their URLs. Matomo's link tracking is left off; a left or middle click on a link to a file (the `download` attribute, or a download file type) sends the event `['download', '<extension>']` (no URL, no file name), and a click on a link to another site is still sent as an outlink (`trackLink`), as Matomo's link tracking would. Off by default. Read when Matomo is set up; no effect with a Matomo snippet already on the page. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Listens for (on document)

| Event | Description |
|---|---|
| `uvalib-analytics-pageview` | Listened for on `document` (not fired): records a page view; `detail` is `{ customTitle?, referrer? }` (default: the document's title and referrer; a referrer without `http` is taken as a path on this origin). |
| `uvalib-analytics-search` | Listened for on `document` (not fired): a Matomo site search; `detail` is `{ searchQuery, searchCategory?, resultCount? }`. |
| `uvalib-analytics-event` | Listened for on `document` (not fired): a Matomo event; `detail` is `{ event: [category, action, name?, value?] }` (`track` is the old name of `event`). |
| `uvalib-analytics-content` | Listened for on `document` (not fired): a Matomo content impression; `detail` is `{ name, piece, target?, interaction? }` (with `interaction`, a content interaction instead). |
| `site-analytics-pageview` | Listened for on `document` too: the same as `uvalib-analytics-pageview`. |
| `site-analytics-search` | Listened for on `document` too: the same as `uvalib-analytics-search`. |
| `site-analytics-event` | Listened for on `document` too: the same as `uvalib-analytics-event`. |
| `site-analytics-content` | Listened for on `document` too: the same as `uvalib-analytics-content`. |

### `<uvalib-back-to-top>`

A “Back to top” button for long pages: minutes, finding aids, transcriptions, long result lists. It stays hidden (`visibility: hidden`, so it is neither a tab stop nor in the accessibility tree) until the top `offset` pixels of the page (default 400) have scrolled out of view, watched with an IntersectionObserver on a small sentinel at the top of the page, never a scroll listener. If it has focus as it hides, focus moves to the target. Activating it scrolls to the top (smoothly unless the visitor prefers reduced motion) and moves focus to the page's `<h1>` (the first in `<main>`, else the first anywhere, else `#top`), or to `target` (a selector), adding `tabindex="-1"` when it is not focusable, so keyboard and screen reader users land at the top too. The button is fixed in the bottom corner (end side), inside the safe-area insets. The element itself is an empty block 4.75rem tall: put it last in the page's main content and that is the space the button needs, so the last lines can always scroll clear of it. When that space comes into view the button sits in it instead of floating, so it never covers the footer either. It is hidden in print.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` |  | `DEFAULT_LABEL` | The button's text. |
| `offset` |  | `DEFAULT_OFFSET` | How many pixels at the top of the page must scroll out of view before the button shows. |
| `target` | `string` | `''` | A selector for where focus goes (default: the page's `<h1>`, else `#top`). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `button` | The button. |

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-back-to-top', 'click']` when activated. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-back-to-top-space` | `4.75rem` | The height the element keeps for the button at the end of the content. |
| `--uva-color-surface-raised` |  | Dark-mode role token: button background (else #fff). |
| `--uva-color-button-bg` |  | Dark-mode role token: button border and text (else `--uva-blue-alt`, #007bac). |
| `--uva-color-button-hover-bg` |  | Dark-mode role token: hovered button (else `--uva-blue-alt-A`, #005679). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-shadow` |  | Dark-mode role token: the floating button's shadow. |

### `<uvalib-breadcrumbs>`

A breadcrumb trail, as on library.virginia.edu: links separated by slashes, ending with the current page, at body size. A `<nav aria-label="Breadcrumb">` holding an `<ol>`; the separators are hidden from assistive technology and the last item has `aria-current="page"` (a `<span>`, or a link when it has an href). Give the trail as children: `<a href>` elements, ending with the current page as a text-only element (`<span>Hours</span>`) or a link (`<a href aria-current="page">`). The last child is always the current page. An earlier child without an href is shown as plain text. Children with no text are skipped with one console warning. Hrefs are used as written, and the trail follows changes to the children (attributes and text too). Apps that build the trail in JavaScript set the `items` property instead (it then wins over any children); assigning a new array re-renders. A step back to a search: give its link `data-return-from` with the search page's path (or several, separated by spaces), as in `<a href="/" data-return-from="/">Search</a>`. When the visitor came from that page on this site with a query string (`document.referrer`; a trailing slash or `index.html` does not matter), the step links back to that search (path and query) instead; its text stays the same. Otherwise, as when the result was opened in a new tab or the site sends no referrer, it keeps its href. Nothing is stored or sent. In `items`, the same is `returnFrom`. Inside `<site-page>`, give it `slot="breadcrumbs"`: it is placed between the header (and alerts band) and `<main>`, with the page's gutters. It works anywhere else too. Single-page apps: the trail is drawn from copies of the children, so a router's own click handlers on them do not run. Listen for `uvalib-breadcrumbs-navigate` and cancel it to route in place; hash links need nothing.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Breadcrumb'` | Accessible name of the navigation landmark. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a click on a trail link, `['uvalib-breadcrumbs', 'link-click', 'level <N>', <N>]` (N from 1, the first step); never the label or URL. Bubbles and is composed. |
| `uvalib-breadcrumbs-navigate` | A plain click on a trail link: `detail` is `{ href, index }` (href as written). Cancel it (`preventDefault()`) to navigate in the app; the click's default is then prevented. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Current page colour. |
| `--uva-grey-dark` | `#4f4f4f` | Separator colour. |
| `--uva-color-utility-link` |  | Dark-mode role token: link colour, #005679 in light as on library.virginia.edu (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: current page colour (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: separator colour (else `--uva-grey-dark`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-card>`

One card: a collection (title and “N texts”), a photo (image, count, date, category, title, excerpt) or any other raised summary. With `href`, the heading is the link and a pseudo-element stretches that link over the card, so the whole card is one click. The arrow is only a visual aid. The card is never wrapped in an `<a>`. A clickable card must not contain another link, button or other control: the stretched link covers it. A static card (no `href`, or an empty or unsafe one) has no stretch, so its excerpt and `actions` slot may contain links. With `href`, the heading needs an accessible name (text, or an image `alt` or `aria-label`); otherwise the link is hidden. `media-shape="circle"` draws the media as a centered circle, for a person or avatar. The image keeps its alt, and the count badge still sits on it. Any other shape is ignored. Regions are light-DOM children. Give `slot="media"`, `slot="badge"`, `slot="heading"`, `slot="meta"`, `slot="chip"` or `slot="actions"`; anything else (including text) is the excerpt. An image needs a real alt, or `alt=""` when the heading already names it. A date belongs in `<time>` in the meta slot. One element per chip. `actions` is a row of links or buttons on a static card (“Read the story”, “Photos (132)”). The heading level defaults like `<events-section>`: one below the nearest heading before the card, or 3 when there is none. `heading-level` (1–6) wins. An invalid value is ignored.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `href` | `string \| undefined` |  | Makes the card one link: the heading stretches over the card. Empty is not a link. |
| `media-shape` | `string` | `''` | `circle` crops the media to a centered circle and keeps the image alt. Anything else is ignored, with one console warning. |
| `heading-level` | `number \| undefined` |  | Heading level of the title, 1–6. Unset, it is one below the nearest heading before this card, or 3 when there is none. Any other value is ignored. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| `media` | Image or other media. An `<img>` needs a real alt, or `alt=""` when the heading names it. |
| `badge` | Short label drawn over the media, such as “13 photos”. |
| `heading` | The card title. With `href`, this heading’s link is the card, so it needs an accessible name. |
| `meta` | Date (`<time>`) or byline, under the title. |
| `chip` | Category. One element per chip. |
| `actions` | Links or buttons on a static card. A clickable card must not contain them; the card link covers them. |
| (default) | Excerpt. A static card may put links here; a clickable card must not contain other controls. |

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a primary-button click on the card link that was not already canceled, including a modified click, `['uvalib-card', 'card-click', 'single']` or, inside `<uvalib-card-grid>`, `['uvalib-card', 'card-click', '<n>', <n>]` (n from 1, the card’s place in that grid). Never the title or URL. Bubbles and is composed. |
| `uvalib-card-navigate` | A plain click on the card link: `detail` is `{ href, position }` (`position` is `'single'` or `'1'`, `'2'`, …). Cancel it (`preventDefault()`) to route in the app; the click’s default is then prevented. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Title link when `--uva-color-link` is unset, and the badge background when `--uva-color-accent-bg` is unset. |
| `--uva-blue-alt-300` | `#BFE7F7` | Chip background. With `--uva-blue-alt-dark` this pair is 6.13:1 (WCAG AA for normal text, short of AAA’s 7:1). |
| `--uva-blue-alt-dark` | `#005679` | Chip text. |
| `--uva-grey-100` | `#DADADA` | Hover shadow colour when `--uva-color-shadow` is unset. |
| `--uva-color-surface-raised` |  | Dark-mode role token: card background (else #fff). |
| `--uva-color-border` |  | Dark-mode role token: card border (else `--uva-grey-100`). |
| `--uva-color-text` |  | Dark-mode role token: body text (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: meta line (else #4f4f4f). |
| `--uva-color-link` |  | Dark-mode role token: title link (else `--uva-brand-blue`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring on the card (else `--uva-brand-orange`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: badge background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Text on the badge (else #fff). |
| `--uva-color-shadow` |  | Dark-mode role token: hover shadow colour (else `--uva-grey-100`). |

### `<uvalib-card-grid>`

A grid of `<uvalib-card>` elements. It is a list, so a screen reader announces how many cards there are. Safari drops that list when markers are removed, so the list role is set as well as the `<ul>`. Columns follow the theme’s breakpoints on the grid’s own width (a container query, so a sidebar collapses the grid too): four above 992px, two through 767px, then one. Cards in a row match the height of the tallest. Set `min-card-width` (a length: `16rem`, `240px`, …) to use `repeat(auto-fill, minmax(min(100%, <width>), 1fr))` instead. An invalid value is ignored, with one console warning, and the 4/2/1 columns stay. Only `<uvalib-card>` children are listed. Anything else is left in the tree (hidden in light DOM) and warned about once. The grid gives each card a `slot` while it is inside; that attribute is removed when the card leaves, so it is not hidden by another shadow root.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `min-card-width` | `string \| undefined` |  | When a length (`16rem`, `240px`, `20ch`, `40%`), the grid fills by that minimum instead of the fixed 4/2/1 columns. Any other value is ignored. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | `<uvalib-card>` elements, one per cell. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-card-min` |  | Set from `min-card-width` when that value is a length. The grid uses it as the `auto-fill` minimum. |

### `<uvalib-chip-group>`

A row of chips: a segmented control or single-select filter (`mode="single"`), filter chips that toggle (`mode="multi"`), or suggestion chips that go somewhere (`mode="links"`), as in a year rail with counts (“2005 213”), a sort toggle (“Most photos \| Date \| Title A–Z”) or “Try: snow on the Lawn”. Give the chips as children, `<button value="2005" data-count="213">2005</button>` (the value is the `value` attribute, else `data-value`, else the text; `disabled` disables), or `<a href>` in `links` mode, or set the `items` property (`{ value, label, count?, href?, disabled?, swatch? }`), which wins over the children while set. The chips follow later changes to the children. `single`: native radios drawn as chips, in a `role="radiogroup"` named by `label`. Tab enters the group at the selected chip, the arrow keys move and select (as any radio group), and `value` is the selected chip's value. `multi`: toggle buttons with `aria-pressed`, and `value` is an array (as an attribute, comma-separated). `links`: links, or buttons that fire `select`, with no selected state; a chip whose href is unsafe (`javascript:`) is plain text, and an empty href is a button. `data-swatch` (or `swatch` in `items`) is a CSS colour drawn as a small bordered square before the label, so the chips double as a chart's or map's colour key. It is decorative (`aria-hidden`) and never the only cue: the name stays the label. An invalid colour is ignored with one warning. In forced colors the square keeps its colour. A count is shown in a smaller muted span after the label and read as part of the name: “2005, 213 items”, with `count-label` in place of “items”. A selected chip is filled, keeps its border and shows a tick. Chips wrap on a narrow screen; `scroll` keeps them on one row that scrolls sideways, with its scrollbar shown and a fade at an edge with more chips. Each chip is a target at least 44px square. `segmented` joins the chips into one bar that does not wrap (a long label wraps inside its segment), like the header's Light / Dark / System control. `description` is a hint shown under the chips and tied to the group with `aria-describedby`, so it is read when focus enters the group (“Keyword matches your words…”). It is plain text in the element's own root, so it works in a closed shadow root. `url-param` (for example `year`) keeps the value in the address (`?year=2005`, a multi value comma-separated, inside the hash on a hash route). It is read on connect; the markup's `value` stands for the address without the parameter, and any other value is written, an empty one as `?year=`. Each change is one `pushState`: in `multi` at once, in `single` once the visitor settles (a second after the last change, so arrowing through a year rail adds one entry, none if it ends where it started). Back and Forward are followed and fire `change` with `restored: true`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `mode` | `ChipGroupMode` | `'single'` | `single` (radios: one value), `multi` (toggles: an array of values) or `links`. |
| `label` | `string` | `''` | The group's accessible name (required), also the first part of the analytics name. |
| `description` | `string` | `''` | A hint shown under the chips and read with the group when focus enters it (`aria-describedby` on the group). Plain text. |
| `value` | `string \| string[]` | `''` | The selection: a chip's value in `single`, an array of values in `multi` (as an attribute, comma-separated). Setting it does not fire `change`. Unused in `links`. |
| `count-label` | `string` | `'items'` | The word after a count in each chip's accessible name: “2005, 213 items”. |
| `scroll` | `boolean` | `false` | One row that scrolls sideways instead of wrapping. |
| `segmented` | `boolean` | `false` | Join the chips into one segmented bar. |
| `url-param` | `string` | `''` | Query parameter that keeps the value in the address, for example `year` → `?year=2005`. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `swatch` | The colour square before a chip's label (`data-swatch`, `swatch`). |

#### Events

| Event | Description |
|---|---|
| `change` | The visitor changed the selection (`single`, `multi`), or Back or Forward changed it through `url-param`: `detail` is `{ value, restored? }` (a string in `single`, an array in `multi`; `restored` is true for Back and Forward). Not fired when the app sets `value`. Bubbles and is composed. |
| `select` | `links` mode: a chip was chosen. `detail` is `{ value, href? }`. For a link, a plain primary click fires it cancelable: cancel it (`preventDefault()`) to route in the app, and the click's default is prevented too. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`, on the visitor's actions only: `['uvalib-chip-group', 'change', '<label>: <chip label>', <count>?]` (in `single`, one second after the last change, for the chip then selected; in `multi`, for the chip toggled), and `['uvalib-chip-group', 'select', '<label>']` in `links` mode (never the chip or its URL). The count is sent when it is a number. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-surface-raised` |  | Dark-mode role token: chip background (else #fff). |
| `--uva-color-control-border` |  | Dark-mode role token: chip border (else `--uva-grey`, #808080). |
| `--uva-color-link` |  | Dark-mode role token: chip text and hover border (else `--uva-brand-blue`). |
| `--uva-color-text-muted` |  | Dark-mode role token: the count and the description (else #4f4f4f). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected chip background and border (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: selected chip text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-surface` |  | Dark-mode role token: the page background the scrolling row fades into at an edge with more chips (else #fff). |

### `<uvalib-citation>`

One record's citation in several formats (MLA, APA, Chicago, Bluebook…), a radio group to choose one, and a Copy citation button, as in Virgo's Cite dialog. Inline on a record page or inside a dialog: it assumes nothing about where it sits. Give each format as a child, `<blockquote data-format="MLA">…</blockquote>` (any element with `data-format`), so the page reads the same before the script loads (with `base.css`, only the first shows then, and the chooser's and button's space is held). Inline markup in a citation (`<i>` or `<em>` for a title) is kept; other elements are reduced to their text and nothing is parsed as HTML. Apps set the `citations` property instead (`[{ format, text, html? }]`, winning over the children while set); `html` keeps only inline elements, too. The formats are native radios drawn as one segmented bar (`role="radiogroup"`, "Citation format"): one tab stop, the arrow keys move and select, and the selected one is filled and ticked. `format` names the selected one (default the first). With `remember`, the visitor's last choice is kept in localStorage (per site) and wins over `format` on their next record. The selected citation is shown as selectable text in a region named "<format> citation". Copy citation copies it as plain text and as HTML where the browser allows (so an italic title stays italic when pasted into a word processor) and says "MLA citation copied" in a polite status next to the button, in the text colour (AAA), not in a toast. If the clipboard is unavailable, the citation is selected and the status says to copy it with the keyboard. `ris-href` adds a "Download RIS" link (`ris-label`) with a `download` attribute. Other export links go in the `actions` slot (`<a slot="actions" href="…" download>EndNote</a>`), after it.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Cite this item'` | The group's visible label and accessible name. |
| `hide-label` | `boolean` | `false` | Hide the label visually (it still names the group), for a dialog whose heading says it. |
| `format` | `string` | `''` | The selected format's name (default the first). Reflected when the visitor chooses one. |
| `remember` | `boolean` | `false` | Keep the visitor's last format in localStorage (per site), winning over `format`. |
| `ris-href` | `string` | `''` | A RIS file for the record: adds a download link. |
| `ris-label` | `string` | `'Download RIS'` | The RIS link's text. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| `actions` | More export links or buttons, after Copy citation and Download RIS. |

#### Events

| Event | Description |
|---|---|
| `uvalib-citation-format` | The visitor chose another format: `detail` is `{ format }`. Not fired when the app sets `format`. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`, on the visitor's actions only: `['uvalib-citation', 'format', '<format>']` (once the visitor settles on one, a second after the last change), `['uvalib-citation', 'copy', '<format>']` and `['uvalib-citation', 'download', 'ris']`. Never the citation. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: label, citation and status colour (else `--uva-grey-darkest`). |
| `--uva-color-border` |  | Dark-mode role token: the citation's border (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: the citation's, segments' and buttons' background (else #fff). |
| `--uva-color-control-border` |  | Dark-mode role token: segment border (else `--uva-grey`, #808080). |
| `--uva-color-link` |  | Dark-mode role token: segment and button text, button border (else `--uva-brand-blue`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: the selected segment (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: the selected segment's text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-combobox>`

An editable text field that suggests values as you type, from a local list or a URL: a person, place or subject picker. It follows the WAI-ARIA APG “Editable Combobox With List Autocomplete”: a real `<input role="combobox">` and a `role="listbox"` popup under it. Suggestions come from the `items` property (`{ value, label?, description?, disabled? }` objects, or strings), from `<option>` children (directly or inside a `<datalist>`; the `label` attribute or text is the label, `data-description` the second line), or from `src`, a URL template with `{q}` (fetched 250 ms after the last keystroke once the text has `min-length` characters, default 1; a newer keystroke aborts the older request; the response is a JSON array of the same shape, or anything `transform(data, query)` turns into one). `items` wins over the children while set. Local suggestions match anywhere in the label, ignoring case and accents, those starting with the text first, then those with a word starting with it; at most `max-results` (default 50, 0 for all) are shown, which keeps a list of 16,000 people fast. The matched text is bold and underlined in a `<mark>`. Keys: Down opens the list on the first suggestion and moves (wrapping), Up opens on the last, Alt+Down opens without moving, Alt+Up closes, Enter chooses the active suggestion (and then does not submit the form; with none active, Enter submits as in any field), Escape closes the list and a second Escape clears the field, Home, End, Left and Right move the caret, and Tab leaves without choosing. A real clear button (“Clear <label>”, 44px, shown only with text) empties the field and returns focus to it. Free text is allowed: `value` is whatever is in the field, and `selected` the chosen suggestion (or null); typing after choosing clears it, and leaving the field with text that is exactly one suggestion's label chooses it. `must-choose` makes any other text invalid (“Choose one of the suggestions.”). The element is form-associated: with `name` it submits the chosen suggestion's value, or else the text, and a form reset restores the `value` attribute. `required` and `disabled` (also from a disabled fieldset) work as on an input. A polite status says “5 suggestions”, “50 of 1,234 suggestions”, “No suggestions”, “Loading suggestions” or “Couldn't load suggestions” half a second after the list settles (never on the first render); the popup shows the same notes visibly. A failed load never throws. Where the browser supports the Popover API and CSS anchor positioning, the popup is a manual popover in the top layer, anchored under the field and as wide as it (above it when there is no room below), so an ancestor with `overflow: hidden` or a scrolling panel never clips it. Elsewhere it is positioned under the field inside the element, as before. Pages can style the runtime state with `:state(open)`, `:state(invalid)` and `:state(loading)` (no attributes are added). Before it upgrades, `base.css` shows the label (from the attribute) and holds the field's height. A fallback `<input list>` child works as a plain field meanwhile; on upgrade its text, `name` and `placeholder` carry over, and it is disabled so it does not submit twice.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `''` | The field's visible label (required); also the analytics name. |
| `description` | `string` | `''` | A hint under the field, read with it (aria-describedby). |
| `placeholder` | `string` | `''` |  |
| `name` | `string` | `''` | The form field name. |
| `value` | `string` | `''` | The text in the field. The attribute is the starting text, and what a form reset restores. Setting it does not fire `change`. |
| `src` | `string` | `''` | A URL template with `{q}` (the trimmed text, URL-encoded) that returns suggestions as JSON. |
| `min-length` | `number` | `1` | Characters typed before suggestions appear (and `src` is fetched). |
| `max-results` | `number` | `50` | The most suggestions shown at once; 0 for all. |
| `must-choose` | `boolean` | `false` | Text that is not one of the suggestions is invalid. |
| `required` | `boolean` | `false` |  |
| `disabled` | `boolean` | `false` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `label` | The visible label. |
| `input` | The text field. |
| `clear` | The clear button. |
| `popup` | The popup under the field. |
| `option` | Each suggestion. |
| `description` | The hint under the field. |

#### CSS states

| State | Description |
|---|---|
| `:state(open)` | The popup is showing (suggestions or a note such as “No suggestions”). |
| `:state(invalid)` | The text was shown as invalid (`aria-invalid="true"`: `must-choose` text that is not a suggestion, after leaving the field or pressing Enter). |
| `:state(loading)` | Suggestions from `src` are loading. |

#### Events

| Event | Description |
|---|---|
| `type` |  |
| `input` | The text changed by typing (the native event of the field, composed). Not fired when an option is chosen. |
| `select` | A suggestion was chosen (click or Enter). `detail` is `{ item }`, the object given. Bubbles and is composed. |
| `change` | The value was committed: a suggestion chosen, the field cleared, or the field left with changed text. `detail` is `{ value, item }` (`item` is the chosen suggestion or null). Not fired when the app sets `value` or `selected`. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-combobox', 'select', '<label>', <position from 1>]` when a suggestion is chosen, `['uvalib-combobox', 'clear', '<label>']` when the clear button or Escape empties the field, and `['uvalib-combobox', 'error', 'load']` once when `src` fails. Never the typed text or a suggestion's text or value. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-surface-raised` |  | Dark-mode role token: field and popup background (else #fff). |
| `--uva-color-control-border` |  | Dark-mode role token: field and popup border (else `--uva-grey`, #808080). |
| `--uva-color-input-text` |  | Dark-mode role token: field and suggestion text (else #2b2b2b). |
| `--uva-color-text-muted` |  | Dark-mode role token: descriptions, notes and the clear icon (else #4f4f4f). |
| `--uva-color-surface-hover` |  | Dark-mode role token: active suggestion background (else #dadada). |
| `--uva-color-track` |  | Dark-mode role token: hovered suggestion background (else #f1f1f1). |
| `--uva-color-accent-bg` |  | Dark-mode role token: the active suggestion's bar and outline (else `--uva-brand-blue`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-shadow` |  | Dark-mode role token: popup shadow. |

### `<uvalib-contents>`

Sub-navigation or a table of contents, as library.virginia.edu's sub-navigation: a `<nav>` landmark (named by `label`, "Contents" by default) with the label as a visible headline, and a nested list of links with dividers between the top-level entries and a bar beside each nested level. Give the list as a child: an `<ol>` or `<ul>` of `<li>` elements, each with an `<a href>` (or plain text for a group label) and, for sub-entries, a nested `<ol>`/`<ul>`, to any depth. Other children (a heading) are ignored. The list follows changes to the children. Apps set the `items` property instead (`{ label, href?, children? }`, winning over the children while set). The current entry gets `aria-current`: `page` for the link to this page, `location` for the link to the section of it in the URL's hash. It is found from the page URL (path, and hash for in-page sections), followed through same-document navigations (`hashchange`, `popstate` and the Navigation API), or from the `current` attribute (a URL, resolved like the links). An entry whose href has a query string matches only that query (`?part=2`); one without matches the page whatever its query. Hash-only hrefs are places on that page. With `current` unset, a valid `aria-current` on a source link (`page`, `location` or `true`) is used instead, the first of each kind. `lang` and `dir` on the source links and items, and inline markup in their text (`em`, `cite`, `code`, `abbr`…, copied element by element, never as HTML), are kept. On narrow screens the list collapses into a disclosure: the headline becomes a button with `aria-expanded`, and the list starts closed (as the Electronic Text Collections' Contents does on phones, so the text comes first) until the reader opens it, or while the `open` attribute is set; opening it shows the current entry. Narrow means the viewport (`collapse-below`, 64rem by default), not the element's own width: a contents sidebar is always far narrower than 64rem, so a container query could not tell a phone from a desktop. `sticky` keeps it in view in a sidebar on wide screens; a list longer than the window then scrolls, and the current entry is scrolled into view inside it (never the page). A table of contents for a long document: `headings-from="#article"` builds the list from the headings in that element (`levels`, `2-3` by default; nothing shown below `min` top-level entries, 2 by default). Headings without text or hidden with `aria-hidden` are skipped; one without an id gets one from its text (`budget-report`, then `budget-report-2`), and existing ids are kept, so links to sections keep working. It follows headings added, removed or retitled; `refresh()` reads them again after other changes. The children and `items` win while they give a list. Without JavaScript there is no list: a list rendered at build time, as children, works everywhere. A very long contents (a text with hundreds of sections, each its own page) can show only part of the list, with a link to the whole. `full-href` adds that link after the list: not an entry but a call to action (bold, underlined, with an arrow), its text `full-label` ("Full contents") followed by the count when `total` (the entries in the full contents) is set: "Full contents (243 sections)" (`noun`, "sections" by default; `singular` for one). A static site writes only the entries near the current one (with their parents) and sets these. `window="12"` does it in the browser when the whole list is given: only the current entry and the 12 before and after it in document order (25 entries, shifted at either end) are shown, with their parents so the nesting still makes sense; the others are hidden, not removed, and a gap between the entries shown is marked with an ellipsis (hidden from assistive technology). It follows the current entry, and applies to `items` and `headings-from` too. Without `full-href`, a "Show all 243 sections" button shows the rest in place ("Show fewer" goes back). While part of the list is shown, a visually hidden line before it says so ("Showing 25 of 243 sections."); the headline and the landmark keep the visible label as their name. On narrow screens the link and the button are inside the disclosure. Single-page apps: the list is drawn from copies of the children, so a router's own click handlers on them do not run. Listen for `uvalib-contents-navigate` and cancel it to route in place; hash links need nothing.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` |  | `DEFAULT_LABEL` | Accessible name of the navigation landmark, and its visible headline. |
| `heading-level` |  | `DEFAULT_LEVEL` | The headline's level (2 to 6), for the page's outline. |
| `current` | `string \| undefined` |  | The URL of the current entry (resolved like the links), for apps whose route is not the page URL. Unset: the page URL, followed through same-document navigations. |
| `collapse-below` |  | `DEFAULT_COLLAPSE` | The viewport width at and below which the list collapses into a disclosure: a CSS length (`64rem`, `800px`). `0` or `none` never collapses. |
| `open` | `boolean` | `false` | Whether the collapsed disclosure is open (no effect on wide screens). Toggled by its button. |
| `sticky` | `boolean` | `false` | Keep it in view while the page scrolls (a sidebar), on wide screens. |
| `headings-from` | `string \| undefined` |  | Build the list from the headings in the element this selector names (`#article`): each heading at `levels` gets an entry linking to it (an id is added when it has none), the lower levels nested under the heading before them. The children and `items` win while they give a list. |
| `levels` |  | `DEFAULT_LEVELS` | With `headings-from`: the heading levels to list, `2-3` (the default) or one level, `2`. |
| `min` |  | `DEFAULT_MIN` | With `headings-from`: the fewest top-level entries worth a list (default 2). With fewer, nothing is shown. |
| `full-href` | `string \| undefined` |  | The URL of the full contents, when the list is only part of it: a "Full contents" link after the list (`full-label`, with the count from `total`). |
| `full-label` |  | `DEFAULT_FULL_LABEL` | The full-contents link's text, before the count: "Full contents" by default. |
| `total` | `number \| undefined` |  | How many entries the full contents has, for the link ("Full contents (243 sections)") and the screen-reader line ("Showing 25 of 243 sections."). With `window`, the whole list's count when unset. |
| `noun` |  | `DEFAULT_NOUN` | What the entries are, plural, in the counts: "sections" by default. |
| `singular` | `string` | `''` | What an entry is, singular, for a count of one. Default: "section" for the default `noun`, else `noun`. |
| `window` | `number \| undefined` |  | Show only the current entry and this many before and after it in document order (and their parents); the others are hidden. Unset or blank: every entry. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a click on an entry, `['uvalib-contents', 'link-click', 'level <N>', <N>]` (N from 1, the top level), on the full-contents link, `['uvalib-contents', 'full-contents-click']`, opening or closing the disclosure, `['uvalib-contents', 'toggle', 'open' \| 'close']`, and the window's button, `['uvalib-contents', 'show-all' \| 'show-fewer']`; never the label or URL. Bubbles and is composed. |
| `uvalib-contents-navigate` | A plain click on an entry or the full-contents link: `detail` is `{ href, level }` (href as written; level 0 for the full-contents link). Cancel it (`preventDefault()`) to navigate in the app; the click's default is then prevented. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-contents-sticky-top` | `1rem` | With `sticky`: the gap kept above it. |
| `--uvalib-contents-max-height` | `none` | The list's maximum height on wide screens (it scrolls beyond it); with `sticky`, the window's height less twice the sticky gap. |
| `--uva-blue-alt-dark` | `#005679` | Link colour. |
| `--uva-brand-blue` | `#232d4b` | The current entry's bar. |
| `--uva-brand-orange` | `#e57200` | The nested levels' bar. |
| `--uva-grey-darkest` | `#2b2b2b` | Text and current entry colour. |
| `--uva-color-utility-link` |  | Dark-mode role token: link colour (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: text and current entry (else `--uva-grey-darkest`). |
| `--uva-color-link` |  | Dark-mode role token: the current entry's bar and the button's text (else `--uva-brand-blue`). |
| `--uva-color-current` |  | Dark-mode role token: the nested levels' bar (else `--uva-brand-orange`). |
| `--uva-color-text-muted` |  | Dark-mode role token: the ellipsis between the entries a window shows (else #4f4f4f). |
| `--uva-color-border` |  | Dark-mode role token: dividers (else #dadada). |
| `--uva-color-control-border` |  | Dark-mode role token: the button's border (else #808080). |
| `--uva-color-surface-raised` |  | Dark-mode role token: the button's background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-date-histogram>`

Monthly, yearly or per-decade counts as bars: a date distribution for a search page, an archive timeline or a card. Give `items` (`{ date, count }`, `date` a `YYYY` or `YYYY-MM`) or a child `<table>` (the no-JS fallback). `granularity="month"` draws twelve bars for every year from the first date to the last, including months with a count of zero. A year-only count in a month chart, a day, or any other date is a chip beside the chart. `granularity="decade"` is for a long span (two centuries of minutes): one bar per decade ("1810s: 22 meetings"), an empty decade a gap, five decades to a row labelled with its first year (1800, 1850, …), the decades lined up in columns. Choosing a decade selects its first to last year (`selected="1810/1819"`, `select` `{ from: '1810-01-01', to: '1819-12-31' }`); up and down arrows move 50 years. `granularity="auto"` draws months when every count is a month within 3 years (at most 36 bars), years up to 30 years, and decades beyond. A year row that scrolls sideways is not offered: 200 years at the 24px minimum bar is over 5,000px, so a sidebar would show ten years at a time and lose the shape that decades show whole. Each bar is a button named like "October 2015: 5,311 photos". Arrow keys move between bars; Enter or Space selects. `selected` is one bucket (`2015-10`, `2015`) or a range (`2015-03/2016-01`, also `..` or an en dash). The selection is `aria-pressed`, an inset ring and a stripe, not colour alone. Choosing a bar fires `select` with `{ from, to }` as ISO dates (a month runs from its first day to its last). Choosing the selected bar again clears it (`from` and `to` are empty strings). `range-for` is the id of a `<uvalib-date-range>`. A bar click sets that element's `value`. Whenever the range's value changes, from its controls or set in script (a Clear button, Back/Forward, a restored URL), this element highlights the buckets that overlap it (it listens for `uvalib-date-range-value`). A value that is exactly the range's own `min` and `max` is no selection. On connect or reconnect, or when the range is added later, the range's value wins when it holds a selection or changed while this element was away; otherwise `selected` is written to it. A range value is never rounded to whole buckets and written back. Setting `selected` here updates the date range. `variant="strip"` is the small per-year row for a card: not interactive, `role="img"`, one bar per year, or per decade with `decade` (or `auto` over more than 30 years). The chart reserves its height before the counts arrive: one bar track, or one track per year (per half-century for decades) when those years are already known from the data, a linked date range or the table (`--uvalib-date-histogram-bar-size`, 8rem, plus the row gap). Filling the bars in does not move the page. On a narrow screen a month row scrolls inside the component; "Scroll sideways to see more." shows while it overflows. Years wrap; a decade row fits 320px.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `items` | `HistogramItem[]` | `[]` | Counts to draw. When non-empty, wins over the child table. Set a new array to update. |
| `granularity` | `'year' \| 'month' \| 'decade' \| 'auto'` | `'month'` | `month` (twelve bars per year), `year`, `decade` (one bar per decade, five to a row), or `auto`: months when every count is a month within 3 years, years up to 30 years, else decades. Anything else is month, with one console warning. |
| `scale` | `'linear' \| 'log'` | `'linear'` | `log` scales bar height by log(count + 1). Anything else is linear. |
| `selected` | `string` | `''` | One bucket (`2015-10` or `2015`) or a range (`2015-03/2016-01`). A linked date range writes a range here. Empty when nothing is selected. |
| `range-for` | `string` | `''` | Id of a `<uvalib-date-range>` to keep in step with, both ways. |
| `variant` | `string` | `''` | `strip`: a non-interactive per-year row (`role="img"`). Anything else is the bar chart. |
| `unit` | `string` | `'items'` | Word after the count in each bar's name. Plural; a count of one drops a trailing s. |
| `label` | `string` | `'Dates'` | Accessible name of the bar group, and the start of the strip's summary. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | A `<table>` of dates and counts: two columns (date, count) or a year-by-month grid. Without JavaScript it is the fallback. With JavaScript it supplies the counts when `items` is empty. Show as table lists those counts, including odd dates; once `items` is set it lists `items` instead. |

#### CSS parts

| Part | Description |
|---|---|
| `chart` | The bar chart (shadow mode). |
| `bar` | A bar button, or a strip segment (shadow mode). |
| `table` | The generated table in Show as table (shadow mode). |

#### Events

| Event | Description |
|---|---|
| `select` | A bar or an odd-date chip was chosen, or the current one chosen again to clear it. `detail` is `{ from, to }` (ISO dates, or the odd token). Empty strings clear the selection. Not fired when `selected` is set in script or when a linked date range changes. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-date-histogram', 'select', '<from>–<to>']` when both ends are ISO dates, or `'other'` for any other choice. Not fired when the selection is cleared, set in script, or restored from a date range. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-date-histogram-bar-size` | `8rem` | Height of each bar track. The chart reserves one track, or one per known year, before the counts arrive. |
| `--uvalib-date-histogram-strip-size` | `1.5rem` | Height of `variant="strip"`. |
| `--uva-brand-blue` | `#232d4b` | Bar fill. |
| `--uva-brand-orange` | `#e57200` | Focus ring when `--uva-color-focus` is unset. |
| `--uva-font-family` | `inherit` | Font family. |
| `--uva-color-accent-bg` |  | Dark-mode role token: bar fill (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: the selection stripe (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: labels and the selection ring (else #2b2b2b). |
| `--uva-color-text-muted` |  | Dark-mode role token: the scroll hint (else #4b5563). |
| `--uva-color-track` |  | Dark-mode role token: the empty part of a bar (else #e5e7eb). |
| `--uva-color-surface` |  | Dark-mode role token: the sticky year label (else #fff). |
| `--uva-color-surface-raised` |  | Dark-mode role token: odd-date chips (else #fff). |
| `--uva-color-control-border` |  | Dark-mode role token: bar, chip and table borders (else #808080). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

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
| `uvalib-date-range-value` | The selected range changed for any reason: a slider, a date input, or `value`, `min` or `max` set in script (a Clear button, Back/Forward, a restored URL). `detail` is `{ value: [start, end] }`, the range as shown (ISO dates inside `min`..`max`). For keeping other components in step; it is not a visitor action, so it is never sent to analytics. Not fired for the first render or when the shown range is unchanged. Bubbles and is composed. |
| `date-range-change` | The range changed from a slider or a date input. `detail` is `{ value: [start, end] }` (ISO dates). Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-date-range', 'range-change', '<from year>–<to year>']`, 1 s after the visitor's last change (not when the range ends where it started). Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Selected slider range, thumbs, legend and focused date input border. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |
| `--uva-font-family` | `inherit` | Font family. |
| `--uva-color-link` |  | Dark-mode role token: legend and focused date input border (else `--uva-brand-blue`). |
| `--uva-color-track` |  | Dark-mode role token: slider track (else #e5e7eb). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected range and thumbs (else `--uva-brand-blue`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: date input background and thumb ring (else #ffffff). |
| `--uva-color-input-text` |  | Dark-mode role token: date input text (else #1f2937). |
| `--uva-color-text-muted` |  | Dark-mode role token: From / To labels (else #4b5563). |
| `--uva-color-control-border` |  | Dark-mode role token: date input border (else `--uva-grey`, #808080). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-dialog>`

A modal dialog for content and short forms: search tips, Cite, a sign-in prompt, a request form. Use it instead of a hand-built modal, a `role="dialog"` div or a framework's dialog. The children are the content. In shadow DOM they are slotted, never moved, so the page's CSS, ids, listeners and framework-rendered nodes keep working; with `no-shadow-dom` they are moved into the dialog (the same nodes, in the same document). It opens as a native `<dialog>` with `showModal()`: everything else on the page, `<site-page>`'s shadow header included, is inert while it is open, so focus stays inside without a trap script. The visible heading (`label`, an `<h2>` unless `heading-level` says otherwise) names it, and a 44px Close button is always shown; `description` (or a `slot="description"` child) is shown under the heading and is the dialog's description. Open it with a button anywhere in the page, `<button type="button" data-uvalib-dialog="<id>">` (one delegated listener, so buttons rendered later work too), with an invoker button (`commandfor="<id>" command="--show-modal"`) where the browser has invoker commands, with `show()`, or by setting `open`. On open, focus goes to the content's `[autofocus]` element when it has one (a form dialog: the first field), else to the heading, so a screen reader reads the dialog from the top and long content starts in view. On every close (Close, Escape, the backdrop, a `data-uvalib-dialog-close` button, a `<form method="dialog">` submitted, `close()`) focus returns to the element that opened it; if that is gone, to `return-focus` (a selector, or an element set as the property). Escape always closes it. A click on the backdrop closes it too (the native `closedby="any"`, or the same check in script where the browser lacks it), except with `persistent`, and never when a press starts inside the dialog and ends on the backdrop (a text selection or a drag). A `<form method="dialog">` in the content closes it on submit with the submitter's `value` as `returnValue`; other forms submit as usual. `size` is `small` (30rem), `medium` (the default, 40rem) or `large` (60rem) at most, and never wider or taller than the viewport less 16px on each side; the content scrolls inside it under a header that stays in view.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `''` | The visible heading and the dialog's accessible name. |
| `heading-level` | `number` | `2` | The heading's level, 1 to 6 (default 2). |
| `description` | `string` | `''` | A short description under the heading (or a `slot="description"` child), read as the dialog's description. |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | The widest the dialog gets: `small` (30rem), `medium` (40rem) or `large` (60rem). |
| `open` | `boolean` | `false` | Whether it is open. Reflected; setting it opens or closes the dialog (as `show()` and `close()`). |
| `persistent` | `boolean` | `false` | A click on the backdrop does not close it (Escape and Close still do). For forms that would lose typed text. |
| `return-focus` | `string \| HTMLElement \| null` | `null` | Where focus goes on close when the opener is gone: a selector (in the dialog's root, then the document) or an element. |
| `close-label` | `string` | `'Close'` | The Close button's text. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | The content: text, links, a form. |
| `description` | A short description under the heading, read as the dialog's description (instead of the `description` attribute). |

#### CSS parts

| Part | Description |
|---|---|
| `dialog` | The `<dialog>`. |
| `header` | The heading row (the heading and Close). |
| `heading` | The heading. |
| `close` | The Close button. |
| `description` | The description under the heading. |
| `body` | The scrolling wrapper of the content. |

#### CSS states

| State | Description |
|---|---|
| `:state(open)` | The dialog is open. |

#### Events

| Event | Description |
|---|---|
| `uvalib-dialog-open` | The dialog opened: `detail` is `{ reason }`, `button` (a visitor's opener) or `api` (`show()` or `open`). Bubbles and is composed. |
| `uvalib-dialog-close` | The dialog closed: `detail` is `{ reason, returnValue }`, `reason` one of `close-button`, `button` (a `data-uvalib-dialog-close` or invoker close button), `escape`, `backdrop`, `form` (a `<form method="dialog">`), `api` (`close()` or `open = false`) or `removed` (taken out of the page while open). Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-dialog', 'open', '<label>']` when a visitor's button opens it, and `['uvalib-dialog', 'close', '<label>']` when the visitor closes it (Close, a close button, Escape, the backdrop or a dialog form); never on `show()`, `close()` or `open` from script, and never the content. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-dialog-width` |  | The dialog's widest inline size, instead of `size`'s (still never wider than the viewport less 16px on each side). |
| `--uva-color-surface` |  | Dark-mode role token: dialog background (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: dialog text (else `--uva-grey-darkest`, #2b2b2b). |
| `--uva-color-text-muted` |  | Dark-mode role token: the description (else #4b5563, 7.5:1 on white). |
| `--uva-color-border` |  | Dark-mode role token: dialog edge and heading rule (else #dadada). |
| `--uva-color-button-bg` |  | Dark-mode role token: Close's border and text (else `--uva-blue-alt`, #007bac). |
| `--uva-color-button-hover-bg` |  | Dark-mode role token: hovered Close (else `--uva-blue-alt-A`, #005679). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-filter>`

A faceted-search filter: a fieldset of checkboxes (value plus result count), optional toggle chips ("scopes") above them, and "See more" / "See less" buttons when `limit` is set. It is controlled: set `filter`, `value` and `scopeValue` from your search state and listen for the change events. Optional filter-group features, each off by default (without them the markup, events and order are as before): `collapsible` (a caret disclosure button in the legend, with the selected count while collapsed), `searchable` (search within the values), `sortable` (Count \| Name (A–Z)), `clearable` (a Clear button), `apply-button` (stage changes until Apply) and `match` (says how the values combine).

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `filter` | `FilterFacet` | `{ name: '', title: '', position: 0, buckets: [] }` | The facet to show: `{ name, title, position, buckets: [{ key, doc_count, selected }] }`. |
| `value` | `string[]` | `[]` | Selected bucket keys (matched case-insensitively). |
| `scopes` | `FilterScopeOption[]` | `[]` | Optional toggle chips shown under the legend (for example attendee types): `[{ value, label }]`. |
| `scopevalue` | `string[]` | `[]` | Pressed scope values (matched case-insensitively). |
| `scopes-label` | `string` | `''` | Accessible name of the scope chip group. Empty (the default) means `Filter <title> by type`. |
| `limit` | `number` | `0` | Maximum buckets to show at first; 0 shows all. "See more" doubles it, "See less" halves it back. |
| `collapsible` | `boolean` | `false` | The legend becomes a disclosure button (with the library's caret) that shows and hides the group. |
| `collapsed` | `boolean` | `false` | With `collapsible`: the group is closed (its legend button and selected count only). The visitor's toggle updates it; nothing is remembered. |
| `heading-level` | `number` | `0` | Wrap the legend's text (or disclosure button) in a heading of this level, 2 to 6. Unset (the default): no heading, as before. |
| `searchable` | `boolean` | `false` | A search field above the values that narrows them as the visitor types. |
| `search-label` | `string` | `''` | The search field's visible label. Empty (the default) means `Search <title>`. |
| `unit` | `string` | `'values'` | What the values are, plural, for the search status ("12 of 340 subjects"). |
| `sortable` | `boolean` | `false` | A "Sort by: Count \| Name (A–Z)" control. |
| `sort` | `'count' \| 'name'` | `'count'` | The order: `count` (most results first; without `sortable`, the data's own order) or `name` (A–Z). The visitor's choice updates it. |
| `clearable` | `boolean` | `false` | A Clear button, shown while something in the group is selected. |
| `apply-button` | `boolean` | `false` | Stage checkbox changes until the visitor presses Apply (with Reset back to the applied state); `filter-change` fires on Apply only. |
| `match` | `'any' \| 'all' \| undefined` |  | Say how the selected values combine, under the legend: `any` ("Matches any selected value") or `all`. Unset: no text. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `see-more` | The "See more" button (shadow mode). |
| `see-less` | The "See less" button (shadow mode). |
| `toggle` | The disclosure button in the legend (`collapsible`). |
| `search` | The search-within field (`searchable`). |
| `clear` | The Clear button (`clearable`). |
| `apply` | The Apply button (`apply-button`). |
| `reset` | The Reset button (`apply-button`). |

#### Events

| Event | Description |
|---|---|
| `filter-change` | A checkbox was toggled, Clear was pressed, or (with `apply-button`) Apply was pressed. `detail` is `{ name, value }`: the facet name and the new array of selected keys (`[]` after Clear). Does not bubble. |
| `scope-change` | A scope chip was toggled. `detail` is `{ value }`: the new array of pressed scope values. Does not bubble. |
| `toggle` | With `collapsible`: the visitor opened or closed the group. `detail` is `{ open }`. Does not bubble. |
| `sort` | With `sortable`: the visitor chose a sort. `detail` is `{ sort }` (`count` or `name`). Does not bubble. |
| `uvalib-analytics-event` | For `<site-analytics>`, on the visitor's changes only: `['uvalib-filter', 'facet-change', '<title>: <value>', 1 \| 0]` (checked or unchecked; with `apply-button`, one per value when Apply is pressed), `['uvalib-filter', 'scope-change', <scope label>, 1 \| 0]` (pressed or not), `['uvalib-filter', 'see-more' \| 'see-less', <title>]`, `['uvalib-filter', 'toggle', <title>, 1 \| 0]` (opened or closed), `['uvalib-filter', 'sort', '<title>: count' \| '<title>: name']`, `['uvalib-filter', 'clear', <title>, <number cleared>]`, `['uvalib-filter', 'apply', <title>, <number of changes>]` and `['uvalib-filter', 'search', <title>, <number of matches>]` once a search-within settles (never the typed text). Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Scope chip text, hover border and pressed background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |
| `--uva-color-border` |  | Dark-mode role token: divider under the scope chips (else #e5e7eb). |
| `--uva-color-control-border` |  | Dark-mode role token: scope chip, search field, sort and button borders (else `--uva-grey`, #808080). |
| `--uva-color-surface-raised` |  | Dark-mode role token: scope chip, search field, sort and button background (else #fff). |
| `--uva-color-link` |  | Dark-mode role token: scope chip and button text, the caret, hover border (else `--uva-brand-blue`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: pressed chip, current sort and Apply background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: pressed chip, current sort and Apply text (else #fff). |
| `--uva-color-text-muted` |  | Dark-mode role token: the match text, selected count, search status and staged note (else #4f4f4f). |
| `--uva-color-input-text` |  | Dark-mode role token: search field text (else #1f2937). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-filter-drawer>`

A search page's form and filters: a plain sidebar on wide screens, and on narrow ones a “Search and filters” button that opens them in a modal panel from the side. Put the page's search form, `<uvalib-filter>`s and other facets inside. Above `breakpoint` (default `48rem`) they are shown as written: no button, no dialog role. At and below it only the button is shown; it opens a native `<dialog>` (`showModal()`) with a visible heading (the `label`) and a 44px Close button, which takes focus. Escape, Close and a click on the backdrop close it, and focus returns to the button; widening the window past the breakpoint closes it and keeps focus where it was. While it is open the rest of the page, including `<site-page>`'s header, skip link and alerts, is inert (the browser's modal dialog), so focus cannot leave it except to the browser itself, and nothing else is announced. The children are the same nodes in both layouts (moved, never re-created): typed text, checked boxes, listeners and each filter's state are kept. Inert content is not announced, so results counts and status notices outside the panel would go silent while the visitor filters: name them in `live` (space-separated ids) and the drawer repeats what they announce in its own polite live region while it is open. `count` (the page's number of active filters) is shown on the button when above 0. The drawer never counts by itself: only the page knows which inputs are filters. Pages can style the runtime layout with `:state(modal)` (at or below the breakpoint: the button and panel) and `:state(open)` (the panel is open).

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` |  | `DEFAULT_LABEL` | The button's text, the panel's heading and the dialog's name. |
| `breakpoint` |  | `DEFAULT_BREAKPOINT` | The widest viewport that gets the button and panel (`48rem`, `768px`); wider gets the sidebar. |
| `count` | `number` | `0` | Active filters, set by the page; shown on the button when above 0. |
| `live` | `string` | `''` | Space-separated ids of live regions outside the drawer (a results count, a status notice) to keep announcing while the panel is open. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | The search form and filters. Shown as the sidebar on wide screens and inside the panel on narrow ones. |

#### CSS parts

| Part | Description |
|---|---|
| `toggle` | The “Search and filters” button (narrow screens only). |
| `count` | The number of active filters on the button. |
| `sidebar` | The wrapper of the children on wide screens. |
| `dialog` | The `<dialog>` panel. |
| `header` | The panel's heading row. |
| `heading` | The panel's heading. |
| `close` | The Close button. |
| `body` | The wrapper of the children, in the sidebar or the panel. |

#### CSS states

| State | Description |
|---|---|
| `:state(modal)` | The viewport is at or below the breakpoint: the button and panel, not the sidebar. |
| `:state(open)` | The panel is open. |

#### Events

| Event | Description |
|---|---|
| `close` | The panel closed (Close, Escape, the backdrop, `close()`, or the window widening past the breakpoint). Does not bubble. |
| `open` | The panel opened. Does not bubble. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-filter-drawer', 'open', '<label>']` when the visitor opens the panel, and `['uvalib-filter-drawer', 'close', '<label>']` when they close it (Close, Escape or the backdrop; not when the window widens or a script closes it). Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-filter-drawer-width` | `min(24rem, 100% - 3rem)` | The panel's width. |
| `--uva-color-surface` |  | Dark-mode role token: panel background (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: panel text (else #2b2b2b). |
| `--uva-color-border` |  | Dark-mode role token: panel edge and heading rule (else #dadada). |
| `--uva-color-button-bg` |  | Dark-mode role token: button border and text, the count's background (else `--uva-blue-alt`, #007bac). |
| `--uva-color-button-hover-bg` |  | Dark-mode role token: hovered button (else `--uva-blue-alt-A`, #005679). |
| `--uva-color-button-text` |  | Dark-mode role token: the count's text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-image-regions>`

An image with numbered region outlines (people, objects, inscriptions) and a list of the same regions beside it (under it on a narrow screen). The list is the way in: the outlines are a visual aid, hidden from assistive technology and not in the tab order, so no region is a second tab stop. Hovering or focusing a list entry (or anything in it) highlights its region with a thicker double outline and its label, and dims the others; hovering a region highlights its entry. Clicking a region moves focus to its entry. The image: an `<img>` (or `<picture>`) child, which keeps its `alt`, or `src` and `alt`. Give it `width` and `height` so its space is reserved before it loads. The regions: an `<ol>` child whose `<li>` items carry `data-xywh` (IIIF / Media Fragments: `percent:10,20,30,40`, or pixels `160,120,320,240` of the image's natural size). The list is shown as written, so it works before the component loads or without JavaScript, and any links and buttons in it stay the page's own (their events are the page's). Or set the `items` property, and the component draws the list. Region numbers are the list's numbers, from 1 (or the `<ol>`'s `start`).

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | `''` | Image URL, when there is no `<img>` child. |
| `alt` | `string` | `''` | The image's alternative text (with `src`). |
| `width` | `number \| undefined` |  | The image's width (with `src`), reserving its space. |
| `height` | `number \| undefined` |  | The image's height (with `src`). |
| `image-width` | `number \| undefined` |  | The size pixel regions are measured in, when it is not the image's natural size (for example a IIIF derivative of a larger original: the original's width and height). |
| `image-height` | `number \| undefined` |  | The height pixel regions are measured in (with `image-width`). |
| `label` | `string` | `'Regions'` | The list's heading, and the analytics name. |
| `heading-level` | `number \| undefined` |  | The heading's level (2 to 6). Default: one below the heading before the element. |
| `numbering` | `'numbers' \| 'none'` | `'numbers'` | `numbers` (default) shows each region's number on its outline; `none` hides them. |
| `hide-outlines` | `boolean` | `false` | Hide the outlines (the list stays). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | The region list (`<ol>` with `<li data-xywh>`), shown as written. Not used with `items`. |
| `image` | The image. A first `<img>` or `<picture>` child is put here by itself. |
| `controls` | Controls for the image (a lightbox's version comparison), under the image and before the list in reading order. Not covered by the outlines. |

#### CSS parts

| Part | Description |
|---|---|
| `layout` | The grid holding the image and the list. |
| `media` | The image and its overlay. |
| `overlay` | The outlines over the image (`aria-hidden`). |
| `region` | One outline. |
| `list` | The heading and the list. |

#### Events

| Event | Description |
|---|---|
| `highlight` | The highlighted region changed by hover or focus: `detail` is `{ item, index }` (`item` null and `index` -1 when none is). Bubbles and is composed. |
| `uvalib-image-regions-activate` | A region's outline was clicked, before its list entry takes focus: `detail` is `{ index, item, entry }` (`index` from 0; `item` the region's record; `entry` the page's own `<li>`, from its child list or a lightbox's lent list, or null when this element drew the list from `items`). Cancelable: `preventDefault()` keeps the entry from taking focus, so the page can focus its own control in it instead (a "Who is this?" field). Bubbles and is composed. |
| `select` | A region's outline was clicked, after its entry took focus (or the page took the activate over): `detail` is `{ item, index, entry }`. Bubbles and is composed. Prefer `uvalib-image-regions-activate`: `select` is also the name of the native text-selection event. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-image-regions', 'select', '<label>', <number>]` when an outline is clicked (the list's `label`, and the region's number from 1). Never a region's label (it may be a person's name). Nothing on hover or focus. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else `--uva-grey-darkest`). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the highlighted entry's tint (else #f1f1f1). |
| `--uva-color-link` |  | Dark-mode role token: entry links (else `--uva-brand-blue`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-text-muted` |  | Dark-mode role token: descriptions (else #4b5563). |
| `--uvalib-image-regions-inset` |  | Where the outlines sit inside the image slot (an `inset` value, default 0): set by `<uvalib-lightbox>` when the slot holds versions with a wider framing, so the outlines stay on the original. |

### `<uvalib-lightbox>`

An accessible image viewer over a set of plain links. With JavaScript a primary click opens a modal dialog; without it (or with a modified click) the link opens the image as before. Wrap the links, or point at them with `selector` (for example `a.pb-image` on a reading page). There is no autoplay and no carousel. The dialog is labelled by the caption (`data-caption`, else the image alt, else the link text). Focus moves to Close on open and back to the trigger on close. Escape and a click on the backdrop close it. With more than one image, Previous and Next and the arrow keys move through the set (wrapping), and a polite “3 of 13” counter is shown. Full size opens the original image in a new tab. A IIIF Image API URL keeps its region; only the size becomes `!W,H` for the viewport. TIFF and JPEG2000 URLs are left as written. `url-param` (for example `photo`) keeps `?photo=<id>` in sync, including on a hash route (`#/text?photo=<id>`): opening pushes a history entry, stepping replaces it, and Back closes. Optional details: children with `slot="details"` (and `data-for` equal to the item's id or its position from 1; without `data-for` they show for every image), or `data-details-id` on a link pointing at an element elsewhere on the page. Either is shown inside the dialog and put back exactly (same place, `hidden` and `slot`) when the viewer moves on or closes. The `data-details-id` element stays in the page (in shadow mode it becomes a child of the lightbox slotted into the dialog), so `getElementById`, the page's CSS (except selectors through its old ancestors) and listeners keep working; nothing is cloned. Details that appear while their image is open (rendered after a fetch) are shown then. `open(idOrIndex)` and `close({ focus })` let the page open or close the viewer itself; `uvalib-lightbox-open` and `uvalib-lightbox-close` say when it did. Optional regions (people, objects, inscriptions): `data-regions` on a link, a JSON array of `{ label, x, y, w, h, unit? }` or `xywh` values each followed by its label, separated by `;` (`percent:10,20,30,40 Person 1; percent:55,15,20,30 Sign`), or the `regions` callback. The open image then shows numbered outlines (`<uvalib-image-regions>`, loaded on first use) and a list of the regions beside it, with a "Show regions" toggle (`aria-pressed`) that hides the outlines. Pixel regions are measured in `data-image-width` × `data-image-height` when set (the viewer shows a resized IIIF image), else in the image's natural size. Or the page's own list, with its own buttons: `data-regions-list="<id>"` on a link (or the `regionsList` callback) names an `<ol>` or `<ul>` of `<li data-xywh>` anywhere in the page, usually `hidden`. While that image is open the list (the same nodes, so the page's listeners keep working) is the region list: in shadow mode it becomes a child of the lightbox slotted into the viewer, not moved into the shadow root, so the page's CSS still applies to it. When the image changes or the viewer closes it goes back where it was, `hidden` as before. It wins over `data-regions`. Optional versions of an image (an original scan and an AI colorization, a restoration, an infrared capture): `data-versions` on a link, a JSON array of `{ label, href?, note? }` whose first entry is the link's own image, or the `versions` callback. The viewer then compares them over the photo (loaded on first use): Switch (a segmented control), Reveal (a divider: click or tap the photo, or use the slider) or Fade (a slider), `compare` choosing the first. A version's `note` shows under the photo while it is visible, and the image's accessible name ends with the label of the version shown. `version-param` (with `url-param`) keeps the comparison in the address: `?version=2` (Switch, the version from 0), `?version=wipe:40` or `?version=fade:60` (the percentage of the other version shown; `wipe:40:2` compares the original with version 2). `data-version` on a link (the same values) opens that image on that version, from a click, `open()` or Previous and Next; an address with `version-param` wins. A version with a different framing (an AI-expanded frame, a crop, the whole plate) gives `frame`, the original's box in it (`percent:x,y,w,h`, or pixels of its `width` × `height`): the viewer draws every version at the original's scale in one box, the original lined up, and regions stay on it. Pages can style the element while the viewer is open with `:state(open)`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `selector` | `string` | `''` | CSS selector for image links elsewhere in this root (the page, or the shadow root the component sits in). Combined with any links inside the component. Example: `a.pb-image`. |
| `url-param` | `string` | `''` | Query parameter kept in sync with the open image, for example `photo` → `?photo=<id>`. The id is the link's `data-id`, else its `id`, else the IIIF identifier, else its position from 1. On a hash route the parameter is written inside the hash. Empty: no deep link. |
| `regions-label` | `string` | `'Regions'` | The heading of the regions list (for example `People`). |
| `compare` | `'switch' \| 'wipe' \| 'fade'` | `'switch'` | How an image's versions are compared first: `switch` (default: one at a time, any number of versions), `wipe` (a divider over the photo) or `fade` (a cross-fade). The viewer offers the others. |
| `version-param` | `string` | `''` | Query parameter for the comparison (with `url-param`), for example `version`: `?version=1`, `?version=wipe:40`, `?version=fade:60`. Written with replaceState once the visitor's change settles; read when the viewer opens from the address. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | The image links. A plain click opens the viewer; without JavaScript they open the image. |
| `details` | Details for the open image. `data-for` selects one item by its id or position (from 1); without it the details show for every image. |

#### CSS parts

| Part | Description |
|---|---|
| `dialog` | The modal dialog. |
| `panel` | The surface inside the dialog. |
| `caption` | The caption that names the dialog. |
| `image` | The image. |
| `controls` | Previous, Next, the counter and Full size. |
| `details` | The details panel. |
| `regions` | The `<uvalib-image-regions>` around an image with regions. |
| `compare` | The version comparison controls and notes under the photo. |

#### CSS states

| State | Description |
|---|---|
| `:state(open)` | The viewer is open. |

#### Events

| Event | Description |
|---|---|
|  |  |
| `uvalib-lightbox-open` | The viewer opened (a click, `open()`, or restored from the address): `detail` is `{ id, index, restored }` (`index` from 0; `restored` true for the address, Back and Forward). Not fired when it moves to another image. Bubbles and is composed. |
| `uvalib-lightbox-close` | The viewer closed: `detail` is `{ id, index, reason }`, the image shown and `reason` `close` (Close, Escape, the backdrop), `api` (`close()`), `history` (Back or Forward) or `empty` (the last image left the page). Not fired when the element is removed. Bubbles and is composed. |
| `uvalib-lightbox-version` | The visitor changed the comparison (mode, version or position; once a slider settles): `detail` is `{ id, mode, index, value }` (`mode` `switch`, `wipe` or `fade`; `index` the version shown or compared, from 0; `value` the percentage of it shown, null for Switch). Not fired on open or for a comparison restored from the URL. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-lightbox', 'open'\|'next'\|'previous'\|'full-size', 'image N', N]` (N from 1, the image's place in the set), and `['uvalib-lightbox', 'compare', 'switch'\|'wipe'\|'fade', N]` when the visitor changes a comparison (N the version's place from 1; once a slider settles). Never the URL, the caption or a version's label. Not fired for a viewer restored from the URL or from Back and Forward. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-surface-raised` |  | Dark-mode role token: dialog surface (else `--uva-color-surface`, else #fff). |
| `--uva-color-surface` |  | Dark-mode role token: the figure behind the image (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: text (else `--uva-grey-darkest`). |
| `--uva-color-shadow` |  | Dark-mode role token: the backdrop scrim (else rgba(16, 23, 43, 0.72)). |
| `--uva-color-border` |  | Dark-mode role token: dialog border (else `--uva-grey-100`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-link` |  | Dark-mode role token: Full size text when it is not the filled control (else `--uva-brand-blue`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: Close and Full size background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Text on those controls (else #fff). |
| `--uva-brand-orange` | `#e57200` | Focus ring when `--uva-color-focus` is unset. |
| `--uva-brand-blue` | `#232d4b` | Control background when `--uva-color-accent-bg` is unset. |
| `--uva-grey-darkest` | `#2b2b2b` | Text when `--uva-color-text` is unset. |
| `--uva-grey-100` | `#dadada` | Border when `--uva-color-border` is unset. |

### `<uvalib-list-filter>`

A text field that filters a long list on the page as you type: a collection's 473 texts, a staff directory, a table of databases. The list is the page's own markup and stays fully visible without the script. `for` is the id of the list: any element whose children are the items (a `<ul>` or `<ol>`, a `<dl>` of `<div>` rows, a grid of cards; for a `<table>`, the rows of its bodies). `selector` picks the items instead (inside `for` when both are set, else in the page). An item matches when every word typed appears in its `data-filter-text`, or else its text, in any order, ignoring case and accents (“eneide” finds “Énéide”). Items that do not match get the `hidden` attribute (kept hidden whatever `display` the page gives them); clearing the field shows them all again. Thousands of items filter at once on every keystroke: the text is read once, and only items whose state changes are touched. Groups: give each group's wrapper `data-filter-group` (a `<section>` with its heading and its list) and point `selector` at the items; a group whose items are all hidden is hidden too, heading and all. The visible `label` (default “Filter”; `hide-label` hides it visually) names the field, and a Clear button (“Clear <label>”, 44px, shown only with text) or Escape empties it, keeping focus in the field. Under the field a count follows at once (“Showing 12 of 473 texts”; `noun`, plural, and `singular` name the items), and a polite status announces it once the typing settles (a second after the last keystroke), never on every key or at load. When nothing matches, a message says “No texts match “…”.” To put the count elsewhere, point `results-count` at a `<uvalib-results-count>` (give it `total` and `noun` in the markup): the element then sets its `shown` and `total` and leaves the count and announcement to it. With `query-param` (bare: `filter`) the filter is read from that URL parameter at start and written back with `history.replaceState` as you type, so a filtered list can be shared and Back returns to it. The list's content is read once; call `refresh()` after changing an item's text in script (added or removed items and `data-filter-text` changes are noticed). Before it upgrades, `base.css` holds the label, field and count's height, so nothing moves.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `for` | `string` | `''` | The id of the list whose children are the items (for a table, its body rows). |
| `selector` | `string` | `''` | A CSS selector for the items, inside `for` when it is set, else in the page. |
| `label` | `string` | `'Filter'` | The field's visible label and accessible name. |
| `hide-label` | `boolean` | `false` | Hide the label visually (it still names the field), when a heading beside it says it. |
| `placeholder` | `string` | `''` | Placeholder text in the empty field, such as “Title or author”. |
| `noun` | `string` | `'items'` | What the items are, plural: “items” by default. |
| `singular` | `string` | `''` | What one item is. Default: “item” when `noun` is unset, else `noun`. |
| `results-count` | `string` | `''` | The id of a `<uvalib-results-count>` to drive instead of the element's own count. |
| `query-param` | `string \| null` | `null` | The URL parameter to read the filter from and write it to; a bare attribute uses `filter`. Off by default. |
| `value` | `string` | `''` | The text in the field. Setting it filters the list (not reported to analytics). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `label` | The visible label. |
| `field` | The box around the field and its clear button. |
| `input` | The text field. |
| `clear` | The clear button. |
| `count` | The visible count under the field. |
| `empty` | The “No … match” message. |

#### Events

| Event | Description |
|---|---|
| `uvalib-list-filter-change` | The filter was applied with a new query (typing, Clear, Escape, `value` set in script, the URL at start, Back and Forward). `detail` is `{ query, shown, total }`. Not fired at load without a query. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`, on the visitor's actions only: `['uvalib-list-filter', 'filter', '', <shown>]` once the typing settles on a new query, and `['uvalib-list-filter', 'clear']` when the visitor empties the field. Never the typed text. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-surface-raised` |  | Dark-mode role token: field background (else #fff). |
| `--uva-color-control-border` |  | Dark-mode role token: field border (else `--uva-grey`, #808080). |
| `--uva-color-input-text` |  | Dark-mode role token: field text (else #2b2b2b). |
| `--uva-color-text` |  | Dark-mode role token: label text (else #2b2b2b). |
| `--uva-color-text-muted` |  | Dark-mode role token: placeholder, count and the clear icon (else #4f4f4f). |
| `--uva-color-alert-info-bg` |  | Dark-mode role token: the no-match message background. |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-map>`

A map of places with a linked list of the same places: buildings, rooms or outdoor spaces, each a marker sized by a count, with a link to the place's page. It wraps [Leaflet](https://leafletjs.com) 1.9, which the page provides (the library never bundles it): set the `leaflet` property to the Leaflet module (`import * as L from 'leaflet'`), or load leaflet.js so that `window.L` exists. Without Leaflet only the list is shown, with one console warning. Leaflet's leaflet.css is optional: the element carries the layout rules it needs, in shadow DOM and light DOM alike. Places come from `items` (`{ id?, name, lat, lng, count?, href?, description? }`) or from a child `<ul>`/`<ol>` of `<li><a href data-lat data-lng data-count>Name</a></li>`, which is the list before the script runs (and without it). The list always stays, under the map: it is the text equivalent. Each marker is a real link (a button when the place has no `href`) named like "The Rotunda, 2,702 photos" (`count-label` is the noun), sized by the square root of its count (a 24 to 56px dot in a hit area of at least 44px). Tab or the arrow keys move between markers, Enter follows the link (or chooses the place), and Escape hides the tooltip. Hovering or focusing a marker shows a tooltip with its name and count and highlights its list entry; hovering or focusing a list entry highlights its marker (a ring and a larger dot, not colour alone) and brings it into view. Markers whose 44px targets would overlap at the current zoom are drawn as one group marker (regrouped after every zoom and resize): a button showing how many places it holds, sized by their summed count and named like "The Rotunda and 2 more places, 3,610 photos" (the largest place's name; `place-label` is the noun). Choosing it zooms in until its places part; when they cannot (one point, or the maximum zoom) it spreads them in a ring around it instead, with focus on the first; Escape or a zoom closes the ring and focus returns to the group. The arrow keys move between the markers shown (a group is one); a place in the list that is in a group highlights the group, whose tooltip names the place. The map is a region named by `label`, after a "Skip map, go to the list" link and a line of key instructions. It opens on the bounds of the places, or on `center` and `zoom`. The zoom buttons are 44px with a visible focus ring; the attribution stays. Tiles come from `tile-url` (OpenStreetMap by default: low-traffic use only) with `attribution`. In the page's dark mode the tiles are inverted with a CSS filter (`--uvalib-map-dark-filter`) unless `dark-tile-url` gives dark tiles; markers and controls are never filtered. With `prefers-reduced-motion` nothing animates.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `items` | `MapItem[]` | `[]` | The places. When non-empty, wins over the child list. Set a new array to update. |
| `label` | `string` | `''` | The map's name (required): the region's label, the list's label and the analytics name. |
| `count-label` | `string` | `'items'` | The noun after each count, plural ("photos"); a count of one drops a trailing s. |
| `place-label` | `string` | `'places'` | The noun for places in a group's name, plural: "The Rotunda and 2 more places" (one drops a trailing s: "and 1 more place"). For example "rooms". |
| `tile-url` |  | `OSM_TILE_URL` | The tile URL template (`{z}/{x}/{y}`, optionally `{s}` and `{r}`). |
| `dark-tile-url` | `string` | `''` | Tiles for the page's dark mode. Without it, dark mode filters the light tiles instead. |
| `attribution` |  | `OSM_ATTRIBUTION` | The tiles' attribution, as HTML. Required by most tile sources; always shown. |
| `center` | `string` | `''` | Where the map opens, `"lat,lng"`. Without it the map fits every place. |
| `zoom` | `number \| undefined` |  | The opening zoom level (with `center`, or centred on the places). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | A `<ul>` or `<ol>` of places: each `<li>` holds an `<a href>` (or the `<li>` itself) with `data-lat`, `data-lng` and optionally `data-count`, `data-id` and `data-description`. Used when `items` is empty; without JavaScript it is the list. |

#### CSS parts

| Part | Description |
|---|---|
| `map` | The map region (the Leaflet container). |
| `instructions` | The line of key instructions above the map. |
| `list` | The list of places. |
| `place` | Each list entry. |

#### Events

| Event | Description |
|---|---|
| `select` | A place's marker was chosen (click, Enter or Space); never a group's. `detail` is `{ item }`. Cancelable: for a place with `href`, `preventDefault()` keeps the page from following the link. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-map', 'select', '<label>', <position from 1>]` when a place's marker is chosen, `['uvalib-map', 'expand', '<label>', <places in it>]` when a group is chosen (it zooms in or opens its ring), and `['uvalib-map', 'zoom', '<label>', <zoom level>]` 1 s after the last zoom-button press. Never a place's name, coordinates or URL. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-map-height` | `min(24rem, 75vw)` | Height of the map. |
| `--uvalib-map-dark-filter` | `invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)` | The filter on the tiles in dark mode, when there is no `dark-tile-url`. |
| `--uva-brand-blue` | `#232d4b` | Marker fill. |
| `--uva-brand-orange` | `#e57200` | Focus ring when `--uva-color-focus` is unset. |
| `--uva-font-family` | `inherit` | Font family. |
| `--uva-color-accent-bg` |  | Dark-mode role token: marker fill (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: marker border (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: text and the highlight ring (else #2b2b2b). |
| `--uva-color-text-muted` |  | Dark-mode role token: instructions and descriptions (else #4b5563). |
| `--uva-color-link` |  | Dark-mode role token: links (else `--uva-brand-blue`). |
| `--uva-color-surface` |  | Dark-mode role token: attribution background and the highlight ring's gap (else #fff). |
| `--uva-color-surface-raised` |  | Dark-mode role token: zoom buttons, tooltip and list entries (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: hovered zoom button (else #dadada). |
| `--uva-color-track` |  | Dark-mode role token: the map before tiles load, and count badges (else #e5e7eb). |
| `--uva-color-control-border` |  | Dark-mode role token: borders (else #808080). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-shadow` |  | Dark-mode role token: control and tooltip shadow. |

### `<uvalib-metadata>`

A record's details as a description list, as on the library's digital collections: label and value side by side on wide screens (the element's own width, 36rem and up), stacked on narrow ones. Values may be text, links or lists (subjects). Give the rows as a `<dl>` child (so the page reads the same before the script loads): `<dt>` labels and `<dd>` values, optionally wrapped in a `<div>` per row; several `<dd>` after one `<dt>` are several values. The values are copied as written (links, lists, `download` attributes kept); a link with `data-size="184 KB"` is shown as a download, "EPUB · 184 KB". The list follows changes to the children. Apps set the `items` property instead (`{ label, value }`, winning over the children while set). Built-in rows for credit and rights (as Special Collections asks): `creator` and `organization` come first; `rights` (a rightsstatements.org or Creative Commons URL, shown as its short name linked to it, or plain text) and `citation` ("How to cite", with a Copy citation button that announces "Copied" politely) come last. `citation-title` builds the Special Collections citation, "<title>, Albert and Shirley Small Special Collections Library, University of Virginia". Long lists: `list-limit="8"` shortens every value that is a list (a `<ul>`/`<ol>` in the `<dd>`) of more than 8 items to its first 8 and a “Show all 34 participants” button (`aria-expanded`, `aria-controls`) that reveals the rest in place and moves focus to the first one; it then reads “Show fewer”. `data-limit` on a `<dd>` or its list sets that row's own limit (`0`: none); the noun is the label with a lowercase first letter, or `data-limit-label`. Every value stays in the markup (the hidden ones `hidden`).

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `creator` | `string \| undefined` |  | The creator (author, photographer…), shown first. |
| `organization` | `string \| undefined` |  | The organization holding or crediting the item, shown after the creator. |
| `rights` | `string \| undefined` |  | The rights statement: a rightsstatements.org or Creative Commons URL (shown as its short name, linked), another http(s) URL (shown as `rights-label`, or "Rights statement"), or plain text. |
| `rights-label` | `string \| undefined` |  | The link text for a `rights` URL, instead of its short name. |
| `rights-info` | `string \| undefined` |  | A "More about rights and permissions" link under the statement, such as `https://www.library.virginia.edu/policies/use-of-materials`. |
| `citation` | `string \| undefined` |  | "How to cite": the citation, as written. Wins over `citation-title`. |
| `citation-title` | `string \| undefined` |  | A title or collection name for the Special Collections citation: "<title>, Albert and Shirley Small Special Collections Library, University of Virginia". |
| `list-limit` | `number \| undefined` |  | Shorten every list value of more than this many items to its first ones and a “Show all N” button. Zero or empty shows every item. A row's `data-limit` wins. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: the Copy citation button, `['uvalib-metadata', 'copy-citation']`, and a list's toggle, `['uvalib-metadata', 'show-all'\|'show-fewer', 'row N']` (N from 1, the row's place in the list; never its label or values). Downloads are left to Matomo's own download tracking. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Value colour. |
| `--uva-color-utility-link` |  | Dark-mode role token: link colour (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: value colour (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: label and status colour (else #4b5563). |
| `--uva-color-border` |  | Dark-mode role token: row dividers (else #dadada). |
| `--uva-color-link` |  | Dark-mode role token: the buttons' text and the Copy citation button's border (else `--uva-brand-blue`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: the button's background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<uvalib-pagefind-search>`

Pagefind's default search UI (`PagefindUI`, from the site's own Pagefind bundle) with the library's defaults and the accessibility fixes that need script. Use it with pagefind.css, in place of Pagefind's pagefind-ui.css. It renders in light DOM, so the page's styles reach Pagefind's markup. It loads `<bundle-path>pagefind-ui.js` unless `window.PagefindUI` already exists. What it adds to the stock UI: a visible `<label>` for the field (the stock field is named only by its title); a polite status region that announces the result count ("12 results for virginia") once results settle (the stock message is not a live region); focus kept in the field after Clear or Escape (the stock UI blurs it, dropping focus to the page) and moved to the first new result after "Load more results"; the loading placeholders' dots hidden from screen readers; `?q=` read at start (and on Back and Forward) and the settled query written back with `history.replaceState`, so a search can be shared; with `filter-params`, the named Pagefind filters read from and written to the URL the same way; and reports to `<site-analytics>`. While a search from the URL loads, it can hold the page still (issue #37): with `searching` set in the page's HTML when the URL has a query, the element holds a screen's height from first paint, and placeholder results (aria-hidden) stand in for Pagefind's until they, or "no results", are drawn; the element then still reaches the bottom of the window until the visitor uses the search, so a short list does not pull the footer up. It does the same on Back and Forward to a new query. The `ui` property is the `PagefindUI` instance (for `triggerFilters`), and `ready` resolves with it. Attributes are read once, when the element is first connected.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `bundle-path` | `string` | `/pagefind/` | The Pagefind bundle's URL path, ending in `/`. |
| `merge-index` | `string` |  | JSON array of more indexes to search together: `[{"bundlePath": "/pagefind/s1/"}]`. |
| `page-size` | `number` | `10` | Results shown before "Load more results". |
| `excerpt-length` | `number` |  | Words per excerpt (Pagefind's default: 30, or 12 with sub-results). |
| `show-sub-results` | `boolean` |  | Also list the matching sections of each page. |
| `show-images` | `boolean` |  | Show each result's `image` metadata (off by default). |
| `placeholder` | `string` | `Search` | The field's placeholder. |
| `label` | `string` |  | The field's visible label. Empty (the default) uses the placeholder. |
| `label-hidden` | `boolean` |  | Keep the label for screen readers only. |
| `translations` | `string` |  | JSON of Pagefind UI strings to override (`{"zero_results": "…"}`). |
| `options` | `string` |  | JSON of any other `PagefindUI` options (`{"openFilters": ["author"]}`), applied last. |
| `query-param` | `string` | `q` | The URL parameter that holds the query; empty turns it off. |
| `searching` | `boolean` |  | Set it in the page's HTML when the URL has a query (server-side, or with a one-line inline script after the element): from first paint, before any script loads, it holds a screen's height for the results, and placeholder results show until they are drawn. The element removes it then (and at start without a query), and sets it itself on Back and Forward to a new query. |
| `no-skeleton` | `boolean` |  | Never hold space or show placeholder results (`searching` is ignored). |
| `filter-params` | `string` |  | Space-separated Pagefind filter names read from and written to URL parameters of the same name (`collection author`: `?collection=A&collection=B`). URL filters are applied with the query as one search, their filter groups open; values not in the index are ignored. Empty (the default) turns it off. |

#### Events

| Event | Description |
|---|---|
| `search-results` | Results settled: `detail` is `{ query, count }`; `{ query: '', count: 0 }` when the field is emptied after a search. Does not bubble. |
| `uvalib-analytics-search` | For `<site-analytics>`: the settled query, category `Pagefind` and its result count, once per query and filter set. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-pagefind-search', 'filter-change', '<filter>: <value>', 1 \| 0]` (checked or unchecked), and `['uvalib-pagefind-search', 'error', 'load']` if Pagefind cannot be loaded. Bubbles and is composed. |

### `<uvalib-pager>`

Previous/next section links, as on a reading page, or a numbered page list. Previous/next: set `prev-href` and `next-href` (either may be omitted). Each link shows a “Previous” or “Next” kicker and, when `prev-label` or `next-label` is set, that title. A visually hidden “: ” sits between them, so the accessible name is punctuated even when CSS is off. A long title truncates visually; the full text stays in the accessible name. The links use `rel="prev"` and `rel="next"`. With neither href, nothing is rendered. Numbered pages: set `pages` (a positive count). `page` is the current page, clamped to `1…pages`. Each link’s href comes from `href-template`, which must contain `{page}` (the default is `?page={page}`). The current page is text with `aria-current="page"`, not a link. Long ranges collapse to the first page, a window around the current page, the last page, and an ellipsis where numbers are skipped. `pages` wins when previous/next attributes are also set, with one console warning. Load more: `mode="load-more"` shows a “Load more” button and “Showing N of M” (`shown` of `total`), or “Showing N” when `total` is unset or 0 (ranked search often cannot know it). It wins over numbered pages and previous/next, with one warning when those are also set. The button is not a link and the control is a group, not a navigation landmark. Once `has-more` has been set (the attribute, or the `hasMore` property), it alone decides whether the button shows: present (or `hasMore = true`) shows it; removed, `has-more="false"` or `hasMore = false` hides it. Left unset, the button hides once `shown` has reached a positive `total`, and stays with no total. `page` is the last loaded page (default 1). A click fires `load-more` with `{ page }` set to the next page and reports `['uvalib-pager', 'load-more', '', page]`. Nothing is reported on render. Call `loaded(firstNewElement)`, or set `for` to a list id and call `loaded()`, and focus moves to that new item. The landmark’s accessible name is `label`, or “Sections” for previous/next and “Pagination” for numbered pages. Load more uses `label` or “More results”. An empty `label` uses that default. Two pagers on one page need different labels: a repeated landmark name fails the accessibility check.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `prev-href` | `string \| undefined` |  | Href of the previous section. Omitted, that side is not shown. |
| `prev-label` | `string \| undefined` |  | Title of the previous section, under the “Previous” kicker. |
| `next-href` | `string \| undefined` |  | Href of the next section. Omitted, that side is not shown. |
| `next-label` | `string \| undefined` |  | Title of the next section, under the “Next” kicker. |
| `mode` | `string \| undefined` |  | `load-more` shows a Load more button instead of previous/next or numbered pages. Any other value, including empty, leaves the pager in its other modes. |
| `shown` | `number \| undefined` |  | How many results are already shown. Used by `mode="load-more"` as N in “Showing N of M”. |
| `total` | `number \| undefined` |  | How many results there are. Used by `mode="load-more"` as M in “Showing N of M”. Unset or 0 (an unknown total), the count reads “Showing N”. |
| `has-more` | `boolean \| undefined` |  | Whether `mode="load-more"` has more to load, for when `total` is not known. Unset (the default), the button follows `total`. Set, it decides: the attribute present means true; removing it, `has-more="false"` or `hasMore = false` means false. `hasMore = undefined` returns to following `total`. |
| `for` | `string \| undefined` |  | Id of the list Load more appends to. `loaded()` focuses the first child added after the click. Ignored when `loaded` is passed an element. |
| `page` | `number \| undefined` |  | Current page, from 1. Clamped to `pages`. Used when `pages` is set. In load-more, the last loaded page (default 1); a click asks for the next one. |
| `pages` | `number \| undefined` |  | How many pages. A positive number selects numbered pages and ignores previous/next. Zero, negative or non-numeric does not. |
| `href-template` | `string \| undefined` |  | Href of each numbered page, with `{page}` where the number goes. Default `?page={page}` when omitted. Without `{page}`, numbered links are not made. |
| `label` | `string \| undefined` |  | Accessible name of the navigation landmark. Default “Pagination” for numbered pages and “Sections” for previous/next. Empty uses that default. A second pager on the page needs its own name. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `load-more` | A primary click on Load more: `detail` is `{ page }` (the next page). Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: a primary-button click that was not already canceled, including a modified click, on a page link `['uvalib-pager', 'page-change', 'number', <n>]`, on a section link `['uvalib-pager', 'page-change', 'next'\|'previous']`, or on Load more `['uvalib-pager', 'load-more', '', <next page>]`. Never the label or URL. Nothing on render. Bubbles and is composed. |
| `uvalib-pager-navigate` | A plain click on a pager link: `detail` is `{ href, kind, page? }` (`kind` is `'next'`, `'previous'` or `'number'`; `page` is set for `'number'`). Cancel it (`preventDefault()`) to route in the app; the click’s default is then prevented. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-link` |  | Dark-mode role token: link colour (else `--uva-brand-blue`). |
| `--uva-color-text` |  | Dark-mode role token: current page (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: the Previous/Next kicker (else #4f4f4f). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: current page background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Text on the current page background (else #fff). |
| `--uva-color-button-bg` |  | Load more background (else `--uva-blue-alt`). |
| `--uva-color-button-text` |  | Load more text (else #fff). Dark mode’s own text is dark on the light button. |
| `--uva-color-button-hover-bg` |  | Load more hover background (else `--uva-blue-alt-A`). |

### `<uvalib-photo-grid>`

Justified rows of thumbnails. Each direct child that is a link or a button is one photo; its image keeps its shape from the `width` and `height` attributes, or from the loaded image, so the row does not jump when the picture arrives. The row is about 220px tall and shorter when the grid is narrow (a phone, a sidebar); `row-height` sets that height. Every item stays a real link or button. An image with no visible text gets a visible caption from its alt (the caption is then the accessible name, and a repeated alt is cleared). The original alt is kept in `data-uvalib-alt` so a lightbox still describes the picture. An item with no name at all is captioned “Photo N” and warned about once; that caption is renumbered when the photos change order. An `aria-label` is left as the name: the grid does not add a caption that would disagree with it. Put the grid inside `<uvalib-lightbox>` and a plain click opens the viewer. A badge sits on the thumbnail: `<span slot="badge">` inside the link or button, or `data-badge` on that item (for example “seq” or “3 photos”). It is read after the caption (“The Lawn, 3 photos”). When the item already has an `aria-label`, the badge is appended to that label (the author’s words stay in `data-uvalib-label`) and an alt that repeats those words is cleared. A badge does not replace the alt caption.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `row-height` | `string` | `''` | Row height. A bare number is pixels (`220` is 220px); `px`, `rem`, `em`, `vh`, `vw`, `vmin`, `vmax`, `ch` and `%` are kept. Empty uses 220px, or 140px when the grid itself is narrower than 48rem (a phone, a sidebar, a drawer). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | The thumbnails: one `<a href>` or `<button>` per photo, each with an `<img>`. A `<span slot="badge">` inside an item is drawn over that thumbnail. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: caption colour (else `--uva-grey-darkest`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-surface` |  | Dark-mode role token: the box behind an image that has not loaded (else #fff). |
| `--uva-grey-darkest` | `#2b2b2b` | Caption colour when `--uva-color-text` is unset. |
| `--uva-brand-orange` | `#e57200` | Focus ring when `--uva-color-focus` is unset. |

### `<uvalib-results-count>`

The results summary of a search or listing page, such as “Showing 48 of 3,694 shoots”, and a polite live region that tells screen reader users when it changes. Set `total` (how many match), `shown` (how many are on the page) and `noun` (plural, default “results”; `singular` for a total of one). The visible text follows at once: “Showing 48 of 3,694 shoots”, “Showing all 12 shoots” (shown is the total, or unset), “Showing 1 shoot” or “No shoots” (a total of 0, or 0 shown); with only `shown`, “Showing 48 shoots”. Numbers use thousands separators. A missing or blank `shown` or `total` is unset, not 0. The announcement waits until the text has not changed for `announce-delay` milliseconds (default 1000, as `<bento-box>` and `<uvalib-pagefind-search>` settle), so typing in a filter box is announced once. The first render is never announced; when it has no count yet (the data still loading), the first count that arrives is. A count is announced again when it comes back after a different one (a new search with the same number of results), but not when nothing was shown in between. The announcement is cleared from the hidden region five seconds later, so reading the page finds the count once. `<bento-box>` and `<uvalib-pagefind-search>` announce their own counts: use this element for your own listings, not beside them.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `shown` | `number \| undefined` |  | How many results are shown on the page. |
| `total` | `number \| undefined` |  | How many results match in all. |
| `noun` | `string` | `'results'` | What is counted, plural: “results” by default. |
| `singular` | `string` | `''` | What is counted, singular, for a total of one. Default: “result” when `noun` is unset, else `noun`. |
| `announce-delay` | `number` | `1000` | Milliseconds the text must stay the same before it is announced. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS parts

| Part | Description |
|---|---|
| `text` | The visible summary. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text-muted` |  | Dark-mode role token: text colour (else `--uva-grey-A`, #4f4f4f). |

### `<uvalib-tabs>`

Tabs, as on library.virginia.edu: a row of buttons over one visible panel. Each panel is a child with `data-tab="Events"` (and an `id` when the tab should be linkable). Or put `<button slot="tab">` elements first and one panel element after each; the button text is the label and those buttons are hidden, because the component draws the real tabs. The selected panel stays visible across the upgrade. With `base.css`, later `data-tab` panels stay hidden before the element upgrades, and space is reserved for the tab row so the first panel does not jump. The tab row wraps on a narrow screen. Arrow keys, Home and End move between tabs. Selection follows the arrow unless `activation="manual"`, in which case Enter or Space selects the focused tab. `selected` is the panel id (a label or a 0-based index also selects). It reflects the panel id. `url-param` writes that id into the query string, or into the hash when the page is a hash route (`#/stories?tab=events`). `url-param="hash"` uses the hash itself (`#events`) and leaves a hash route (`#/…`) alone.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `selected` | `string` | `''` | The selected tab. A panel id, the tab label, or a 0-based index. Reflects the panel id once the tabs have been read. Empty selects the first tab. |
| `activation` | `string` | `''` | `manual`: arrow keys move focus and Enter or Space selects. Anything else, including empty, selects as the arrow moves. |
| `url-param` | `string` | `''` | Name of the query parameter that stores the selected panel id, so the tab is linkable and Back restores it. `hash` stores it in the hash (`#panel-id`) instead. Empty does not touch the URL. |
| `label` | `string` | `''` | Accessible name of the tab list. Empty uses “Tabs”. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | The panels. Each element with `data-tab` is a panel, or each element that is not a `slot="tab"` button. |
| `tab` | A `<button>` whose text labels the panel that follows. Hidden once the tabs are drawn. |

#### Events

| Event | Description |
|---|---|
| `change` | The selected tab changed after the first render, including a script setting `selected` and the Back button. `detail` is `{ id, label, index }` (`id` is the panel id, `index` from 0). Not fired on the first render. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: a click or arrow-key selection, `['uvalib-tabs', 'change', '<tab label>']`. The label is cut to 100 characters. Not fired on the first render, when `selected` is set from script, or when Back or the hash restores a tab. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-button-bg` |  | Dark-mode role token: unselected tab background (else `--uva-blue-alt-base`). |
| `--uva-color-button-text` |  | Text on an unselected tab (else #fff). |
| `--uva-color-button-hover-bg` |  | Dark-mode role token: unselected tab hover (else `--uva-blue-alt-dark`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected tab background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Selected tab text and the selected underline (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus outline (else `--uva-brand-orange`). |
| `--uva-blue-alt-base` | `#007BAC` | Unselected tab when `--uva-color-button-bg` is unset. |
| `--uva-blue-alt-dark` | `#005679` | Unselected hover when `--uva-color-button-hover-bg` is unset. |
| `--uva-brand-blue` | `#232D4B` | Selected tab when `--uva-color-accent-bg` is unset. |
| `--uva-brand-orange` | `#E57200` | Focus outline when `--uva-color-focus` is unset. |

### `<uvalib-tag-list>`

A labelled list of keywords or subjects that wraps: each tag a link (for example a search for that term) or plain text. Link tags are outlined pills in the link colour; plain tags are filled chips (the card chip's colours), so a link never looks like a label. Every tag and the toggle are at least 2rem (34px) tall and wide, 0.5rem apart. Give the tags as children: `<a href>` for a link, any other element (`<span>`) for plain text. A child's `lang` and `dir` are kept, and so is inline markup inside it (`em`, `cite`, `abbr`, `bdi`, a `span lang`…), copied element by element (never parsed as HTML). Or set `href-template` (with `{tag}`, replaced by the URL-encoded text) to make every tag without its own href a link; a blank href counts as none. Apps can set the `items` property (`{ label, href?, lang?, dir? }`) instead; it wins over the children. Children with no text are skipped with one warning. `label` names the list (shown above it, or visually hidden with `hide-label`); without one a console warning is logged. `limit` shows that many tags and a “Show all N” button (`aria-expanded`, `aria-controls`), which reveals the rest in place and keeps focus. Pages can style the list while every tag is shown with `:state(expanded)`. Analytics never sends a tag's text (record tags can be user-submitted or machine-made), and by default not the label either, which a template may fill from a record: the name is the list's place among the tag lists on the page, `list N`. Add `track-label` when the label is fixed text the page author wrote (“Subjects”), to send it instead.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `''` | The list's name: shown above the tags (and, with `track-label`, the analytics name). |
| `hide-label` | `boolean` | `false` | Hide the label visually; it still names the list. |
| `track-label` | `boolean` | `false` | Send the label as the analytics name. Only for fixed text the page author wrote, never a label filled from a record. Without it the name is `list N`. |
| `limit` | `number \| undefined` |  | Show this many tags and a “Show all N” button. Zero or empty shows every tag. |
| `href-template` | `string` | `''` | Href for tags without their own, with `{tag}` where the URL-encoded text goes, for example `/search?q={tag}`. Empty: such tags are plain text. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### CSS states

| State | Description |
|---|---|
| `:state(expanded)` | Show all was pressed: every tag is shown (the toggle's `aria-expanded="true"`). |

#### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a primary-button click on a tag link, `['uvalib-tag-list', 'tag-click', '<name>', <n>]` (n from 1, the tag's place in the list), and the toggle, `['uvalib-tag-list', 'show-all'\|'show-fewer', '<name>']`. The name is `list N` (N from 1, the list's place among the tag lists in its document or shadow root), or with `track-label` the list's `label`; never the tag text or URL. Bubbles and is composed. |
| `uvalib-tag-list-navigate` | A plain click on a tag link: `detail` is `{ href, tag, index }` (index from 0). Cancel it (`preventDefault()`) to route in the app; the click's default is then prevented. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-300` | `#BFE7F7` | Plain tag background (the card chip's). |
| `--uva-blue-alt-dark` | `#005679` | Plain tag text. |
| `--uva-color-link` |  | Dark-mode role token: link tag text (else `--uva-brand-blue`). |
| `--uva-color-control-border` |  | Dark-mode role token: link tag outline (else `--uva-grey`). |
| `--uva-color-text` |  | Dark-mode role token: the label (else `--uva-grey-darkest`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

### `<website-section>`

The library website's first pages (pages, people, libraries, news) matching `query`, from Drupal's search index, with its excerpt (the matched words marked). The index sends no CORS headers, so this section works on library.virginia.edu (or wherever `BentoBox.endpoints.website` points to a same-origin copy) only.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text. Empty: nothing is fetched and the section is `empty`. |
| `limit` | `number` | `5` | How many results to show (at most). |
| `no-result-describe` | `string` | `'No results found.'` | The message shown when nothing is found. |
| `heading-level` | `number \| undefined` |  | The level of the section's heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page, or 3 when there is none. `<bento-box>` sets it one below its own heading. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Events

| Event | Description |
|---|---|
| `bento-state` | Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled. |
| `uvalib-analytics-search` | For `<site-analytics>`: once per settled search (results or none, not an error): the query, the section's `analyticsName` as category and its total when known. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; `['bento-box', 'retry', <section>]` for its Retry button; `['bento-box', 'error', 'section-load: <section>']` once when its results cannot be loaded; never titles or URLs. Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-link` |  | Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`). |
| `--uva-color-border` |  | Dark-mode role token: the block's border and entry rules (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: background (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the header band (else #dadada). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

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

Three automated checks guard accessibility, best practice and performance. The first two run in `pnpm test`; Lighthouse is slower and runs on its own (`pnpm lhci`, the `lighthouse` job in the `CI` workflow on pull requests, and the `Pages` workflow on `main`). The results of the last build of `main` are in the [test report](#test-results).

- **axe, at every impact level, at least as strict as Lighthouse.** `expectNoAxeViolations` (`test/helpers/axe.ts`) fails on minor, moderate, serious and critical violations, so best-practice rules such as `heading-order`, `region` and the landmark rules count. It runs every axe rule and also turns on the ones Lighthouse's accessibility audit enables that a default axe run leaves off (`target-size`, `identical-links-same-purpose`, `table-fake-caption`, `td-has-header`), so a component that passes here cannot lose Lighthouse accessibility points to axe. Sites built with the components get the same setup for Playwright in the skill's [accessibility testing guide](skills/uvalib-web-components/reference/accessibility-testing.md). Every visual component is audited in shadow and light DOM, and in the states people use: menus and groups open (the header Menu popover at 390px, `site-main-nav` at 1280px and 390px), `uvalib-filter` expanded with a scope pressed and a box checked, `uvalib-date-range` with the sliders on one year and dates typed, the hours elements loading, loaded and failing, and `events-section` loading, loaded, empty and failing, on its own and in home-page markup in light and dark. Full-page tests use `expectNoPageAxeViolations`, which audits the whole document so the rules that only match `<html>` (`landmark-one-main`, `page-has-heading-one`) run too; it gives the test runner's bare page a `<title>` and `lang` first, and disables no rule. Tests never reach the network: `test/helpers/*-intercept.mjs` route the alerts, hours, events and main-nav hosts to fixtures.
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
  | `events-section.js`       |       14,513 | 15,700 |

  The three hours entries grew by about 250–410 bytes with `events-section`: the fetch retry loop and the New York date helpers they share with it moved into their own chunks (`src/data/`), whose module wrappers cost a little more than the code inlined.

  | `tokens.css` | 592 | 670 |
  | `base.css` | 226 | 260 |

- **Lighthouse CI** (`pnpm lhci`, `@lhci/cli`, settings and assertions in `lighthouserc.json`). The playground's previews run in a cross-origin sandbox, so `scripts/lhci.mjs` writes each example in `site/src/presets.ts` as a plain page into a temporary folder, next to a copy of the site build's `cdn/` (the local `dist-cdn`) and `data/`, serves it from localhost, compressed as the CDN serves it, and audits it with Playwright's Chromium (Lighthouse's default mobile emulation, three runs per page, about 10 minutes). Assertions use each metric's median over the three runs, since a single run's CLS depends on when the page's first paint lands. Each page must score 1.0 for accessibility, at least 0.95 for best practices and for performance, with CLS at most 0.05 and TBT at most 200 ms. Nothing reaches the network: Typekit and the alerts CDN are blocked (site-page treats both as optional, so the pages fall back to the system font stack and show no alerts, and their font swap is not measured); the header logo and LibCal are answered locally (a same-size stand-in logo through `root-link-domain`, and every library open 8am–10pm), with the library website and LibCal also blocked as a backstop. LibCal's events are stubbed the same way on the events example (18 upcoming events, one a day from tomorrow, one over two days), so the cards render as they do live. `pnpm lhci` builds first; reports are left in `.lighthouseci/`.
- `pnpm sync:main-nav` regenerates the bundled main navigation (`src/components/site-main-nav/main-nav-data.ts`) from the desktop "Main navigation" menu of the live library.virginia.edu home page. `node scripts/sync-main-nav.mjs saved.html` reads a saved page instead. It exits non-zero, writing nothing, if the menu's structure is not found or has fewer than 2 groups or 6 links. Commit the result.
- `pnpm start` runs the Vite dev server for the playground site (`site/`) and the demos (`demo/`), rooted at the repo: open `/site/` for the examples page, or `/demo/` for the demo pages. In dev, `cdn/<tag>.js` is served straight from `src/components/`, so edits show up on reload; `cdn/tokens.css` and `base.css` come from `dist-cdn/` (run `pnpm build` first).
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

Pull requests to `main` run `.github/workflows/ci.yml` in GitHub Actions (install, lint, test, Lighthouse) with a read-only token and no secrets. Pushes to `main` are tested and audited with Lighthouse by `.github/workflows/pages.yml`, which publishes the examples site with the [test report](#test-results) twice: as soon as the tests pass, then again with the Lighthouse results. A Lighthouse failure fails the run but still publishes, so the report shows what is over budget; a newer push cancels an older run. The CI workflow's Lighthouse job can also be started by hand (Actions → CI → Run workflow).

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

Moving from the old `/web-components/latest/` and `cdn-v*` URLs or the old `@uvalib/<pkg>` npm names: see [docs/migration.md](docs/migration.md). Switching library.virginia.edu: the page-by-page table in [Switching library.virginia.edu](skills/uvalib-web-components/reference/migration.md#switching-libraryvirginiaedu).
