// The test report: dist-site/report/ on the examples site
// (https://uvalib.github.io/reusable-web-library/report/), linked from the README.
//
// Reads what the test runs left in reports/:
//   - node.json        `pnpm test:node` (scripts/report/node-reporter.mjs)
//   - browser.json     `pnpm test:browser` (scripts/report/wtr-reporter.mjs)
//   - lighthouse.json  `pnpm lhci` (scripts/lhci.mjs)
// and writes, into dist-site/report/ (or the folder given as the first argument):
//   - index.html       the report page, in the library's own header and styles
//   - results.json     the same numbers, for scripts
//   - badges/*.json    shields.io endpoint badges for the README (tests, accessibility, lighthouse)
// A missing input is reported as "not run", never as a pass.
//
// Run after `pnpm build:site` (the page loads ../cdn/ from the built site): `pnpm report`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? join(root, 'dist-site/report'));
const { COLOR_SCHEME_SNIPPET, examples } = await import('../site/src/presets.ts');

const read = (name) => {
  const file = join(root, 'reports', name);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
};
const node = read('node.json');
const browser = read('browser.json');
const lighthouse = read('lighthouse.json');

// ---- Where these results come from ----------------------------------------------------------
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const repoUrl = `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY ?? 'uvalib/reusable-web-library'}`;
let sha = process.env.GITHUB_SHA;
try {
  sha ??= execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
} catch {
  sha = null;
}
const runUrl = process.env.GITHUB_RUN_ID
  ? `${repoUrl}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : null;
const generated = new Date();

// ---- Numbers ----------------------------------------------------------------------------------
const count = (tests) => ({
  total: tests.length,
  passed: tests.filter((t) => t.status === 'passed').length,
  failed: tests.filter((t) => t.status === 'failed').length,
  skipped: tests.filter((t) => t.status === 'skipped').length,
});
const nodeCount = node && count(node.tests);
const browserCount = browser && count(browser.tests);
const axeTests = browser ? browser.tests.filter((t) => /\baxe\b/i.test(t.name)) : [];
const axeCount = browser && count(axeTests);
const lhPages = lighthouse?.pages ?? [];
const lhPassing = lhPages.filter((p) => !p.failures.length).length;
const lhA11yPerfect = lhPages.filter((p) => p.accessibility === 1).length;

const testsRan = Boolean(node && browser);
const testsFailed = (nodeCount?.failed ?? 0) + (browserCount?.failed ?? 0);
const testsPassed = (nodeCount?.passed ?? 0) + (browserCount?.passed ?? 0);

// ---- Badges (https://shields.io/badges/endpoint-badge) -------------------------------------
const fmt = (n) => n.toLocaleString('en-US');
const badge = (label, message, ok) => ({
  schemaVersion: 1,
  label,
  message,
  color: ok === null ? 'lightgrey' : ok ? 'brightgreen' : 'red',
});
const badges = {
  tests: testsRan
    ? badge(
        'tests',
        testsFailed ? `${fmt(testsFailed)} failed` : `${fmt(testsPassed)} passed`,
        !testsFailed,
      )
    : badge('tests', 'not run', null),
  accessibility:
    browser && lighthouse
      ? badge(
          'accessibility',
          axeCount.failed || lhA11yPerfect < lhPages.length
            ? 'failing'
            : `axe ${fmt(axeCount.passed)} tests · Lighthouse 100`,
          !axeCount.failed && lhA11yPerfect === lhPages.length,
        )
      : badge('accessibility', 'not run', null),
  lighthouse: lighthouse
    ? badge(
        'lighthouse',
        `${lhPassing}/${lhPages.length} pages in budget`,
        lhPassing === lhPages.length,
      )
    : badge('lighthouse', 'not run', null),
};

// ---- The page ---------------------------------------------------------------------------------
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const titles = Object.fromEntries(examples.map((e) => [e.id, e.title ?? e.id]));
const status = (ok, yes = 'Pass', no = 'Fail') =>
  `<span class="uvalib-badge uvalib-badge--status uvalib-badge--${ok ? 'success' : 'danger'}">${ok ? yes : no}</span>`;
const notRun = '<p class="not-run">Not run for this build.</p>';
const score = (s) => (s === null || s === undefined ? '—' : Math.round(s * 100));
const ms = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`);

const assertionText = (id, a) => {
  const [, opts] = a;
  const label =
    {
      'categories:accessibility': 'Accessibility score',
      'categories:best-practices': 'Best practices score',
      'categories:performance': 'Performance score',
      'cumulative-layout-shift': 'Cumulative layout shift',
      'total-blocking-time': 'Total blocking time',
    }[id] ?? id;
  if (opts.minScore !== undefined) return `${label} at least ${Math.round(opts.minScore * 100)}`;
  if (opts.maxNumericValue !== undefined)
    return `${label} at most ${id === 'total-blocking-time' ? `${opts.maxNumericValue} ms` : opts.maxNumericValue}`;
  return label;
};

function summaryCard(heading, value, detail, ok) {
  return `<li class="card">
          <h3>${heading}</h3>
          <p class="value">${value}</p>
          <p>${detail}</p>
          ${ok === null ? '' : status(ok, 'Passing', 'Failing')}
        </li>`;
}

function lighthouseSection() {
  if (!lighthouse) return notRun;
  const rows = lhPages
    .map((p) => {
      const failed = new Set(p.failures.map((f) => f.audit));
      const cell = (value, ...audits) => {
        const bad = audits.some((a) => failed.has(a));
        return `<td${bad ? ' class="bad"' : ''}>${value}${bad ? ' <span class="visually-hidden">(over budget)</span>' : ''}</td>`;
      };
      const name = titles[p.id] ?? (p.id === 'dark-mode-forced' ? 'Dark mode (dark stored)' : p.id);
      const href =
        p.id === 'dark-mode-forced' ? '../#dark-mode' : `../#${encodeURIComponent(p.id)}`;
      return `<tr>
              <th scope="row"><a href="${href}">${esc(name)}</a></th>
              ${cell(score(p.performance), 'categories:performance')}
              ${cell(score(p.accessibility), 'categories:accessibility')}
              ${cell(score(p.bestPractices), 'categories:best-practices')}
              ${cell(p.cls === null ? '—' : p.cls.toFixed(3), 'cumulative-layout-shift')}
              ${cell(p.tbt === null ? '—' : `${Math.round(p.tbt)} ms`, 'total-blocking-time')}
              <td>${status(!p.failures.length)}</td>
            </tr>`;
    })
    .join('\n');
  return `<p>
          Each example on the examples site is audited as its own page, ${lighthouse.runsPerPage} times, with
          Lighthouse ${esc(lighthouse.lighthouse ?? '')}; the table shows the medians. The budgets every page
          must meet:
        </p>
        <ul>
          ${Object.entries(lighthouse.assertions)
            .map(([id, a]) => `<li>${esc(assertionText(id, a))}</li>`)
            .join('\n          ')}
        </ul>
        <p class="table-title" id="lighthouse-title">Lighthouse medians by example page (${lhPassing} of ${lhPages.length} within budget)</p>
        <div class="table-scroll" tabindex="0" role="region" aria-labelledby="lighthouse-title">
          <table>
            <caption class="visually-hidden">Lighthouse medians by example page (${lhPassing} of ${lhPages.length} within budget)</caption>
            <thead>
              <tr>
                <th scope="col">Example</th>
                <th scope="col">Performance</th>
                <th scope="col">Accessibility</th>
                <th scope="col">Best practices</th>
                <th scope="col">Layout shift</th>
                <th scope="col">Blocking time</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
            ${rows}
            </tbody>
          </table>
        </div>`;
}

function testsSection(data, c) {
  if (!data) return notRun;
  const byFile = new Map();
  for (const t of data.tests) {
    const key = t.group ? `${t.file} (${t.group})` : t.file;
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(t);
  }
  const files = [...byFile.entries()].sort(
    ([a, at], [b, bt]) => count(bt).failed - count(at).failed || a.localeCompare(b),
  );
  const items = files
    .map(([file, tests]) => {
      const fc = count(tests);
      const time = tests.reduce((s, t) => s + t.ms, 0);
      const list = tests
        .map(
          (t) =>
            `<li class="${t.status}"><span class="visually-hidden">${t.status}: </span>${esc(t.name)}</li>`,
        )
        .join('');
      return `<details${fc.failed ? ' open' : ''}>
            <summary><code>${esc(file)}</code> — ${fc.passed} passed${fc.failed ? `, <strong>${fc.failed} failed</strong>` : ''}${fc.skipped ? `, ${fc.skipped} skipped` : ''} <span class="time">(${ms(time)})</span></summary>
            <ul class="tests">${list}</ul>
          </details>`;
    })
    .join('\n          ');
  return `<p>
          ${esc(data.runner)}: ${fmt(c.total)} tests in ${byFile.size} files, ${fmt(c.passed)} passed,
          ${fmt(c.failed)} failed${c.skipped ? `, ${fmt(c.skipped)} skipped` : ''}. ${status(!c.failed)}
        </p>
        <div class="files">
          ${items}
        </div>`;
}

const short = sha ? sha.slice(0, 7) : 'unknown';
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Test results · UVA Library web components</title>
    <meta name="description" content="Unit, browser, accessibility and Lighthouse results for the UVA Library web components, from the last build of main." />
    <link rel="stylesheet" href="../cdn/tokens.css" />
    <link rel="stylesheet" href="../cdn/base.css" />
    <script>${COLOR_SCHEME_SNIPPET}</script>
    <script type="module" src="../cdn/site-page.js"></script>
    <style>
      main, .report { max-width: 72rem; }
      .report { margin: 0 auto; padding: 0 1rem 3rem; line-height: 1.5; }
      .report h2 { margin-top: 2.5rem; }
      .meta { color: var(--uva-color-text-muted, #4a4a4a); }
      .cards { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
      .card { border: 1px solid var(--uva-color-border, #dadada); border-radius: 0.5rem; padding: 1rem 1.25rem; background: var(--uva-color-surface-raised, #fff); }
      .card h3 { margin: 0; font-size: 1rem; }
      .card p { margin: 0.25rem 0; }
      .card .value { font-size: 1.75rem; font-weight: 700; }
      .table-scroll { overflow-x: auto; }
      .table-scroll:focus-visible { outline: 3px solid var(--uva-color-focus, #2b6cb0); outline-offset: 2px; }
      table { border-collapse: collapse; width: 100%; min-width: 40rem; }
      .table-title { font-weight: 700; margin-bottom: 0.5rem; }
      th, td { border-bottom: 1px solid var(--uva-color-border, #dadada); padding: 0.5rem 0.75rem; text-align: right; }
      th[scope='row'], thead th:first-child { text-align: left; }
      td.bad { font-weight: 700; text-decoration: underline wavy; }
      .report .uvalib-badge { white-space: nowrap; }
      details { border-bottom: 1px solid var(--uva-color-border, #dadada); padding: 0.5rem 0; }
      summary { cursor: pointer; min-height: 1.5rem; }
      .time { color: var(--uva-color-text-muted, #4a4a4a); }
      .tests { margin: 0.5rem 0 0.5rem 1rem; padding-left: 1rem; font-size: 0.9375rem; }
      .tests li.failed { font-weight: 700; list-style: '✗  '; }
      .tests li.passed { list-style: '✓  '; }
      .tests li.skipped { list-style: '–  '; color: var(--uva-color-text-muted, #4a4a4a); }
      .not-run { font-style: italic; }
      .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    </style>
  </head>
  <body>
    <site-page site-links-label="Web components" color-scheme-switch no-footer>
      <a slot="site-links" href="../">Examples</a>
      <a slot="site-links" href="./" aria-current="page">Test results</a>
      <a slot="site-links" href="${repoUrl}#readme">README</a>
      <div class="report">
        <h1>Test results</h1>
        <p class="meta">
          From the build of commit <a href="${repoUrl}/commit/${esc(sha ?? '')}"><code>${esc(short)}</code></a>
          (version ${esc(pkg.version)} in package.json), run
          <time datetime="${generated.toISOString()}">${generated.toUTCString()}</time>${runUrl ? ` in <a href="${runUrl}">GitHub Actions</a>` : ''}.
          Every push to main runs these checks before the examples site is published.
        </p>

        <h2 id="summary">Summary</h2>
        <ul class="cards">
        ${summaryCard('Tests', testsRan ? fmt(testsPassed) : '—', testsRan ? `passed of ${fmt(testsPassed + testsFailed)}: ${fmt(nodeCount.total)} build and package tests, ${fmt(browserCount.total)} component tests in Chromium` : 'not run', testsRan ? !testsFailed : null)}
        ${summaryCard('axe-core tests', browser ? fmt(axeCount.passed) : '—', browser ? `passed of ${fmt(axeCount.total)}, in shadow and light DOM, light and dark, WCAG 2.2 AA plus Lighthouse’s extra rules` : 'not run', browser ? !axeCount.failed : null)}
        ${summaryCard('Lighthouse accessibility', lighthouse ? `${lhA11yPerfect} / ${lhPages.length}` : '—', lighthouse ? 'example pages scoring 100' : 'not run', lighthouse ? lhA11yPerfect === lhPages.length : null)}
        ${summaryCard('Lighthouse budgets', lighthouse ? `${lhPassing} / ${lhPages.length}` : '—', lighthouse ? 'example pages within every budget' : 'not run', lighthouse ? lhPassing === lhPages.length : null)}
        </ul>

        <h2 id="lighthouse">Lighthouse</h2>
        ${lighthouseSection()}

        <h2 id="browser">Component tests (browser)</h2>
        <p>
          Every component in shadow and light DOM: behaviour, keyboard use, axe-core accessibility in light and
          dark mode, 320px reflow, forced colours and analytics. Network services are stubbed.
        </p>
        ${testsSection(browser, browserCount)}

        <h2 id="node">Build and package tests (Node)</h2>
        <p>The npm package, the CDN build, size budgets, the skill and the generated reference.</p>
        ${testsSection(node, nodeCount)}
      </div>
    </site-page>
  </body>
</html>
`;

mkdirSync(join(outDir, 'badges'), { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
for (const [name, b] of Object.entries(badges))
  writeFileSync(join(outDir, 'badges', `${name}.json`), JSON.stringify(b));
writeFileSync(
  join(outDir, 'results.json'),
  JSON.stringify(
    {
      commit: sha,
      version: pkg.version,
      generated: generated.toISOString(),
      run: runUrl,
      tests: { node: nodeCount, browser: browserCount, axe: axeCount },
      lighthouse: lighthouse && {
        passed: lhPassing,
        pages: lhPages.length,
        accessibility100: lhA11yPerfect,
        detail: lhPages,
      },
    },
    null,
    1,
  ),
);
console.log(
  `Test report written to ${outDir}: tests ${badges.tests.message}; accessibility ${badges.accessibility.message}; lighthouse ${badges.lighthouse.message}`,
);
