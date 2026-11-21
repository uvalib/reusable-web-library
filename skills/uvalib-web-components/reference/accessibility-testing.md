# Accessibility testing

UVA Library's web standard (Web Implementation Group, "Web Standards for UVA Library"): every page meets
**WCAG 2.2 AA at minimum and aims for AAA**; critical communications such as alerts meet AAA. The components
are tested to that bar. Keep it in everything you build around them: your own markup, styles and scripts
can still break it.

Test three ways, every time: automated axe in Playwright, Lighthouse, and a short manual pass. Run the
automated checks in Light and Dark when dark mode is on, at desktop and phone widths, and after the
components have upgraded.

## 1. axe-core in Playwright, at least as strict as Lighthouse

Lighthouse's accessibility score is axe-core with the `wcag2a` and `wcag2aa` tags plus about 25 extra
rules, a few of which a default axe run leaves off (`target-size`, `identical-links-same-purpose`,
`table-fake-caption`, `td-has-header`). Run axe with those rules forced on and the WCAG 2.1/2.2 AA and
best-practice tags added, and fail on **every** impact level (minor included), so a page that passes this
test cannot lose Lighthouse accessibility points to axe.

```bash
npm i -D @playwright/test @axe-core/playwright @uvalib/web-components
```

The package ships this setup as test helpers, `@uvalib/web-components/testing` (npm only; kept in step
with the Lighthouse version these docs target): `strictAxe(page, { include?, exclude? })` waits for
`<site-page>` to upgrade (`waitForUpgrade(page)`) and runs axe with `LIGHTHOUSE_RULES` forced on and the
WCAG 2.0/2.1/2.2 A and AA and best-practice tags (`STRICT_AXE_TAGS`); `formatViolations` makes one line
per violation. Install `@uvalib/web-components` in the site's dev dependencies even if the pages use the
CDN. `tests/a11y.spec.mjs`:

```js
import { test, expect } from '@playwright/test';
import { strictAxe, formatViolations } from '@uvalib/web-components/testing';

const PAGES = ['./', './about/'];

for (const path of PAGES) {
  for (const colorScheme of ['light', 'dark']) {
    test(`${path}: no axe violations at any impact (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      const { violations } = await strictAxe(page);
      expect(formatViolations(violations)).toEqual([]);
    });
  }
}
```

The same test written by hand, without the package (keep `LIGHTHOUSE_RULES` in step with Lighthouse
yourself):

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Lighthouse 12's axe rules on top of the wcag2a/wcag2aa tags (some are off in a default axe run).
const LIGHTHOUSE_RULES = [
  'accesskeys',
  'aria-allowed-role',
  'aria-conditional-attr',
  'aria-deprecated-role',
  'aria-dialog-name',
  'aria-prohibited-attr',
  'aria-text',
  'aria-treeitem-name',
  'empty-heading',
  'heading-order',
  'html-xml-lang-mismatch',
  'identical-links-same-purpose',
  'image-redundant-alt',
  'input-button-name',
  'label-content-name-mismatch',
  'landmark-one-main',
  'link-in-text-block',
  'meta-viewport',
  'select-name',
  'skip-link',
  'tabindex',
  'table-duplicate-name',
  'table-fake-caption',
  'target-size',
  'td-has-header',
];

async function axe(page, { exclude = [] } = {}) {
  // Audit the upgraded page, not the markup before the components render.
  await page.waitForFunction(() => customElements.get('site-page') !== undefined);
  await page.evaluate(() => document.querySelector('site-page')?.updateComplete);
  let builder = new AxeBuilder({ page }).options({
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
    rules: Object.fromEntries(LIGHTHOUSE_RULES.map((id) => [id, { enabled: true }])),
  });
  for (const selector of exclude) builder = builder.exclude(selector);
  return builder.analyze();
}

const PAGES = ['./', './about/'];

for (const path of PAGES) {
  for (const colorScheme of ['light', 'dark']) {
    test(`${path}: no axe violations at any impact (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      const { violations } = await axe(page);
      expect(
        violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
      ).toEqual([]);
    });
  }
}
```

`playwright.config.mjs`, desktop and phone:

```js
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:8080/' },
  webServer: {
    command: 'npm run preview -- --port 8080',
    url: 'http://localhost:8080/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
```

Notes:

- Use relative paths (`'./'`, `'./about/'`) in `page.goto` when `baseURL` has a path (for example a GitHub Pages
  project site): `'/'` goes to the host's root, not your site.
- Test the page with real content in each state that matters: an open menu or dialog, an error state, an
  empty result. Axe only checks what is rendered.
- `exclude` is for third-party widgets you cannot change (a code editor, an embedded map). Exclude the
  smallest selector, say why in a comment, and report the issue to its owner; never exclude the library's
  own elements. An iframe showing another full page (a preview) makes landmark and heading rules compare
  two documents; test that page on its own instead.
- Dark mode: when the page has `color-scheme-switch`, `emulateMedia({ colorScheme: 'dark' })` with the
  System choice covers it. Contrast is checked per scheme.
- `waitForUpgrade(page, { selector })` waits for other elements too (say `'uvalib-card'`) before a
  screenshot or a keyboard test.
- Analytics tests use the same module: `stubMatomo(page, { siteId })` (before `page.goto`) answers
  `matomo.js` with an empty script and `matomo.php` with 204, and gives `<site-page>` that `matomo-id`;
  `matomoQueue(page)` returns `window._paq`, the page views, site searches and events the page sent. See
  the README's "Analytics" for an example, including Do Not Track.

## 2. Lighthouse CI

Assert a perfect accessibility score (it rounds, so 1 means no failing weighted audit) and keep layout
shift low. `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:8080/", "http://localhost:8080/about/"],
      "startServerCommand": "npm run preview -- --port 8080",
      "settings": { "onlyCategories": ["accessibility", "best-practices", "performance"] }
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 1, "aggregationMethod": "median" }],
        "categories:best-practices": ["error", { "minScore": 0.95, "aggregationMethod": "median" }],
        "cumulative-layout-shift": [
          "error",
          { "maxNumericValue": 0.05, "aggregationMethod": "median" }
        ]
      }
    }
  }
}
```

```bash
npx @lhci/cli autorun
```

Run it in CI on every change (for example a GitHub Actions job on pull requests and pushes to main).
Lighthouse alone is not enough: it skips some rules and reports some checks as "manual"; the Playwright
test above is the stricter gate, Lighthouse adds layout shift and best practices.

## 3. Manual checks (automated tools find about a third of problems)

- **Keyboard only:** Tab through the page. Every control is reachable, in a sensible order, with a visible
  focus ring; the skip link is first and lands on `<main>`; menus and dialogs open, close with Escape, and
  return focus where it came from; nothing traps focus.
- **Screen reader spot check:** VoiceOver (macOS/iOS) or NVDA (Windows). Headings outline the page, links
  and buttons say what they do, images have useful alt text (or `alt=""` when decorative), status
  messages are announced.
- **Zoom and reflow:** 200% zoom and a 320px-wide window: no horizontal scrolling, nothing cut off.
- **Motion and colour:** `prefers-reduced-motion` turns off non-essential motion; information is never
  conveyed by colour alone; Windows High Contrast (forced colors) keeps borders and focus visible.
- **Content:** link text makes sense out of context, `aria-label` matches the visible text (so voice
  control works), and the page has one `<h1>` with headings in order.
