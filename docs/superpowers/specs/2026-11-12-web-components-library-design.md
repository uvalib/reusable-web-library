# UVA Library Web Components — Phase A Design

**Date:** 2026-11-12
**Status:** Draft for review
**Scope:** Phase A of three (see "Phasing")

## 1. Goal

Move the UVA Library's reusable web components out of `uvalib/monorepo` into this standalone project. They should be easy to consume in two ways:

- **npm:** `npm i @uvalib/web-components`, then `import '@uvalib/web-components/site-page.js'`
- **CDN script tag:** `<script type="module" src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js">`

Both come from one repo, one version number and one automated release.

### Guiding constraints

- **library.virginia.edu is the authority** for styles and patterns. The UX team's design system, which soft-launches on that site in 2026, is the reference for layout and accessibility rules. The long-term aim is for these components to be usable on library.virginia.edu itself.
- **Shadow DOM opt-out stays.** Components built for library.virginia.edu are used with `no-shadow-dom` (and `no-style`) because the site's designer works in global CSS. That contract must keep working.
- **Existing markup keeps working.** Tag names and attributes are unchanged: `<site-page>`, `<site-style no-shadow-dom>`, `root-link-domain`, `no-style`.
- **Follow modern web platform practice**, as captured by the `modern-web-guidance` skill: semantic landmarks, inherited custom-property theming, shared constructed stylesheets, and site navigation that isn't built as an ARIA menu.

### Phasing

| Phase | Contents |
|---|---|
| **A (this spec)** | New project, tooling, npm + CDN release pipeline; the `<site-page>` tree (`site-page`, `site-header`, `site-footer`, `site-analytics`, `site-style`, plus the `webSiteInfo` registry); migrate `11ty-template` → BOV. |
| B | library.virginia.edu components (`site-hours`, `bento-box`, `data-wrap`, `site-components`, …); migrate `drupal_module_loader` and `drupal_library_theme`. |
| C | Retire monorepo copies, `cdn-builds`, the old CodeBuild pipeline, and the abandoned `web-design-system` / `uvalib-web-components` packages. |

## 2. Current state (summary of findings)

- **Packaging:** each component is its own `@uvalib/site-*` workspace package, built with per-package `tsc` and open-wc configs. Almost none are published to npm (`site-page` and `site-footer` don't exist there). They only reach consumers through `packages/cdn-builds`.
- **CDN:** `unpkg.internal.lib.virginia.edu` is an S3 bucket behind CloudFront, not an unpkg server. A CodeBuild job (`pipeline/web-components-buildspec.yml`) uploads a **hand-built, committed** `cdn-builds/build/` folder to `/web-components/latest` and copies it to `/web-components/cdn-vX.Y.Z`. Problems:
  - CI builds nothing.
  - `deployCDNBuildPatch` calls a script that no longer exists.
  - `git describe` makes every run overwrite the most recent version folder.
  - The invalidation path lacks `/*`.
  - `map.yml` is out of date.
- **Shadow DOM opt-out:** `SiteStyle` has `no-shadow-dom` / `no-style` attributes. In light-DOM mode it renders into the host and injects a `<style>` per instance, rewriting `:host` to the tag name. `site-hours` and `bento-box` extend it. `site-page`, `site-header` and `site-footer` don't; they always use shadow DOM.
- **Consumers:**
  - Drupal, through `drupal_module_loader`. It reads a stale map, and one view is pinned to `cdn-v2.2.3`.
  - `11ty-template`, which injects `latest` script tags from `map.yml`. BOV and modern-library-biblio use it.
  - `site-mock`.
- **Design and a11y problems found in the `<site-page>` tree:**
  - The utility nav uses `role="menu"`/`menuitem`.
  - `id="main-content"` appears twice, and `role="main"` sits on a nested div.
  - The mobile menu button does nothing.
  - The footer has a stale address and a hardcoded copyright year of 2023.
  - `site-page` silently adds `* { font-family … !important }` and other global rules to the document.

## 3. Repository layout

```
reusable-web-library/
  package.json              # @uvalib/web-components
  tsconfig.json
  vite.config.ts            # CDN build
  web-test-runner.config.mjs
  src/
    base/
      UvalibElement.ts      # shadow / light-DOM rendering base class
      light-dom-styles.ts   # once-per-document stylesheet installer
    styles/
      tokens.css            # GENERATED from Drupal theme; custom properties only
      base.css              # opt-in page-level base (fonts, html/body)
      tokens.ts / base.ts   # Lit css`` wrappers of the above
      w3-subset.ts          # only the w3.css rules the components use
      accessible.ts         # visually-hidden, skip-link, focus styles
    components/
      site-page/            SitePage.ts, site-page.ts (define)
      site-header/          SiteHeader.ts, site-header.ts
      site-footer/          SiteFooter.ts, site-footer.ts
      site-analytics/       SiteAnalytics.ts, SiteAnalyticsMixin.ts, site-analytics.ts
      site-style/           SiteStyle.ts, site-style.ts   # compatibility element
    data/
      sites.ts              # was packages/webSiteInfo/listing.js
    index.ts                # registers nothing; re-exports classes
  demo/                     # one page per component, each in shadow + no-shadow-dom modes
  test/                     # per-component unit + axe tests
  scripts/
    sync-tokens.mjs         # Drupal theme SCSS → src/styles/tokens.css
    release.mjs             # local release command
    build-manifest.mjs      # emits dist-cdn/manifest.json
  pipeline/
    buildspec.yml           # CodeBuild: CI + release
    codebuild.yml           # CloudFormation: project, role, webhook
  skills/
    uvalib-web-components/  # agent skill: SKILL.md + reference/ (see §9)
  docs/
    usage.md, migration.md, superpowers/specs/…
```

Each component's `<name>.ts` file only calls `customElements.define()`, guarded with `if (!customElements.get(name))`. That way, loading the same tag from both npm and the CDN doesn't throw. The class files have no side effects.

## 4. Component architecture

### 4.1 `UvalibElement` base class

`UvalibElement extends LitElement` and replaces `SiteStyle` as the base class for every component in this library.

| Attribute | Behaviour |
|---|---|
| (none) | Renders into an open shadow root. Styles are applied through `adoptedStyleSheets` from shared `CSSStyleSheet` objects, so there is one parse per class. |
| `no-shadow-dom` | `createRenderRoot()` returns `this`, so the element renders into light DOM. On first connect, the class's styles (with `:host` rewritten to the tag name) are installed **once per document per tag** as a constructed sheet appended to `document.adoptedStyleSheets`. No per-instance `<style>` element. |
| `no-shadow-dom no-style` | Light DOM with no component styles installed. The host page's CSS styles everything, which is how library.virginia.edu uses it. |
| `no-style` (shadow) | Shadow DOM with only structural styles. |

Rules for every component:

- In `no-shadow-dom` mode, `<slot>` has no effect. Components must render correctly when consumer children are left in place. In practice:
  - Container components (`site-page`) render their chrome *around* the existing children. They insert header before and footer after, and wrap the children in `<main>`. They don't project through a slot.
  - The mode is read once at first connect, and changing it later isn't supported. This matches today's behaviour.
- Use semantic elements: `<header>`, `<nav aria-label>`, `<main>`, `<footer>`, real `<button>` and `<a>`. No ARIA menu roles for site navigation.
- ARIA `id` references stay inside one tree.
- Theme only through inherited custom properties (`var(--uva-…, fallback)`). Never seed the public custom properties on `:host`. Use private `--_x` aliases where a fallback would otherwise repeat.
- `::part()` is exposed only for a few high-level elements: `header`, `footer`, `main`.

### 4.2 `<site-style>` (compatibility element)

`<site-style>` is kept so existing pages (`<site-style no-shadow-dom>`) work. It now extends `UvalibElement`. Its job is to install the library tokens and base styles: on the document in `no-shadow-dom` mode, or in its own shadow root otherwise. Its old `imports` / `importedStyles` dynamic-CSS properties are carried over unchanged. Their only users are phase B components.

### 4.3 Tokens and global styles

- `scripts/sync-tokens.mjs` reads `drupal_library_theme/src/scss/base/_colors.scss` (plus fonts and spacing where defined), taking a path or git ref as its input. It writes `src/styles/tokens.css`, which declares only custom properties on `:root`. The file is committed, and the script is re-run whenever the site's theme changes. It replaces `site-style/scripts/scssColors2Lit.js`.
- `tokens.css` and `base.css` are published as npm exports and CDN files, so plain HTML pages can link them without any component.
- **`site-page` global styles become explicit:**
  - By default `site-page` still installs `base.css` (html/body rules, Typekit font link), so BOV looks the same.
  - `site-page no-global-styles` turns this off.
  - The `* { font-family … !important }` rule is replaced by setting the font on `html` and `body`. That way the font inherits instead of overriding everything with `!important`.

### 4.4 Component changes

**`<site-page>`**
- Attributes: `root-link-domain` (unchanged), `header-variant` (passed to the header), `no-global-styles`, `no-shadow-dom`, `no-style`.
- Renders one skip link, then `<site-header>`, then `<main id="main-content" tabindex="-1">` wrapping the content, then `<site-footer>`. The duplicate ids and `role="main"` are removed.
- Keeps the `pre-footer` slot, which only renders when it has content. In light-DOM mode, `[slot="pre-footer"]` children are moved into the footer region.

**`<site-header>`**
- The utility links become `<nav aria-label="Utility"><ul>…</ul></nav>`, without menu roles.
- The hamburger becomes a real disclosure. A `<button popovertarget aria-controls>` with visible "Menu" text toggles a popover list of the utility links. Popover is Baseline widely available, so no polyfill is needed.
- `variant="full"` is the default and matches today's header. `variant="vendor"` shows only the logo (linking to `root-link-domain`) and Ask a Librarian, per the design system's layout for third-party and vendor sites.
- The logo image gets meaningful alt text ("UVA Library home").

**`<site-footer>`**
- Same visual design.
- Address updated to the current one shown on library.virginia.edu.
- The copyright year is computed when the footer renders.
- Uses `<footer>` and headings in order. Social links have accessible names.
- Keeps the `pre-footer` slot.

**`<site-analytics>`**
- Logic unchanged: Matomo, SPA mode, the `site-analytics-event` / `site-analytics-search` events, and `SiteAnalyticsMixin`.
- The site registry is imported from `src/data/sites.ts`.

## 5. Build outputs

### 5.1 npm (`dist/`)

- `tsc` produces unbundled ES2022 modules, `.d.ts` files and source maps. `cem analyze` produces `custom-elements.json`.
- `package.json` `exports`: `./site-page.js`, `./site-header.js`, `./site-footer.js`, `./site-analytics.js`, `./site-style.js`, `./base.js`, `./tokens.css`, `./base.css`, `./custom-elements.json`.
- `lit` is a `dependency`, not bundled, so applications dedupe it. `"sideEffects"` lists only the `define` files and the CSS.

### 5.2 CDN (`dist-cdn/`)

- Vite library mode, ESM output, with one entry per component. Lit and shared code are split into hashed files in `chunks/`, so a page loading several components downloads Lit once.
- Also contains `tokens.css`, `base.css`, `custom-elements.json` and **`manifest.json`**:
  ```json
  { "version": "1.0.0",
    "elements": { "site-page": "site-page.js", "site-header": "site-header.js", … },
    "styles": ["tokens.css", "base.css"] }
  ```
  Loaders (the 11ty plugin now, the Drupal module in phase B) read this instead of `map.yml`.

## 6. CDN layout and caching

Same bucket (`s3://unpkg.internal.lib.virginia.edu`) and CloudFront distribution, under `/web-components/`:

| Path | Written when | Cache-Control |
|---|---|---|
| `/web-components/vX.Y.Z/…` | every release; **the upload fails if the prefix already exists** (immutable) | `public, max-age=31536000, immutable` |
| `/web-components/vX/…` | every release of major X (replaced with `--delete`) | `public, max-age=300` |

- The legacy `/web-components/latest/` and `/web-components/cdn-v*/` prefixes are **never written** by this project. Drupal, modern-library-biblio and site-mock keep loading them until phases B and C.
- There is no new "latest across majors" alias. Sites use either an exact version or a major alias.
- Each release invalidates CloudFront for `/web-components/vX/*` only. Exact-version paths are new on every release, so they never need invalidating.

## 7. Release pipeline (AWS CodeBuild)

**Local step:** `pnpm release <patch|minor|major>` (`scripts/release.mjs`). It:

1. Checks that the working tree is clean and on `main`.
2. Runs lint, tests and build.
3. Bumps `package.json`, prepends `CHANGELOG.md` entries from commits since the last tag, commits `release: vX.Y.Z`, tags `vX.Y.Z` and pushes.

**CodeBuild** (`pipeline/buildspec.yml`), triggered through a GitHub webhook:

- Push or PR to `main`: install, lint, test (headless Chromium), and both builds. Nothing is published.
- Tag `v*`:
  1. Everything above.
  2. Check that the tag matches `package.json`.
  3. `npm publish --access public`, using a token read from SSM (`/web-components/npm-token`).
  4. Upload `dist-cdn/` to `vX.Y.Z/`, after checking that the prefix doesn't already exist.
  5. Sync to `vX/`.
  6. Invalidate `/web-components/vX/*`.
- If npm publishing succeeds but the S3 step fails, re-running the build skips the publish once that version exists on npm, and finishes the S3 steps.

**Infrastructure as code:** `pipeline/codebuild.yml` (CloudFormation) defines the CodeBuild project, its IAM role (S3 write on `web-components/v*`, CloudFront invalidation, SSM read on the token) and the webhook filters. The template is written as part of this project. Deploying it, creating the npm automation token, and providing the CloudFront distribution ID are steps for the repo owner or ops.

**Versioning:** semver. The first release is `1.0.0`. Breaking changes to tags, attributes, slots, parts or token names require a major version bump.

## 8. Consumer migration (Phase A)

**`packages/11ty-template` (in monorepo)**
- Change `eleventy-custom-elements-plugin.js` to resolve tags in this order:
  1. The new library's `manifest.json` (from the installed `@uvalib/web-components` package), producing `…/web-components/v{major}/<file>` URLs.
  2. Otherwise the old `cdn-builds` `map.yml`, as today, for tags not yet migrated (`bento-box`, `site-menu-bar`, …).
- Add a `webComponentsVersion` option, defaulting to `"1"` (the major alias). Sites can pin an exact version.
- Add `@uvalib/web-components` as a dependency.

**`apps/bov-minutes`**
- No template changes are expected. It picks up the new URLs through 11ty-template.
- Verification:
  1. Before migrating, capture Playwright screenshots of the BOV home page, one minutes page and the search page.
  2. After migrating, capture them again and compare.
  3. Run axe on the same pages before and after. The expected result is no visual regressions and fewer a11y violations.

**`apps/modern-library-biblio`:** also uses 11ty-template, but uses none of the five migrated tags. It is expected to be unchanged, and its home page is smoke-checked.

**Docs:** `docs/usage.md` covers both consumption paths, the shadow and light-DOM modes, and tokens. `docs/migration.md` maps the old URLs (`/web-components/latest/@uvalib/site-page/site-page.js`) and npm names (`@uvalib/site-page`) to the new ones.

## 9. Agent skill: using the components

The project includes an agent skill that teaches coding agents (Claude Code and others that read `SKILL.md` skills) how to use these components correctly in other projects.

**Location and distribution**
- Source: `skills/uvalib-web-components/` in this repo.
- It ships inside the npm package (listed in `files`). An agent in a consuming project can find it at `node_modules/@uvalib/web-components/skills/uvalib-web-components/SKILL.md`.
- It's published to the CDN at `/web-components/vX.Y.Z/skills/…`, so sites that only use script tags can fetch it.
- `docs/usage.md` explains how to install it into a project:
  - copy or symlink it into `.claude/skills/`, or
  - run `npx @uvalib/web-components install-skill`, a small bin script that copies the skill into `./.claude/skills/uvalib-web-components/`.

**Contents**
- `SKILL.md`:
  - A trigger description covering UVA Library sites, pages, headers and footers, the `<site-page>` tags, and unpkg.internal.lib.virginia.edu.
  - Decision rules:
    - npm import vs CDN script tag, and when to use each.
    - Pin an exact version or use the major alias. Never use the legacy `latest/` paths.
    - Shadow DOM vs `no-shadow-dom` / `no-style`, and when a host site's own CSS should own the styling.
  - Required page structure: one `<site-page>` per page; don't add a second `<main>`, skip link or header.
  - Theming only through `--uva-*` tokens and the documented `::part`s, never by reaching into internals.
  - The library.virginia.edu / design system authority rule.
  - Ready-to-paste snippets for plain HTML, 11ty and a bundled app (Vite).
  - A verification checklist: components defined, one `<main>`, an axe pass, no console errors.
- `reference/components.md` is **generated at build time from `custom-elements.json`**: tags, attributes, slots, parts, events and CSS custom properties. It can't drift from the code, and a test fails if the committed copy is stale.
- `reference/migration.md` maps old URLs and package names to new ones, for agents updating existing projects.

**Testing**
- The build test checks that the skill and its reference files are in both the npm package and the CDN output.
- Every snippet in `SKILL.md` is extracted and loaded in a test page against the built output, and must render without errors.
- The skill is authored and evaluated with the `skill-creator` workflow: a few realistic prompts, e.g. "add the library header and footer to this 11ty site", checked for correct output.

## 10. Testing

- `@web/test-runner` with Playwright Chromium, run on every component in **both** shadow and `no-shadow-dom` modes:
  - Rendering and attributes: `root-link-domain` links, header variants, pre-footer visibility, the computed copyright year.
  - Light-DOM style installation happens once per document even with several instances, and `no-style` installs nothing.
  - The skip link moves focus to `<main>`.
  - The mobile menu popover opens and closes, and has the correct name and controls.
  - The `define` guard: importing a component twice does not throw.
  - axe-core runs against each demo fixture, with zero serious or critical violations.
- A build test checks that `dist-cdn/manifest.json` lists every entry and every file exists, and that `npm pack` includes every export target.
- The BOV visual and axe comparison from §8, and the skill checks from §9.

## 11. Out of scope for Phase A

- Phase B components and the Drupal module and theme changes.
- Removing anything from the monorepo or the old pipeline (phase C).
- Rebuilding the header around the design system's full main-site layout (drop-down main navigation). That waits for the design system's header and footer layout pages to be published.
- Declarative Shadow DOM / SSR output.

## 12. Open items for the repo owner

- ~~GitHub repo~~ — resolved: `https://github.com/uvalib/reusable-web-library` (origin).
- npm automation token for the `@uvalib` org, stored in SSM.
- Deploying `pipeline/codebuild.yml`: needs the CloudFront distribution ID and GitHub connection approval.
- Access to the draft design-system pages in Confluence. The Hoo Helper service account can read the UX meeting notes but not the component pages themselves.
