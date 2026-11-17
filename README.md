# @uvalib/web-components

Reusable web components for UVA Library sites, built with Lit and TypeScript:

- **Page chrome:** `<site-page>` (skip link, header with the library main navigation and live library alerts, one `<main>`, footer), `<site-header>`, `<site-main-nav>`, `<site-footer>`, `<site-analytics>` and `<uvalib-analytics>` (Matomo, one element under two names) and `<site-style>` (legacy compatibility).
- **Search:** `<uvalib-filter>` and `<uvalib-date-range>`.
- **Library hours:** `<site-hours-section>`, `<library-weekly-hours>` and `<library-hours-setup>`.
- **Library events:** `<events-section>`.
- **Search results:** `<bento-box>` (library.virginia.edu/search), with its `<catalog-section>`, `<articles-section>`, `<libguides-section>` and `<website-section>`.

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
- `tokens.css` and `base.css` live at the same prefix (`.../v1/tokens.css`).
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

The define entries are `site-page.js`, `site-header.js`, `site-main-nav.js`, `site-footer.js`, `site-analytics.js`, `uvalib-analytics.js`, `site-style.js`, `uvalib-filter.js`, `uvalib-date-range.js`, `site-hours-section.js`, `library-weekly-hours.js`, `library-hours-setup.js`, `events-section.js` and `bento-box.js`. The package root (`import '@uvalib/web-components'`) exports the classes only and registers nothing. To use a class such as `SitePage` directly, also import the define entries. CSS is available as `@uvalib/web-components/tokens.css` and `base.css`. Do not load the same component from both the CDN and npm on one page.

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
- **Alerts:** dark versions of the alert colours are set through the alerts component's own `--uvalib-alerts-*` properties. Its focus ring follows the text colour (`--uvalib-alerts-focus`, default `currentColor`, since alerts 1.1.1), so it passes on the dark alerts too.
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

| Token                         | Used for                                                    | Light                             | Dark                 |
| ----------------------------- | ----------------------------------------------------------- | --------------------------------- | -------------------- |
| `--uva-color-surface`         | page background                                             | `#ffffff`                         | `#10172b`            |
| `--uva-color-surface-raised`  | header, nav bar, panels, popover, inputs, buttons, chips    | `#ffffff`                         | `#232d4b`            |
| `--uva-color-surface-hover`   | hover and open-group background                             | `--uva-grey-100` (`#dadada`)      | `#2c3858`            |
| `--uva-color-text`            | text                                                        | `--uva-grey-darkest` (`#2b2b2b`)  | `#e8e8e8`            |
| `--uva-color-text-muted`      | secondary labels                                            | `#4b5563`                         | `#adadad`            |
| `--uva-color-link`            | links, headings, accent text                                | `--uva-brand-blue` (`#232d4b`)    | `#87b9d9`            |
| `--uva-color-utility-link`    | header utility and site links                               | `--uva-blue-alt-dark` (`#005679`) | `#91d8f2`            |
| `--uva-color-focus`           | focus rings                                                 | `--uva-brand-orange` (`#e57200`)  | `#ffb370`            |
| `--uva-color-current`         | current-page underline                                      | `--uva-brand-orange` (`#e57200`)  | `#e57200`            |
| `--uva-color-accent-bg`       | pressed chip, slider range and thumbs, skip link, selection | `--uva-brand-blue` (`#232d4b`)    | `#87b9d9`            |
| `--uva-color-on-accent`       | text on `--uva-color-accent-bg`                             | `#ffffff`                         | `#10172b`            |
| `--uva-color-control-border`  | borders of controls (chips, inputs, the theme control)      | `--uva-grey` (`#808080`)          | `#7a84a0`            |
| `--uva-color-input-text`      | date input text                                             | `#1f2937`                         | `#e8e8e8`            |
| `--uva-color-border`          | decorative borders and rules (dark only)                    | each component's own (`#ccc`, …)  | `#7a84a0`            |
| `--uva-color-track`           | slider track                                                | `#e5e7eb`                         | `#2c3858`            |
| `--uva-color-shadow`          | panel shadow                                                | `rgba(0, 0, 0, 0.2)`              | `rgba(0, 0, 0, 0.6)` |
| `--uva-color-pre-footer-bg`   | pre-footer band background                                  | `--uva-blue-alt-300` (`#bfe7f7`)  | `#005679`            |
| `--uva-color-pre-footer-text` | pre-footer band text                                        | `--uva-grey-darkest` (`#2b2b2b`)  | `#ffffff`            |

`--uva-color-scheme` is the scheme the components follow (`light dark`, `light` or `dark`). See the [Dark mode](https://uvalib.github.io/reusable-web-library/#dark-mode) example in the playground.

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
- **States.** On the first load a polite `role="status"` says "Loading hours…". Later loads keep the current rows on screen (the weekly table gets `aria-busy="true"`) until the new data lands. If the data cannot be loaded the status says "Hours are unavailable right now."; `<library-weekly-hours>` keeps its week header and adds a Retry button, and both elements retry quietly on their timers. Only user actions (the week buttons, Retry) are announced; midnight rollovers and background refreshes are silent. Read the read-only `state` (`loading`, `ready` or `error`) from script. On the first load `<library-weekly-hours>` draws its rows straight away (Building hours and each space, as soon as the library list is in) with invisible placeholder hours, so the table has its final height in the page's own font and nothing below it moves when the hours arrive. `--library-weekly-hours-min-height` can reserve space even before the library list is in (it applies while the element has a `loading` attribute), and `library-weekly-hours:not(:defined) { display: block; min-height: … }` before it upgrades. `<site-hours-section>` has `--site-hours-list-min-height` for the same purpose.
- **Harrison special case.** `<library-hours-setup>` adds `hide-building-hours` to `library-slug="harrison"`: Harrison's building calendar (LibCal 4114) is also the calendar of its own "Harrison/Small Building & Exhibitions" space, so the building row would repeat it.
- **Light DOM output** keeps the class names Drupal's CSS targets (`home-hours-block`, `hours-locations`, `weekly-hours-header-section`, `weekly-hours-body-section`, `date--mobile`, `lib-space-link`, …). `<library-weekly-hours>` keeps a few layout rules even with `no-style` (the host is `display: block`, the week header is a flex row, `[hidden]` hides), scoped to the tag in `@layer uvalib`. `headinglevelstart` is still read as an alias of `heading-level`. With neither set, the week heading's `aria-level` is one below the nearest heading before the element in the page (3 under each library's `<h2>` on /hours), or 2 when there is none, while its class stays `heading-h2`, the one the library website's CSS styles; set `heading-level` to override both. `<site-hours-section>` does not infer its level: on the home page it sits in a side column after another section's cards, where the heading before it in the page is not its parent, so it keeps its explicit default.
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

## Analytics

`<site-analytics>` and `<uvalib-analytics>` are one element under two names (`site-analytics.js`, `uvalib-analytics.js`; npm `@uvalib/web-components/site-analytics.js`, `…/uvalib-analytics.js`). It has no visual output: it loads Matomo (`https://analytics.lib.virginia.edu/matomo.js`), records the page view and forwards the events below to Matomo.

```html
<script
  type="module"
  src="https://unpkg.internal.lib.virginia.edu/web-components/v1/uvalib-analytics.js"
></script>
<uvalib-analytics matomoid="10"></uvalib-analytics>
```

- **Attributes.** `matomoid`: the Matomo site id; without it, the site whose URL the page is under (the library's site registry), and with none, the element does nothing. `matomourl` (default `https://analytics.lib.virginia.edu/`, ending in `/`): the Matomo server. `spa`: no page view on load; a single-page app records each view with a pageview event. `variables`: custom dimensions as a JSON object, `variables='{"1":"staff"}'`, set before the page view.
- **Events.** Both tags listen on `document` for both families, `uvalib-analytics-*` (the original names) and `site-analytics-*`. Fire them bubbling and composed from anywhere, or with `trackEvent(el, parts)` and `trackSearch(el, query, category?, count?)` from `@uvalib/web-components/base.js`, or the mixins (`UvalibAnalyticsMixin`: `_analyticsEvent`, `_analyticsSearch`, firing `uvalib-analytics-*`; `SiteAnalyticsMixin`: `analyticsEvent`, `analyticsSearch`, firing `site-analytics-*`).
  - `…-event`: `detail: { event: [category, action, name?, value?] }` (`track` is accepted as the old name), a Matomo `trackEvent`.
  - `…-search`: `detail: { searchQuery, searchCategory?, resultCount? }`, a Matomo site search; an unknown count (null or missing) is sent as Matomo's "unknown".
  - `…-pageview`: `detail: { customTitle?, referrer? }`, a page view; the title defaults to the document's, a referrer without `http` is a path on this origin, and with none the document's referrer is used.
- **Nothing is lost or counted twice.** Every call goes through Matomo's `_paq` queue, which matomo.js replays when it loads, so events fired before it arrives are kept (and nothing waits for it if it is blocked). However many analytics elements a page has, from any copy of this library (an npm build next to a CDN script, two CDN versions), matomo.js is loaded and the page view recorded once and only one element forwards each event; if it is removed, the next one takes over. A Matomo snippet already on the page (a `matomo.js` script, or a `_paq` that sets a site id) is used as it is: nothing is loaded or recorded again, and the element only forwards the events.
- **`<site-page matomo-id="N">`** (and optional `matomo-url`) adds one `<site-analytics>` for that site and loads its code only then. Off by default.
- **What the library's components send** (they only fire `uvalib-analytics-*` events, so nothing happens without an analytics element; the old v0.0.12 element records them too):

  | Component         | Matomo call                                                                                                                                                                                                                                                                                                            |
  | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `<bento-box>`     | A site search per section once its results are in (not on an error, not again on a re-render): the query, the section (`Virgo catalog`, `Virgo articles`, `Subject guides`, `Library website`) as category, and the section's total (0 when nothing was found). A new query, also by Back or Forward, is a new search. |
  | `<bento-box>`     | Events `['bento-box', 'result-click', <section>, <position, from 1>]` and `['bento-box', 'see-all-click', <section>]`.                                                                                                                                                                                                 |
  | `<site-main-nav>` | `['site-main-nav', 'menu-open', <the group's label>]` when a group opens (not when it closes).                                                                                                                                                                                                                         |
  | `<site-header>`   | `['site-header', 'color-scheme', 'light' \| 'dark' \| 'system']` when the visitor picks a scheme (not the initial value).                                                                                                                                                                                              |

- **Privacy.** The components never send titles, URLs or other text from the page: only the fixed names above, positions and counts. Search queries are what visitors typed, and are sent as Matomo site searches.
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
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; never titles or URLs. Bubbles and is composed. |

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
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; never titles or URLs. Bubbles and is composed. |

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
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; never titles or URLs. Bubbles and is composed. |

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

### `<site-analytics>`

Matomo analytics, with no visual output. Loads matomo.js for the site and records the page view, then forwards the events below, fired anywhere in the page, to Matomo. Every call goes through Matomo's `_paq` queue, so events fired before matomo.js loads are kept. One tracker per page: however many `<site-analytics>` and `<uvalib-analytics>` elements there are (from any copy of this library), matomo.js is loaded and the page view recorded once, and only one element forwards each event; if it is removed, the next takes over. A Matomo snippet already on the page is used as it is (nothing is loaded or recorded again). The same element is registered as `<uvalib-analytics>` by `uvalib-analytics.js`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `matomourl` | `string` | `'https://analytics.lib.virginia.edu/'` | The Matomo server, ending in `/` (attribute `matomourl`). |
| `matomoid` | `number \| undefined` |  | The Matomo site id (attribute `matomoid`). Default: the site whose URL the page is under. |
| `spa` | `boolean` | `false` | A single-page app records its own page views (`uvalib-analytics-pageview`): none on load. |
| `variables` | `Record<string, unknown> \| null` | `null` | Custom dimensions, a JSON object of `{ id: value }`, set before the page view. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Listens for (on document)

| Event | Description |
|---|---|
| `uvalib-analytics-pageview` | Listened for on `document` (not fired): records a page view; `detail` is `{ customTitle?, referrer? }` (default: the document's title and referrer; a referrer without `http` is taken as a path on this origin). |
| `uvalib-analytics-search` | Listened for on `document` (not fired): a Matomo site search; `detail` is `{ searchQuery, searchCategory?, resultCount? }`. |
| `uvalib-analytics-event` | Listened for on `document` (not fired): a Matomo event; `detail` is `{ event: [category, action, name?, value?] }` (`track` is the old name of `event`). |
| `site-analytics-pageview` | Listened for on `document` too: the same as `uvalib-analytics-pageview`. |
| `site-analytics-search` | Listened for on `document` too: the same as `uvalib-analytics-search`. |
| `site-analytics-event` | Listened for on `document` too: the same as `uvalib-analytics-event`. |

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
| `--uva-color-pre-footer-bg` |  | Dark-mode role token: pre-footer band background (else `--uva-blue-alt-300`). |
| `--uva-color-pre-footer-text` |  | Dark-mode role token: pre-footer band text (else inherited). The footer itself is the same in both schemes. |

### `<site-header>`

UVA Library site header: logo, utility navigation, and a popover menu on narrow screens. A site can replace the library utility links (My account, Ask a Librarian, Hours, Give, Alerts, Search) with its own: give the header `<a slot="site-links" href="…">` children. They are shown, in order, in the inline nav and the Menu popover, with `href` as written (not joined to `root-link-domain`) and their `aria-current`, `target`, `rel` and `hreflang`. The source anchors themselves stay hidden. Children that are not `<a href>` with text (empty or whitespace-only text counts as none) are ignored with one console warning. The `vendor` variant ignores site links and keeps its own reduced link set. The full header also shows the UVA Library main navigation (`<site-main-nav>`): a row under the logo row on wide screens, and an accordion at the top of the Menu popover on narrow ones (992px and below), above the utility or site links. `no-main-nav` turns it off, leaving the header exactly as it was without it; the `vendor` variant never shows it. A `<nav slot="main-nav">` child replaces its links (see `<site-main-nav>`), and `main-nav-src` loads them from JSON; `main-nav-current` sets the URL marked current. `color-scheme-switch` opts in to dark mode (off by default; see the README's "Dark mode"): a Light / Dark / System radio group ("Theme") at the end of the utility-links row on wide screens and at the bottom of the Menu popover on narrow ones. The `vendor` variant, which has no Menu, shows it after its inline link, on a row of its own under the logo row on narrow screens. In dark mode the logo is the reversed (white) one.

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
| `color-scheme-switch` | `boolean` | `false` | Opt in to dark mode: the page follows the OS light or dark preference ("System"), and a Light / Dark / System control (at the end of the utility-links row on wide screens, at the bottom of the Menu popover on narrow ones) lets the visitor override it, remembered per site in localStorage (`uvalib-color-scheme`). Sets `data-uva-color-scheme` on the root element, and swaps in the reversed logo while dark. Ignored (the page stays light and no control is shown) in browsers without CSS `light-dark()`. |
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
| `uvalib-analytics-event` | For `<site-analytics>`: the visitor picked a colour scheme, `['site-header', 'color-scheme', 'light' \| 'dark' \| 'system']` (not the initial value), and the main navigation's menu opens (see `<site-main-nav>`). Bubbles and is composed. |

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
| `uvalib-analytics-event` | For `<site-analytics>`: a group was opened, `['site-main-nav', 'menu-open', <the group's label>]` (not on close). Bubbles and is composed. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-grey-darkest` | `#2b2b2b` | Top-level button colour. |
| `--uva-brand-blue` | `#232d4b` | Bar bottom border, chevrons, panel links, and the hover and expanded button text. |
| `--uva-grey-100` | `#dadada` | Hover and expanded button background, and panel link hover background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour, and the underline of the current page's link and group (also bold, with a 3px underline). |
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Font family. |
| `--uva-color-text` |  | Dark-mode role token: top-level button text (else `--uva-grey-darkest`). |
| `--uva-color-link` |  | Dark-mode role token: chevrons, panel links, hover text and the focus ring over hover (else `--uva-brand-blue`). |
| `--uva-color-surface-hover` |  | Dark-mode role token: hover and open-group background (else `--uva-grey-100`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: bar and panel background (else #ffffff). |
| `--uva-color-accent-bg` |  | Dark-mode role token: bar bottom rule (else `--uva-brand-blue`). |
| `--uva-color-shadow` |  | Dark-mode role token: panel shadow colour (else rgba(0, 0, 0, 0.2)). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-current` |  | Dark-mode role token: current-page underline (else `--uva-brand-orange`). |

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
| `color-scheme-switch` | `boolean` | `false` | Opt in to dark mode, forwarded to `<site-header color-scheme-switch>`: the page follows the OS preference, and a Light / Dark / System control in the header lets the visitor override it (remembered per site). Off by default: the page is always light. The page's own content must support it (see the README's "Dark mode"). |
| `matomo-id` | `number \| undefined` |  | Opt in to Matomo analytics: the site's Matomo id. The page then adds one `<site-analytics>` for it (loading its code only then), which records the page view and what the library's components report (see the README's "Analytics"). Off by default. With an analytics element or a Matomo snippet already on the page nothing is counted twice. |
| `matomo-url` | `string \| undefined` |  | The Matomo server for `matomo-id`, ending in `/` (default: the library's). |
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
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Font family. |
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
| `spa` | `boolean` | `false` | A single-page app records its own page views (`uvalib-analytics-pageview`): none on load. |
| `variables` | `Record<string, unknown> \| null` | `null` | Custom dimensions, a JSON object of `{ id: value }`, set before the page view. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Listens for (on document)

| Event | Description |
|---|---|
| `uvalib-analytics-pageview` | Listened for on `document` (not fired): records a page view; `detail` is `{ customTitle?, referrer? }` (default: the document's title and referrer; a referrer without `http` is taken as a path on this origin). |
| `uvalib-analytics-search` | Listened for on `document` (not fired): a Matomo site search; `detail` is `{ searchQuery, searchCategory?, resultCount? }`. |
| `uvalib-analytics-event` | Listened for on `document` (not fired): a Matomo event; `detail` is `{ event: [category, action, name?, value?] }` (`track` is the old name of `event`). |
| `site-analytics-pageview` | Listened for on `document` too: the same as `uvalib-analytics-pageview`. |
| `site-analytics-search` | Listened for on `document` too: the same as `uvalib-analytics-search`. |
| `site-analytics-event` | Listened for on `document` too: the same as `uvalib-analytics-event`. |

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
| `--uva-color-link` |  | Dark-mode role token: legend and focused date input border (else `--uva-brand-blue`). |
| `--uva-color-track` |  | Dark-mode role token: slider track (else #e5e7eb). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected range and thumbs (else `--uva-brand-blue`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: date input background and thumb ring (else #ffffff). |
| `--uva-color-input-text` |  | Dark-mode role token: date input text (else #1f2937). |
| `--uva-color-text-muted` |  | Dark-mode role token: From / To labels (else #4b5563). |
| `--uva-color-control-border` |  | Dark-mode role token: date input border (else `--uva-grey`, #808080). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

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
| `--uva-color-border` |  | Dark-mode role token: divider under the scope chips (else #e5e7eb). |
| `--uva-color-control-border` |  | Dark-mode role token: scope chip border (else `--uva-grey`, #808080). |
| `--uva-color-surface-raised` |  | Dark-mode role token: scope chip background (else #fff). |
| `--uva-color-link` |  | Dark-mode role token: scope chip text and hover border (else `--uva-brand-blue`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: pressed chip background and border (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: pressed chip text (else #fff). |
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
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; never titles or URLs. Bubbles and is composed. |

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

Three automated checks guard accessibility, best practice and performance. The first two run in `pnpm test`; Lighthouse is slower and runs on its own (`pnpm lhci`, and the `lighthouse` job in the `CI` workflow).

- **axe, at every impact level.** `expectNoAxeViolations` (`test/helpers/axe.ts`) fails on minor, moderate, serious and critical violations, so best-practice rules such as `heading-order`, `region` and the landmark rules count. Every visual component is audited in shadow and light DOM, and in the states people use: menus and groups open (the header Menu popover at 390px, `site-main-nav` at 1280px and 390px), `uvalib-filter` expanded with a scope pressed and a box checked, `uvalib-date-range` with the sliders on one year and dates typed, the hours elements loading, loaded and failing, and `events-section` loading, loaded, empty and failing, on its own and in home-page markup in light and dark. Full-page tests use `expectNoPageAxeViolations`, which audits the whole document so the rules that only match `<html>` (`landmark-one-main`, `page-has-heading-one`) run too; it gives the test runner's bare page a `<title>` and `lang` first, and disables no rule. Tests never reach the network: `test/helpers/*-intercept.mjs` route the alerts, hours, events and main-nav hosts to fixtures.
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

- **Lighthouse CI** (`pnpm lhci`, `@lhci/cli`, settings and assertions in `lighthouserc.json`). The playground's previews run in a cross-origin sandbox, so `scripts/lhci.mjs` writes each example in `site/src/presets.ts` as a plain page into a temporary folder, next to a copy of the site build's `cdn/` (the local `dist-cdn`) and `data/`, serves it from localhost and audits it with Playwright's Chromium (Lighthouse's default mobile emulation, three runs per page, about 10 minutes). Assertions use each metric's median over the three runs, since a single run's CLS depends on when the page's first paint lands. Each page must score 1.0 for accessibility, at least 0.95 for best practices and 0.9 for performance, with CLS at most 0.05 and TBT at most 200 ms. Nothing reaches the network: Typekit and the alerts CDN are blocked (site-page treats both as optional, so the pages fall back to the system font stack and show no alerts, and their font swap is not measured); the header logo and LibCal are answered locally (a same-size stand-in logo through `root-link-domain`, and every library open 8am–10pm), with the library website and LibCal also blocked as a backstop. LibCal's events are stubbed the same way on the events example (18 upcoming events, one a day from tomorrow, one over two days), so the cards render as they do live. `pnpm lhci` builds first; reports are left in `.lighthouseci/`.
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

Pull requests to `main` run `.github/workflows/ci.yml` in GitHub Actions (install, lint, test, Lighthouse) with a read-only token and no secrets. Pushes to `main` are linted and tested by `.github/workflows/pages.yml` and run the same workflow's Lighthouse job, which can also be started by hand (Actions → CI → Run workflow).

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
