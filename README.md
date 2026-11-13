# @uvalib/web-components

Reusable web components for UVA Library sites, built with Lit and TypeScript: `<site-page>` (skip link, header, one `<main>`, footer), `<site-header>`, `<site-footer>`, `<site-analytics>` (Matomo) and `<site-style>` (legacy compatibility). [library.virginia.edu](https://www.library.virginia.edu) and the UVA Library design system are the style authority: these components exist so sites use the real chrome instead of copying it. Change appearance only through the theming surface below.

## Playground

Try every component and mode, edit the code, and share a link: <https://uvalib.github.io/reusable-web-library/>

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
import '@uvalib/web-components/site-page.js'; // registers site-page, site-header and site-footer
```

The define entries are `site-page.js`, `site-header.js`, `site-footer.js`, `site-analytics.js` and `site-style.js`. The package root (`import '@uvalib/web-components'`) exports the classes only and registers nothing. To use a class such as `SitePage` directly, also import the define entries. CSS is available as `@uvalib/web-components/tokens.css` and `base.css`. Do not load the same component from both the CDN and npm on one page.

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

Use one `<site-page>` per page. It renders the skip link, the header, a single `<main id="main-content">` and the footer around your content, so do not add your own `<main>`, skip link, header or footer. Put content for a band above the footer in an element with `slot="pre-footer"`. Third-party sites use `<site-page header-variant="vendor">`. Links default to `root-link-domain="https://www.library.virginia.edu"`.

Caveat: replacing a light-mode `<site-page>`'s children wholesale (`innerHTML` or `textContent`) destroys the chrome. Append content, or update a container inside it.

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

## Components

Generated from `dist/custom-elements.json` by `scripts/gen-reference.mjs`; do not edit between the markers by hand.

<!-- components:start -->
<!-- prettier-ignore-start -->

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

UVA Library site header: logo, utility navigation, and a popover menu on narrow screens.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| `skip-link` | Shadow mode only: optional skip link, rendered first inside `<header>` (`<site-page>` uses it). |

#### CSS parts

| Part | Description |
|---|---|
| `header` | The `<header>` element. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Utility link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Menu button colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |
| `--uva-brand-blue` | `#232d4b` | Skip-link background for a skip link slotted into `skip-link` (shadow mode, shared accessibility sheet). |

### `<site-page>`

Page wrapper: skip link (inside the header landmark in shadow mode), header, a single `<main>`, footer, and global page styles. Side-effect free: `site-page.ts` registers `<site-header>` and `<site-footer>`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `header-variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-global-styles` | `boolean` | `false` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | Main page content, rendered inside the single `<main>`. |
| `pre-footer` | Optional content shown in a band above the footer. |

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

<!-- prettier-ignore-end -->
<!-- components:end -->

## Agent skill

A skill that teaches coding agents (Claude Code and others) to use these components correctly ships with the package.

```sh
npx @uvalib/web-components install-skill            # copies to .claude/skills/uvalib-web-components
npx @uvalib/web-components install-skill --dir .agents/skills --force
```

See [docs/usage.md](docs/usage.md) for details, including sites that only use script tags.

## Development

- `pnpm install`
- `pnpm test` builds first (`pnpm build`, then the playground site with `--base /dist-site/`), then runs the Node tests and the browser tests (headless Chromium).
- `pnpm test:node` runs the Node tests alone; it needs a prior `pnpm build`.
- `pnpm test:browser` runs the browser tests alone; it needs a prior `pnpm build` and `pnpm build:site --base /dist-site/`.
- `pnpm build` builds the npm output (`dist/`, which also regenerates this README's component section and the skill's `reference/components.md`) and the CDN output (`dist-cdn/`).
- `pnpm lint` runs ESLint and Prettier.
- `pnpm start` runs the Vite dev server for the playground site (`site/`) and the demos (`demo/`), rooted at the repo: open `/site/` for the gallery and playground, or `/demo/` for the demo pages. In dev, `cdn/<tag>.js` is served straight from `src/components/`, so edits show up on reload.
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

Two AWS CodeBuild projects, defined in `pipeline/codebuild.yml`, react to GitHub events: pushes and PRs to `main` trigger CI, and `v*` tags trigger the release.

- `web-components-ci` runs on pushes and PRs to `main` (install, lint, test). It has no publish credentials.
- `web-components-release` runs on `v*` tags only. It publishes to npm, then uploads to the CDN: `vX.Y.Z/` (immutable, create-only) and the `vX/` major alias (synced without `--delete`, so hashed chunks from earlier releases stay available to cached entry files), then invalidates `/web-components/vX/*`. The alias is updated and invalidated only when the release is the highest `X.*.*` version present. It never writes the legacy `latest/` or `cdn-v*` prefixes.

One-time setup for the repo owner:

1. Deploy `pipeline/codebuild.yml`, providing the CloudFront distribution ID (`DistributionId`) and, once, authorizing CodeBuild to access GitHub manually in the console (the template uses a GitHub source with no connection resource).
2. Store the npm automation token in SSM at `/web-components/npm-token`.
3. Set `ReleaseActorAccountIds` to the GitHub account IDs allowed to trigger releases (empty means no actor filter).
4. Enable GitHub Pages for the repository with source "GitHub Actions" (Settings > Pages), so `.github/workflows/pages.yml` can deploy the playground.

## Migration

Moving from the old `/web-components/latest/` and `cdn-v*` URLs or the old `@uvalib/<pkg>` npm names: see [docs/migration.md](docs/migration.md).
