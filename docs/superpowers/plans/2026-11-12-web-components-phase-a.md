# @uvalib/web-components Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@uvalib/web-components` 1.0.0-ready: the `<site-page>` component tree ported to a single Lit/TS package, with an npm build, a CDN build with `manifest.json`, a tag-triggered CodeBuild release, an agent skill, and 11ty-template/BOV migrated to it.

**Architecture:** One package in `src/`. Every component extends `UvalibElement`, which renders into shadow DOM by default. With `no-shadow-dom` it renders into light DOM and installs its styles once per document. `tsc` emits unbundled ESM for npm; Vite emits a self-contained CDN build with shared chunks. Release is `pnpm release` locally, then a CodeBuild run triggered by the `v*` tag.

**Tech Stack:** Node 24 LTS, pnpm 10, TypeScript 5.x, Lit 3.x, Vite (current stable), @web/test-runner + @web/test-runner-playwright (Chromium), axe-core, @custom-elements-manifest/analyzer, ESLint 9 + Prettier, AWS CodeBuild/CloudFormation.

**Spec:** `docs/superpowers/specs/2026-11-12-web-components-library-design.md`

## Global Constraints

- Package name `@uvalib/web-components`; first release version `1.0.0`; `"type": "module"`; license MIT.
- Tag names are unchanged: `site-page`, `site-header`, `site-footer`, `site-analytics`, `site-style`. So are the attributes `root-link-domain`, `no-shadow-dom` and `no-style`.
- Default `root-link-domain`: `https://www.library.virginia.edu`.
- Components never set public `--uva-*` custom properties on `:host`. They read them with `var(--uva-x, <fallback>)`.
- No `role="menu"`, `role="menuitem"` or `role="menubar"` anywhere. Navigation is `<nav aria-label="…">` with a `<ul>`.
- Each page gets one `<main>` and one skip link. ARIA `id` references never cross a shadow boundary.
- Shadow roots are opened with `mode: 'open'`.
- Every `define` uses the guard `if (!customElements.get(tag))`.
- The CDN prefix is `s3://unpkg.internal.lib.virginia.edu/web-components/`. Writes go to `vX.Y.Z/` (immutable, `public, max-age=31536000, immutable`) and `vX/` (`public, max-age=300`) only. Never write to `latest/` or `cdn-v*/`.
- The npm token comes from SSM `/web-components/npm-token`.
- Lit is a `dependency` of the npm build, which keeps it external. The CDN build bundles it.
- Commit messages are conventional (`feat:`, `fix:`, `test:`, `build:`, `docs:`, `ci:`). Each ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **`root-link-domain` with a trailing slash** (`https://www.library.virginia.edu/`) should still produce single-slash links (`…edu/hours`). The test is in Task 4.
2. **Footer and header links on a non-library host** (BOV is on its own domain) must be absolute, built from `root-link-domain`, never relative `/services`. The tests are in Tasks 5 and 6.
3. **A light-DOM element that is removed and re-inserted** (moved in the DOM, or re-rendered by a framework) must not duplicate its header, footer, main or styles. The tests are in Tasks 3 and 7.
4. **Children appended to a light-DOM `<site-page>` after it upgrades** (late or JS-inserted content) should end up inside `<main>`, not after the footer. The test is in Task 7.
5. **The same tag loaded twice** (an npm bundle plus a CDN script, or two CDN versions) must not throw. The first definition wins. The tests are in Tasks 3 and 9.

---

### Task 1: Project scaffold and BOV baseline

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `web-test-runner.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, `.nvmrc` (`24`), `README.md`
- Create: `test/smoke.test.ts`
- Create: `scripts/capture-baseline.mjs`, `test/baseline/bov/*.png` (generated), `test/baseline/bov/axe.json` (generated)

**Interfaces:**
- Produces:
  - Scripts:
    - `pnpm test` runs wtr on `test/**/*.test.ts`.
    - `pnpm lint`.
    - `pnpm build:npm` runs `tsc -p tsconfig.build.json` into `dist/`.
    - `pnpm analyze` runs `cem analyze --litelement --globs "src/**/*.ts" --outdir dist`.
  - tsconfig settings: `target ES2022`, `module ESNext`, `moduleResolution bundler`, `experimentalDecorators: true`, `useDefineForClassFields: false`, `declaration: true`, `sourceMap: true`, `rootDir: src`, `outDir: dist`, `strict: true`.
  - `scripts/capture-baseline.mjs --site <dir> --pages <path,...> --out <dir> [--axe]` (Playwright): serves `<dir>` statically, screenshots each page at 1280×900 and 390×844, and writes axe results JSON.

- [ ] **Step 1: Write `package.json`** with the name, version `0.0.0` (the release script sets 1.0.0), `"type": "module"`, `"engines": {"node": ">=22"}`, `"packageManager": "pnpm@10"`, the scripts above, deps `lit`, and devDeps typescript, @web/test-runner, @web/test-runner-playwright, @open-wc/testing, axe-core, @custom-elements-manifest/analyzer, vite, eslint, typescript-eslint, prettier and playwright. Run `pnpm install` and `pnpm exec playwright install chromium`.
- [ ] **Step 2: Write the failing smoke test** `test/smoke.test.ts`: `it('runs in a browser', () => expect(typeof customElements.define).to.equal('function'))`, plus an import of `../src/index.js` (which doesn't exist yet).
- [ ] **Step 3: Run `pnpm test`.** Expected: FAIL (cannot resolve `../src/index.js`).
- [ ] **Step 4: Create `src/index.ts`** as `export {};` and configure wtr with `nodeResolve: true`, the esbuild plugin for `.ts` (`@web/dev-server-esbuild`, `ts: true`, `tsconfig`), and the Playwright Chromium launcher.
- [ ] **Step 5: Run `pnpm test`.** Expected: PASS, 1 test.
- [ ] **Step 6: Capture the BOV baseline** from the already-built `../monorepo/apps/bov-minutes/_site`, which loads the old CDN `latest`. Run: `node scripts/capture-baseline.mjs --site ../monorepo/apps/bov-minutes/_site --pages /,/minutes-old/1973-10-26/,/search/ --out test/baseline/bov --axe`. Expected: 6 PNGs and `axe.json` written, and the shell exits 0. If `/search/` doesn't exist in `_site`, list `_site` and use the search page path found there.
- [ ] **Step 7: Commit** `build: scaffold project and capture BOV baseline`.

---

### Task 2: Tokens and shared style modules

**Files:**
- Create: `scripts/sync-tokens.mjs`, `src/styles/tokens.ts` (generated, committed), `src/styles/base.ts`, `src/styles/accessible.ts`, `src/styles/w3-subset.ts`, `scripts/emit-css.mjs`
- Test: `test/sync-tokens.test.mjs` (node:test), `test/styles.test.ts`

**Interfaces:**
- Produces:
  - `tokens: CSSResult`: `:root { --uva-…: … }`, holding every scalar `$var: value;` from the theme's `_colors.scss` and `_spacing.scss` with the `$` replaced by `--`, plus `--uva-font-family: franklin-gothic-urw, Arial, Helvetica, sans-serif;` and `--uva-font-size-base: 17px;`.
  - `base: CSSResult`: html/body rules (font from `var(--uva-font-family, …)` on `html, body` with no `*` selector and no `!important`; `font-size: var(--uva-font-size-base, 17px)`; `color: var(--uva-grey-darkest, #2B2B2B)`; `box-sizing: border-box` on `*, *::before, *::after`; `body { margin: 0; line-height: 1.5; min-height: 100vh }`).
  - `accessible: CSSResult`: `.visually-hidden`, `.skip-link` (hidden until `:focus-visible`), and focus-ring rules.
  - `w3Subset: CSSResult`: only the w3.css classes the header and footer templates use (`w3-col`, `w3-row`, `w3-container`, `w3-clear`, `w3-row-padding`, `w3-mobile`). Copy those rule bodies from `../monorepo/packages/site-style/src/SiteStyleW3.ts`.
  - `TYPEKIT_URL = 'https://use.typekit.net/oym8nvz.css'`, exported from `base.ts`.
  - `node scripts/sync-tokens.mjs [--theme <dir>]` (default `../monorepo/packages/drupal_library_theme/src/scss/base`). `parseScssVars(text: string): Array<[name, value]>` is exported for tests. It ignores comments, maps and `@` rules.
  - `node scripts/emit-css.mjs <outDir>` imports `dist/styles/*.js` and writes `tokens.css` and `base.css` (each result's `.cssText`) into `<outDir>`.

- [ ] **Step 1: Write the failing node test** `test/sync-tokens.test.mjs`. `parseScssVars("// c\n$uva-brand-blue: #232D4B;\n$x-map: (a: 1);\n/// d\n$uva-teal-A: #1DA1A8;")` should deep-equal `[['uva-brand-blue','#232D4B'],['uva-teal-A','#1DA1A8']]`. Add `"test:node": "node --test test/*.test.mjs"` and include it in `pnpm test` (`pnpm test:node && wtr`).
- [ ] **Step 2: Run `pnpm test:node`.** Expected: FAIL (module not found).
- [ ] **Step 3: Implement `scripts/sync-tokens.mjs`.** Use a line regex `^\$([a-zA-Z0-9_-]+):\s*([^;()]+);` and write `src/styles/tokens.ts` with a `// GENERATED by scripts/sync-tokens.mjs from <theme path> — do not edit` header.
- [ ] **Step 4: Run `pnpm test:node`.** Expected: PASS. Then run `node scripts/sync-tokens.mjs`. Expected: `src/styles/tokens.ts` contains `--uva-brand-blue: #232D4B;`.
- [ ] **Step 5: Write the failing browser test** `test/styles.test.ts`:
  - `tokens.cssText` contains `--uva-brand-blue: #232D4B` and `--uva-font-family`.
  - `base.cssText` does not match `/!important/` or `/^\s*\*\s*\{[^}]*font-family/m`.
  - `accessible.cssText` contains `.skip-link`.
- [ ] **Step 6: Implement `base.ts`, `accessible.ts` and `w3-subset.ts`.** Run `pnpm test`. Expected: PASS.
- [ ] **Step 7: Commit** `feat: add design tokens synced from Drupal theme and shared styles`.

---

### Task 3: `UvalibElement` base, light-DOM style installer, define guard

**Files:**
- Create: `src/base/UvalibElement.ts`, `src/base/light-dom-styles.ts`, `src/base/define.ts`, `src/base.ts` (public entry re-exporting all three)
- Test: `test/base.test.ts`

**Interfaces:**
- Produces:
  - `define(tag: string, ctor: CustomElementConstructor): void`. No-op if the tag is already defined.
  - `rewriteHost(cssText: string, tag: string): string` rewrites `:host(<sel>)` to `<tag><sel>` and bare `:host` to `<tag>`.
  - `installLightDomStyles(tag: string, styles: CSSResultGroup, doc: Document = document): boolean`. It flattens `styles`, rewrites `:host`, builds one `CSSStyleSheet` and appends it to `doc.adoptedStyleSheets`. A per-document `WeakMap<Document, Set<string>>` remembers installed tags. Returns `true` only on the first install.
  - `class UvalibElement extends LitElement`:
    - `@property({type:Boolean, attribute:'no-shadow-dom'}) noShadowDom = false`
    - `@property({type:Boolean, attribute:'no-style'}) noStyle = false`
    - `protected readonly lightDom: boolean` is fixed at the first `createRenderRoot()` call from `this.hasAttribute('no-shadow-dom')`.
    - `createRenderRoot()` returns `this` in light mode. Otherwise it calls `super.createRenderRoot()`, and if `noStyle` is set it adopts `[]` instead of the class styles.
    - `connectedCallback()` in light mode calls `installLightDomStyles(this.localName, (this.constructor as typeof LitElement).elementStyles)` unless `noStyle` is set.
    - `static shadowRootOptions = {...LitElement.shadowRootOptions, mode: 'open'}`.

- [ ] **Step 1: Write the failing tests** in `test/base.test.ts`, using a test-only `x-probe extends UvalibElement` with `static styles = css\`:host{display:block} :host([hidden]){display:none} p{color:red}\`` and `render(){ return html\`<p>hi</p>\` }`:
  - `rewriteHost(':host{a:b} :host([x]) p{c:d}', 'x-probe')` returns `'x-probe{a:b} x-probe[x] p{c:d}'`.
  - The default mode has a `shadowRoot` whose `<p>` text is `hi`.
  - With `no-shadow-dom`, `shadowRoot` is null and `el.querySelector('p')` exists. With three instances, `document.adoptedStyleSheets.filter(s => [...s.cssRules].some(r => r.cssText.startsWith('x-probe'))).length === 1`.
  - With `no-shadow-dom no-style`, no sheet is added. Use a fresh tag `x-probe-nostyle` so the dedupe set doesn't hide a failure.
  - Removing a light-DOM element and re-appending it leaves exactly one `<p>` and adds no extra sheet (Review Focus 3).
  - `define('x-probe', OtherClass)` called twice doesn't throw, and `customElements.get('x-probe')` is still the original class (Review Focus 5).
- [ ] **Step 2: Run `pnpm test`.** Expected: FAIL (modules missing).
- [ ] **Step 3: Implement the three files and `src/base.ts`.**
- [ ] **Step 4: Run `pnpm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add UvalibElement base with once-per-document light-DOM styles`.

---

### Task 4: Site registry and `<site-analytics>`

**Files:**
- Create: `src/data/sites.ts`, `src/components/site-analytics/SiteAnalytics.ts`, `src/components/site-analytics/SiteAnalyticsMixin.ts`, `src/components/site-analytics/site-analytics.ts`, `src/components/link.ts`
- Test: `test/site-analytics.test.ts`, `test/link.test.ts`

**Interfaces:**
- Consumes: `UvalibElement`, `define` (Task 3).
- Produces:
  - `interface Site { name: string; matomoSiteId: number; urls?: string[]; inactive?: boolean; matomoDefault?: boolean }`
  - `export const sites: Site[]`, ported verbatim from `../monorepo/packages/webSiteInfo/listing.js`.
  - `export function findMatomoId(href: string, list = sites): number | undefined`.
  - `SiteAnalytics` and `SiteAnalyticsMixin` keep the same public API and the event names `site-analytics-event` and `site-analytics-search` as `../monorepo/packages/site-analytics/src/*`. `SiteAnalytics` extends `UvalibElement`. `:host{display:none}` is kept.
  - `export function siteLink(root: string, path: string): string` (in `src/components/link.ts`) joins with exactly one `/`. Absolute `path` values (starting with `http`) are returned unchanged.

- [ ] **Step 1: Write the failing tests.**
  - `siteLink('https://www.library.virginia.edu/', '/hours')` returns `'https://www.library.virginia.edu/hours'`, and so does `siteLink('https://www.library.virginia.edu', 'hours')` (Review Focus 1). `siteLink('x', 'https://search.lib.virginia.edu/account')` returns the second argument.
  - `findMatomoId('https://avalon.lib.virginia.edu/media/1')` returns `42`. An unknown URL returns the `matomoDefault` site's id.
  - With `window._paq = []` stubbed, `<site-analytics matomoId="5">` pushes `['setSiteId','5']`. A bubbling `site-analytics-search` event with `{searchQuery:'q', resultCount:3}` from a child pushes a `trackSiteSearch` entry.
- [ ] **Step 2: Run `pnpm test`.** Expected: FAIL.
- [ ] **Step 3: Port the registry and analytics.** Keep the logic as-is; only change the imports, the base class and the use of `define`. Put `define('site-analytics', SiteAnalytics)` in `site-analytics.ts` and nowhere else.
- [ ] **Step 4: Run `pnpm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: port site-analytics and site registry`.

---

### Task 5: `<site-header>`

**Files:**
- Create: `src/components/site-header/SiteHeader.ts`, `src/components/site-header/site-header.ts`, `demo/site-header.html`
- Test: `test/site-header.test.ts`, `test/helpers/axe.ts`

**Interfaces:**
- Consumes: `UvalibElement`, `define`, `siteLink`, `accessible`, `w3Subset`.
- Produces:
  - Attributes: `root-link-domain` (`rootLinkDomain`) and `variant` (`'full' | 'vendor'`, default `'full'`).
  - `part="header"` on the `<header>`.
  - `expectNoAxeViolations(el: Element, impacts = ['serious','critical']): Promise<void>` in `test/helpers/axe.ts`, which runs axe-core on `el` or its shadow root.
- Exact utility links for `full`, in order, built with `siteLink` except the first:
  1. "My account" → `https://search.lib.virginia.edu/account`
  2. "Ask a Librarian" → `/askalibrarian`
  3. "Hours" → `/hours`
  4. "Give" → `/support-library`
  5. "Alerts" → `/status#alerts`
  6. "Search" → `/search`
- `vendor`: the logo plus "Ask a Librarian" only, with no menu button.
- Logo: `<a href="${siteLink(root,'/')}">` containing `<img src="${siteLink(root,'/sites/default/files/2022-09/library_rgb.png')}" alt="UVA Library home">`.
- Markup:
  - `<header part="header"><a class="logo">…</a><nav aria-label="Utility"><ul>…</ul></nav><button popovertarget="utility-menu" aria-controls="utility-menu" class="menu-toggle"><svg aria-hidden="true">…</svg>Menu</button><ul id="utility-menu" popover>…same links…</ul></header>`
  - The toggle and its popover are only visible at `max-width: 992px`, and the inline nav only above that. Copy the remaining visual CSS from `../monorepo/packages/site-header/src/SiteHeader.ts`.
  - In light-DOM mode the popover `id` lives in the document, so derive it per instance (`utility-menu-${n}`).

- [ ] **Step 1: Write the failing tests**, each run in both modes with a `for (const mode of ['shadow','light'])` loop that adds `no-shadow-dom` for light:
  - With `root-link-domain="https://www.library.virginia.edu/"`, the Hours link href is `https://www.library.virginia.edu/hours` (Review Focus 1, 2).
  - No element matches `[role=menu],[role=menuitem],[role=menubar]`.
  - `nav[aria-label="Utility"] li` count is 6 for `full`. With `variant="vendor"` there is one link with text "Ask a Librarian" and no `.menu-toggle`.
  - `toggle.click()` makes the popover element match `:popover-open`, and a second click closes it.
  - Two light-mode headers on one page have different popover ids.
  - `await expectNoAxeViolations(el)`.
- [ ] **Step 2: Run `pnpm test`.** Expected: FAIL.
- [ ] **Step 3: Implement `SiteHeader`, the define file and the demo page** (both modes and both variants on one page).
- [ ] **Step 4: Run `pnpm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: port site-header with accessible utility nav, popover menu, vendor variant`.

---

### Task 6: `<site-footer>`

**Files:**
- Create: `src/components/site-footer/SiteFooter.ts`, `src/components/site-footer/site-footer.ts`, `src/components/site-footer/icons.ts`, `demo/site-footer.html`
- Test: `test/site-footer.test.ts`

**Interfaces:**
- Consumes: `UvalibElement`, `define`, `siteLink`, `accessible`, `w3Subset`, `expectNoAxeViolations`.
- Produces:
  - Attribute `root-link-domain`. Slot `pre-footer`, rendered inside `.footer--pre` only when it has assigned content. In light mode, `[slot="pre-footer"]` children are moved there.
  - `part="footer"`.
- Exact copy, matching library.virginia.edu as of 2026-11-12. All paths go through `siteLink(root, …)`:
  - `<h2>Using the Library</h2>`: Search, borrow, request `/services`; Research & teaching `/research-and-teaching`; Library spaces `/spaces`; Equipment & technology `/equipment-and-tech`; Get help `/help`.
  - `<h2>About</h2>`: About UVA Library `/about-uva-library`; Jobs and fellowships `/jobs/`; Staff directory `/staff/`; Library policies `/policies`; Status dashboard `/status`.
  - `<h2>Contact us</h2>`: `<address>` with `(434) 924-3021` (`tel:+14349243021`), `library@virginia.edu` (`mailto:`), `UVA Shannon Library`, `P.O. Box 400113`, `160 McCormick Road`, `Charlottesville, VA 22904`. Then Ask a Librarian `/askalibrarian` and Site feedback `/site-feedback`. Social links get `aria-label`s "UVA Library on Facebook" and "UVA Library on Instagram", with the SVGs moved to `icons.ts` and marked `aria-hidden="true"`. Before porting the old Twitter link, run `curl -s https://library.virginia.edu/ | grep -o 'href="https://[^"]*\(twitter\|x\.com\|facebook\|instagram\)[^"]*"'` and keep only the networks the live footer links to.
  - Post-footer: `Copyright ${new Date().getFullYear()} by the Rector and Visitors of the University of Virginia`, plus the FDLP logo link `https://guides.lib.virginia.edu/findinggovinfo` with an accessible name of "Federal Depository Library Program". Port the visual CSS from `../monorepo/packages/site-footer/src/SiteFooter.ts`, keeping the colors as `var(--uva-brand-blue, #232D4B)` and `var(--uva-blue-alt-300, #BFE7F7)`, but only if that token exists in `tokens.ts`. Otherwise keep the hex value.

- [ ] **Step 1: Write the failing tests** in both modes:
  - With `root-link-domain="https://bov.example.edu"`, every `a[href]` except `tel:`, `mailto:` and `https://guides…` and the social links starts with `https://bov.example.edu/`, and none starts with `/` (Review Focus 2).
  - The text includes `160 McCormick Road` and `Copyright ${new Date().getFullYear()}`, and doesn't include `2450 Old Ivy`.
  - `.footer--pre` is hidden (`getComputedStyle(...).display === 'none'`) with no pre-footer content, and visible with `<p slot="pre-footer">x</p>`.
  - The headings are all `h2`, with no skipped levels.
  - `await expectNoAxeViolations(el)`.
- [ ] **Step 2: Run `pnpm test`.** Expected: FAIL.
- [ ] **Step 3: Implement the footer, icons and demo.**
- [ ] **Step 4: Run `pnpm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: port site-footer with current address, live year, absolute links`.

---

### Task 7: `<site-page>` and `<site-style>`

**Files:**
- Create: `src/components/site-page/SitePage.ts`, `src/components/site-page/site-page.ts`, `src/components/site-style/SiteStyle.ts`, `src/components/site-style/site-style.ts`, `src/index.ts` (re-export all classes, no defines), `demo/site-page.html`, `demo/site-page-light.html`, `demo/bov-like.html`
- Test: `test/site-page.test.ts`, `test/site-style.test.ts`

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces:
  - `<site-page>` attributes: `root-link-domain`, `header-variant` (forwarded as `variant`), `no-global-styles`, `no-shadow-dom`, `no-style`.
    - It imports `../site-header/site-header.js` statically and `../site-footer/site-footer.js` dynamically, as today.
    - Unless `no-global-styles` is set, on first connect it installs `[tokens, base, accessible]` once on the document with `installLightDomStyles('uvalib-global', …)`, and appends one `<link rel="stylesheet" href=TYPEKIT_URL>` to `<head>` if no link with that href exists.
  - Render order: `<a class="skip-link" href="#main-content">Skip to main content</a>`, then `<site-header>`, then `<main id="main-content" tabindex="-1" part="main">` (`<slot></slot>` in shadow mode), then `<site-footer>` (`<slot name="pre-footer" slot="pre-footer">` forwarded in shadow mode). In shadow mode `no-shadow-dom` and `no-style` are passed down to the header and footer.
  - Light mode:
    - On first render, the host's original child nodes (excluding `[slot="pre-footer"]`) are moved into `<main>`, and `[slot="pre-footer"]` nodes are handed to the footer.
    - A `MutationObserver` on the host's `childList` moves any later-added node that isn't one of the rendered chrome nodes into `<main>`.
    - The rendered chrome is tracked as a `WeakSet` of the host's direct children right after `firstUpdated`.
    - The skip link focuses `<main>` with a click handler (`main.focus()`) in both modes, because a fragment link doesn't reach into a shadow root.
  - `<site-style>`: extends `UvalibElement`. Shadow mode renders `<slot>` with `static styles = [tokens, base]`. Light mode installs `[tokens, base]` on the document. The `imports` and `importedStyles` properties are ported unchanged from `../monorepo/packages/site-style/src/SiteStyle.ts`.

- [ ] **Step 1: Write the failing tests** in both modes:
  - The page has exactly one `main` (in light mode `document.querySelectorAll('main').length === 1`; in shadow mode one inside `shadowRoot`) and exactly one `#main-content`.
  - Clicking `.skip-link` makes `main` the active element (the `shadowRoot.activeElement` in shadow mode).
  - Light mode: `<site-page no-shadow-dom><p id=c>x</p></site-page>`, then `#c`'s parent is `main`. After `el.append(Object.assign(document.createElement('p'),{id:'late'}))` and `await nextFrame()`, `#late`'s parent is `main` (Review Focus 4).
  - Light mode: removing and re-appending the page still leaves one `site-header`, one `main` and one `site-footer` (Review Focus 3).
  - Global styles: `document.head.querySelectorAll('link[href="https://use.typekit.net/oym8nvz.css"]').length === 1` even with two `<site-page>` elements. With `no-global-styles` no Typekit link is added (use a fresh document from `document.implementation.createHTMLDocument` or remove the link before the test).
  - `<site-style no-shadow-dom>` makes `getComputedStyle(document.documentElement).getPropertyValue('--uva-brand-blue').trim() === '#232D4B'`.
  - `await expectNoAxeViolations(document.body)` on a full page fixture in each mode.
- [ ] **Step 2: Run `pnpm test`.** Expected: FAIL.
- [ ] **Step 3: Implement both components, `src/index.ts` and the demos.** `demo/bov-like.html` copies the `<body>` markup of `../monorepo/apps/bov-minutes/_includes/base.njk` (`<site-style no-shadow-dom></site-style><site-page>…breadcrumb + .main-content…</site-page>`) with static content.
- [ ] **Step 4: Run `pnpm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: port site-page and site-style with single main landmark and light-DOM content handling`.

---

### Task 8: npm build, exports, and package contents

**Files:**
- Modify: `package.json` (`exports`, `files`, `sideEffects`, `customElements`, `bin`, `scripts.build`)
- Create: `test/package.test.mjs` (node:test)

**Interfaces:**
- Consumes: all `src` entries.
- Produces:
  - `exports`:
    - `./site-page.js` → `./dist/components/site-page/site-page.js` (same pattern for header, footer, analytics and style)
    - `./base.js` → `./dist/base.js`
    - `.` → `./dist/index.js`
    - `./tokens.css` → `./dist/tokens.css`
    - `./base.css` → `./dist/base.css`
    - `./custom-elements.json` → `./dist/custom-elements.json`
    - `./skills/*` → `./skills/*`
    - Every JS entry also gets `types`.
  - `files: ["dist", "skills", "bin", "CHANGELOG.md"]`.
  - `sideEffects: ["./dist/components/*/site-*.js", "*.css"]`.
  - `"customElements": "dist/custom-elements.json"`.
  - `pnpm build:npm` = `tsc -p tsconfig.build.json && node scripts/emit-css.mjs dist && pnpm analyze`.
  - `pnpm build` = `pnpm build:npm && pnpm build:cdn` (`build:cdn` comes in Task 9).

- [ ] **Step 1: Write the failing test** `test/package.test.mjs`:
  - Run `pnpm build:npm` beforehand (as a `before` hook via `execSync`).
  - Every path in `exports` exists on disk.
  - `npm pack --dry-run --json` lists `dist/tokens.css`, `dist/custom-elements.json` and `skills/uvalib-web-components/SKILL.md` (the last is satisfied in Task 10, so mark it `todo` until then).
  - `dist/custom-elements.json` declares tags `site-page`, `site-header`, `site-footer`, `site-analytics` and `site-style`.
  - No file under `dist/` imports from `../src` or contains `from "lit/` paths that aren't bare specifiers.
- [ ] **Step 2: Run `pnpm test:node`.** Expected: FAIL.
- [ ] **Step 3: Set the `package.json` fields and scripts above.**
- [ ] **Step 4: Run `pnpm test:node`.** Expected: PASS, with the skill assertion still todo.
- [ ] **Step 5: Commit** `build: npm package exports, css emit, custom-elements manifest`.

---

### Task 9: CDN build and `manifest.json`

**Files:**
- Create: `vite.config.ts`, `scripts/build-manifest.mjs`, `test/cdn.test.mjs`, `test/cdn-page.test.ts` (wtr, loads built output)

**Interfaces:**
- Consumes: the define files (Tasks 4–7).
- Produces:
  - `pnpm build:cdn`: `vite build`, then `node scripts/emit-css.mjs dist-cdn`, then copy `dist/custom-elements.json`, then `node scripts/build-manifest.mjs`, then copy `skills/` to `dist-cdn/skills/`.
  - Vite config:
    - Library mode with `formats: ['es']`.
    - Entries `{ 'site-page': 'src/components/site-page/site-page.ts', … }`.
    - `rollupOptions.output`: `entryFileNames: '[name].js'`, `chunkFileNames: 'chunks/[name]-[hash].js'`.
    - Nothing external, `minify: true`, `sourcemap: true`, `outDir: 'dist-cdn'`.
  - `dist-cdn/manifest.json` = `{ "version": <package.json version>, "elements": { "<tag>": "<tag>.js", … }, "styles": ["tokens.css","base.css"] }`.

- [ ] **Step 1: Write the failing tests.**
  - `test/cdn.test.mjs`, after a `before` hook that runs `pnpm build`:
    - Every `manifest.elements` value and every `styles` entry exists in `dist-cdn/`.
    - The `version` field equals the `package.json` version.
    - No entry file contains a bare `from"lit"` import (`/from\s*["']lit/` doesn't match).
  - `test/cdn-page.test.ts`:
    - A page that imports `/dist-cdn/site-page.js` and then `/dist-cdn/site-header.js` renders `site-page` with a header, and `performance.getEntriesByType('resource')` shows each `chunks/` file fetched once.
    - Importing `/dist-cdn/site-header.js` after `/src/components/site-header/site-header.ts` (simulating an npm copy plus a CDN copy) throws no error (Review Focus 5).
- [ ] **Step 2: Run `pnpm test`.** Expected: FAIL.
- [ ] **Step 3: Implement `vite.config.ts`, `build-manifest.mjs` and the `build:cdn` script.**
- [ ] **Step 4: Run `pnpm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `build: CDN build with shared chunks and manifest.json`.

---

### Task 10: Agent skill and usage docs

**Files:**
- Create: `skills/uvalib-web-components/SKILL.md`, `skills/uvalib-web-components/reference/components.md` (generated), `skills/uvalib-web-components/reference/migration.md`, `scripts/gen-skill-reference.mjs`, `bin/install-skill.mjs`, `docs/usage.md`, `docs/migration.md`
- Test: `test/skill.test.mjs`, `test/skill-snippets.test.ts`

**Interfaces:**
- Consumes: `dist/custom-elements.json` (Task 8) and the `dist-cdn` layout (Task 9).
- Produces:
  - `node scripts/gen-skill-reference.mjs [--check]` writes `reference/components.md` from the manifest. For each tag it lists the attributes (name, type, default), slots, CSS parts, events and CSS custom properties. With `--check` it exits 1 if the file differs. It runs as part of `pnpm build:npm`.
  - `bin/install-skill.mjs`, exposed as `"bin": {"uvalib-web-components": "bin/install-skill.mjs"}` and run as `npx @uvalib/web-components install-skill [--dir .claude/skills]`. It copies `skills/uvalib-web-components` into `<dir>/uvalib-web-components` and refuses to overwrite without `--force`.
  - `SKILL.md`:
    - Frontmatter `name: uvalib-web-components` plus a description that triggers on UVA Library sites, pages, headers or footers, `<site-page>`/`<site-header>`/`<site-footer>`, `@uvalib/web-components`, or unpkg.internal.lib.virginia.edu.
    - The body covers every item listed in spec §9 ("Contents").
    - Snippets go in fenced blocks tagged `html snippet` (plain HTML via CDN `v1`), `njk snippet` (11ty) and `js snippet` (Vite/npm).
  - `migration.md` maps every old URL pattern (`/web-components/latest/@uvalib/<pkg>/<file>.js`, `/web-components/cdn-vX.Y.Z/@uvalib/<pkg>/<file>.js`) and old npm name (`@uvalib/site-page`, `site-header`, `site-footer`, `site-analytics`, `site-style`, `webSiteInfo`) to its new equivalent.

- [ ] **Step 1: Write the failing tests.**
  - `test/skill.test.mjs`:
    - `SKILL.md` frontmatter parses, with `name === 'uvalib-web-components'` and a description of at most 1024 characters.
    - `gen-skill-reference.mjs --check` exits 0.
    - `components.md` mentions every tag in the manifest.
    - Running `bin/install-skill.mjs --dir <tmp>` creates `<tmp>/uvalib-web-components/SKILL.md`, and a second run without `--force` exits non-zero.
    - Remove the `todo` mark from the Task 8 skill-in-pack assertion.
  - `test/skill-snippets.test.ts`: extract each `html snippet` block from `SKILL.md`, rewrite `https://unpkg.internal.lib.virginia.edu/web-components/v1/` to `/dist-cdn/`, mount it in a test iframe, then assert that every custom element in it `:defined` within 2 s, that no `error` events fire, and that the iframe has exactly one `main`.
- [ ] **Step 2: Run `pnpm test`.** Expected: FAIL.
- [ ] **Step 3: Write the generator, the bin script, `SKILL.md`, the reference files and the two docs.** `docs/usage.md` is the human-facing version of the same content and links to the skill install command.
- [ ] **Step 4: Run `pnpm test`.** Expected: PASS.
- [ ] **Step 5: Evaluate the skill with the `skill-creator` workflow.** Use three prompts, each in a scratch project:
  1. "add the UVA Library header and footer to this plain HTML page"
  2. "convert this 11ty layout to use the library page wrapper"
  3. "our page has a sidebar nav and its own <main>; add the library chrome"

  The expected output pins `v1` or an exact version, never `latest/`, has one `main`, and uses `no-shadow-dom` only when asked to defer to host CSS. Revise `SKILL.md` until all three pass.
- [ ] **Step 6: Commit** `feat: agent skill for using the components, generated reference, install-skill bin`.

---

### Task 11: Release script and CodeBuild pipeline

**Files:**
- Create: `scripts/release.mjs`, `pipeline/buildspec.yml`, `pipeline/codebuild.yml`, `pipeline/publish-cdn.sh`, `CHANGELOG.md`
- Test: `test/release.test.mjs`, `test/publish-cdn.test.mjs`

**Interfaces:**
- Produces:
  - `pnpm release <patch|minor|major> [--dry-run]`. It refuses unless the tree is clean and on `main`. It runs `pnpm lint && pnpm test && pnpm build`, computes the version (`0.0.0` + `major` gives `1.0.0`), writes it to `package.json`, and prepends a `## vX.Y.Z — YYYY-MM-DD` section to `CHANGELOG.md` from `git log <lastTag>..HEAD --format=%s`, grouped by conventional type. Then it commits `release: vX.Y.Z`, tags `vX.Y.Z` and runs `git push --follow-tags`. With `--dry-run` it prints the actions and doesn't commit, tag or push. The pure helpers `nextVersion(current, bump)` and `renderChangelog(version, date, subjects)` are exported.
  - `pipeline/publish-cdn.sh <version>`, with env `BUCKET`, `PREFIX=web-components` and `DISTRIBUTION_ID`, and `DRY_RUN=1` printing the commands instead of running them:
    1. `aws s3 ls s3://$BUCKET/$PREFIX/v$version/`. If anything exists, exit 3.
    2. `aws s3 cp dist-cdn s3://$BUCKET/$PREFIX/v$version/ --recursive --cache-control "public, max-age=31536000, immutable"`
    3. `aws s3 sync dist-cdn s3://$BUCKET/$PREFIX/v$major/ --delete --cache-control "public, max-age=300"`
    4. `aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/$PREFIX/v$major/*"`
  - `buildspec.yml`:
    - Node 24 runtime. Install: `corepack enable && pnpm install --frozen-lockfile && pnpm exec playwright install --with-deps chromium`.
    - Build: `pnpm lint && pnpm test && pnpm build`.
    - If `CODEBUILD_WEBHOOK_TRIGGER` starts with `tag/v`:
      1. Assert that the tag equals `v$(node -p "require('./package.json').version")`.
      2. Write `//registry.npmjs.org/:_authToken=${NPM_TOKEN}` to `.npmrc`.
      3. If `npm view @uvalib/web-components@$VERSION version` already returns the version, skip the publish; otherwise `npm publish --access public`.
      4. Run `pipeline/publish-cdn.sh $VERSION`.
    - `NPM_TOKEN` comes from `parameter-store: /web-components/npm-token`.
  - `codebuild.yml` (CloudFormation):
    - Parameters: `GitHubRepoUrl` (default `https://github.com/uvalib/reusable-web-library`), `BucketName` (default `unpkg.internal.lib.virginia.edu`), `DistributionId`.
    - Resources: an `AWS::CodeBuild::Project` with webhook filter groups `[EVENT: PUSH, HEAD_REF: ^refs/tags/v.*]`, `[EVENT: PUSH, HEAD_REF: ^refs/heads/main$]` and `[EVENT: PULL_REQUEST_CREATED,PULL_REQUEST_UPDATED, BASE_REF: ^refs/heads/main$]`, plus an IAM role allowing:
      - `s3:ListBucket` on the bucket, with the `s3:prefix` condition `web-components/v*`
      - `s3:PutObject` and `s3:DeleteObject` on `arn:aws:s3:::${BucketName}/web-components/v*`
      - `cloudfront:CreateInvalidation` on the distribution
      - `ssm:GetParameters` on `/web-components/npm-token`
      - CloudWatch Logs

- [ ] **Step 1: Write the failing tests.**
  - `test/release.test.mjs`:
    - `nextVersion('0.0.0','major')` returns `'1.0.0'`, `nextVersion('1.2.3','patch')` returns `'1.2.4'` and `nextVersion('1.2.3','minor')` returns `'1.3.0'`.
    - `renderChangelog('1.0.0','2026-11-12',['feat: a','fix: b','chore: c'])` contains `## v1.0.0 — 2026-11-12`, a `### Features` list with `a` and a `### Fixes` list with `b`.
  - `test/publish-cdn.test.mjs`: run the script with `DRY_RUN=1` and a stub `aws` on `PATH` that prints its arguments and returns empty output for `ls`. Assert that the output shows the `cp` to `v1.0.0/` with `immutable`, the `sync` to `v1/` with `max-age=300`, and an invalidation of `/web-components/v1/*`, and that nothing contains `latest` or `cdn-v`. With a stub `ls` that returns a file, the exit code is 3.
- [ ] **Step 2: Run `pnpm test:node`.** Expected: FAIL.
- [ ] **Step 3: Implement the four files.** Start `CHANGELOG.md` with a `# Changelog` header.
- [ ] **Step 4: Run `pnpm test:node`.** Expected: PASS. Then validate the template: `aws cloudformation validate-template --template-body file://pipeline/codebuild.yml` exits 0. This is read-only and doesn't deploy anything.
- [ ] **Step 5: Commit** `ci: release script, CodeBuild buildspec, CloudFormation template`.

---

### Task 12: Migrate 11ty-template and verify BOV (in `../monorepo`)

**Files (in `/Users/dhc4z/workspace/monorepo`, on a new branch `web-components-phase-a`):**
- Modify: `packages/11ty-template/eleventy-custom-elements-plugin.js`, `packages/11ty-template/.eleventy.js:53`, `packages/11ty-template/package.json`, `packages/11ty-template/README.md`
- Create: `packages/11ty-template/test/plugin.test.mjs`
- Verify with: `scripts/capture-baseline.mjs` from this repo

**Interfaces:**
- Consumes: `@uvalib/web-components/dist-cdn/manifest.json` shape (Task 9).
- Produces:
  - Plugin options:
    - `webComponentsVersion` (default `'1'`; values: `'1'` → path `v1`, `'1.0.0'` → `v1.0.0`)
    - `webComponentsBaseUrl` (default `https://unpkg.internal.lib.virginia.edu/web-components`)
    - `manifestPath`, which defaults to the installed `@uvalib/web-components` package's `manifest.json`. Add `"./manifest.json": "./dist-cdn/manifest.json"` to this repo's `exports` and include `dist-cdn` in `files`; amend Task 8's export test.
    - `version` (legacy, still used for `map.yml` tags)
  - Resolution order per tag found in the HTML: the new manifest first, then the legacy `map.yml`. A tag appears in at most one script tag.
  - Exported pure helper `scriptsFor(html: string, opts): string[]`.

- [ ] **Step 1: In this repo, add the `./manifest.json` export,** update the Task 8 test, run `pnpm test`, and commit `build: export CDN manifest for loaders`.
- [ ] **Step 2: In the monorepo, run `git switch -c web-components-phase-a`.** Add the dependency `"@uvalib/web-components": "link:../../../reusable-web-library"` for local verification; Step 8 swaps it for `^1.0.0` after the first publish. Run `pnpm install`.
- [ ] **Step 3: Write the failing test** `packages/11ty-template/test/plugin.test.mjs` (node:test). `scriptsFor('<site-page></site-page><bento-box></bento-box>', {webComponentsVersion:'1', version:'latest'})` returns:
  - exactly one URL ending `/web-components/v1/site-page.js`
  - exactly one bento-box URL from `map.yml` containing `/web-components/latest/`
  - nothing for `<site-header>` absent from the HTML

  With `webComponentsVersion:'1.0.0'`, the site-page URL contains `/v1.0.0/`.
- [ ] **Step 4: Run `node --test packages/11ty-template/test`.** Expected: FAIL.
- [ ] **Step 5: Refactor the plugin around `scriptsFor`** and set `.eleventy.js` to pass `webComponentsVersion: "1"` alongside `version: "latest"`.
- [ ] **Step 6: Run the test.** Expected: PASS.
- [ ] **Step 7: Verify BOV against a local CDN.**
  1. Build the library (`pnpm build` in this repo).
  2. Serve `dist-cdn` at `http://localhost:4400/web-components/v1/` (Vite preview or `npx serve`, with the directory mapped).
  3. Rebuild BOV with `webComponentsBaseUrl: 'http://localhost:4400/web-components'` (env override `WEB_COMPONENTS_BASE_URL`, read in `.eleventy.js`) using `pnpm --filter @uvalib/bov-minutes build-wip`.
  4. Run `node scripts/capture-baseline.mjs --site ../monorepo/apps/bov-minutes/_site --pages <same pages as Task 1> --out test/baseline/bov-after --axe`.
  5. Compare with `test/baseline/bov`, using `pixelmatch` via a short `scripts/compare-baseline.mjs <before> <after>` that prints the percentage of differing pixels for each image.

  Expected:
  - The header and footer regions match visually. Allowed differences: footer address and copyright text, menu toggle text on mobile.
  - `axe.json` serious and critical counts in the "after" run are less than or equal to the baseline counts for every page.
  - No console errors.

  Record the numbers in the commit message. If a difference outside the allowed list exceeds 1% of pixels, stop and report it instead of committing.
- [ ] **Step 8: Commit in the monorepo** `feat(11ty-template): load site-page tree from @uvalib/web-components manifest`. Leave the `link:` dependency in place, and note in the README that it changes to `^1.0.0` after the first npm publish. Don't push; the user decides when the monorepo branch goes up.
- [ ] **Step 9: Smoke-check modern-library-biblio** with `pnpm --filter modern-library-biblio build` (or its build script). Expected: the build succeeds, and its pages still reference only legacy `map.yml` URLs.

---

## Not in this plan (needs the repo owner)

- Pushing to `origin` (`https://github.com/uvalib/reusable-web-library`, currently empty) — only with the user's go-ahead.
- Storing the npm token in SSM.
- Deploying `pipeline/codebuild.yml`.
- Running `pnpm release major` for 1.0.0.
- Swapping 11ty-template to `^1.0.0` and pushing the monorepo branch.

These follow the spec's §12 open items.
