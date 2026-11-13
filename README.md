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

The define entries are `site-page.js`, `site-header.js`, `site-footer.js`, `site-analytics.js`, `site-style.js`, `uvalib-filter.js` and `uvalib-date-range.js`. The package root (`import '@uvalib/web-components'`) exports the classes only and registers nothing. To use a class such as `SitePage` directly, also import the define entries. CSS is available as `@uvalib/web-components/tokens.css` and `base.css`. Do not load the same component from both the CDN and npm on one page.

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

### Site navigation

A site with its own navigation puts it in the header instead of the library utility links (My account, Ask a Librarian, Hours, Give, Alerts, Search). Give `<site-page>` (or a standalone `<site-header>`) `<a slot="site-links">` children:

```html
<site-page site-links-label="Playground">
  <a slot="site-links" href="./">Gallery</a>
  <a slot="site-links" href="./playground.html" aria-current="page">Playground</a>
  <a slot="site-links" href="https://github.com/uvalib/reusable-web-library#readme">README</a>
  …page content…
</site-page>
```

The links replace the utility links in both the inline nav on wide screens and the Menu popover on narrow ones, in order. Their `href` is used as written (not joined to `root-link-domain`), and `aria-current`, `target`, `rel` and `hreflang` are kept; mark the current page with `aria-current="page"`, which is shown bold with a thick underline. `site-links-label` names the nav (default `Site`; the popover's nav is "… menu"). Adding, removing or editing the links later updates the header. Children that are not `<a href>` are ignored with a console warning. Without site links the header is unchanged. The `vendor` header variant ignores site links and keeps its reduced link set.

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

Both are controlled: set `value` (and `scopeValue`) from your own state after each event. `min` and `max` are required for the date range; without valid ones it renders nothing and warns once in the console. Both support `no-shadow-dom` and `no-style`. See the "Search facets" preset in the playground and the generated reference below.

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

UVA Library site header: logo, utility navigation, and a popover menu on narrow screens. A site can replace the library utility links (My account, Ask a Librarian, Hours, Give, Alerts, Search) with its own: give the header `<a slot="site-links" href="…">` children. They are shown, in order, in the inline nav and the Menu popover, with `href` as written (not joined to `root-link-domain`) and their `aria-current`, `target`, `rel` and `hreflang`. The source anchors themselves stay hidden. Children that are not `<a href>` are ignored with one console warning. The `vendor` variant ignores site links and keeps its own reduced link set.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `variant` | `'full' \| 'vendor'` | `'full'` |  |
| `site-links-label` | `string \| undefined` |  | Accessible name of the nav when site links replace the utility links (default "Site"; the popover nav's name adds " menu"). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| `skip-link` | Shadow mode only: optional skip link, rendered first inside `<header>` (`<site-page>` uses it). |
| `site-links` | Optional `<a href>` elements that replace the library utility links in the inline nav and the Menu popover (ignored by the `vendor` variant). In light mode they are moved into a hidden holder. |

#### CSS parts

| Part | Description |
|---|---|
| `header` | The `<header>` element. |

#### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Utility link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Menu button colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline), and the underline colour of an `aria-current` link (also bold, with a 3px underline). |
| `--uva-brand-blue` | `#232d4b` | Skip-link background for a skip link slotted into `skip-link` (shadow mode, shared accessibility sheet). |

### `<site-page>`

Page wrapper: skip link (inside the header landmark in shadow mode), header, a single `<main>`, footer, and global page styles. Side-effect free: `site-page.ts` registers `<site-header>` and `<site-footer>`.

#### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `header-variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-global-styles` | `boolean` | `false` |  |
| `site-links-label` | `string \| undefined` |  | Accessible name of the header navigation when site links are given (default "Site"). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

#### Slots

| Slot | Description |
|---|---|
| (default) | Main page content, rendered inside the single `<main>`. |
| `pre-footer` | Optional content shown in a band above the footer. |
| `site-links` | Optional `<a href>` elements, forwarded to `<site-header>`, that replace the library utility links in the header (inline nav and Menu popover). Ignored with `header-variant="vendor"`. |

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
