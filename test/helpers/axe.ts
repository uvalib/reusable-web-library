import type AxeCore from 'axe-core';

type AxeWindow = Window & { axe?: typeof AxeCore };

// axe-core is CommonJS, so it has no ES default export under wtr's nodeResolve:
// load the minified bundle with a classic script tag instead. axe audits the document
// it is loaded into, so it is loaded into the element's own window (for example a
// same-origin iframe).
const axePromises = new WeakMap<Window, Promise<typeof AxeCore>>();
function loadAxe(win: AxeWindow): Promise<typeof AxeCore> {
  let p = axePromises.get(win);
  if (!p) {
    p = new Promise((resolve, reject) => {
      if (win.axe) return resolve(win.axe);
      const script = win.document.createElement('script');
      script.src = '/node_modules/axe-core/axe.min.js';
      script.onload = () => resolve(win.axe as typeof AxeCore);
      script.onerror = () => reject(new Error('failed to load axe-core'));
      win.document.head.append(script);
    });
    axePromises.set(win, p);
  }
  return p;
}

/**
 * Rules Lighthouse's accessibility audit turns on that a default axe run leaves off (target
 * size, identical link purpose, and two table rules). Every run here enables them, so this
 * suite is at least as strict as Lighthouse (which also runs only the WCAG 2.0 A/AA tags plus
 * a few rules, where this runs every rule).
 */
export const LIGHTHOUSE_EXTRA_RULES = [
  'target-size',
  'identical-links-same-purpose',
  'table-fake-caption',
  'td-has-header',
];

/** Every axe impact level: minor and moderate cover most best-practice rules. */
export const ALL_IMPACTS = ['minor', 'moderate', 'serious', 'critical'];

/**
 * Run axe on the whole test document, so page-level rules that match only `<html>`
 * (landmark-one-main, page-has-heading-one, document-title, html-has-lang) run too.
 * The test runner's own page has no `<title>` and no `lang`, which a real page using the
 * components always sets, so for that page only they are filled in first rather than
 * disabling those rules. Any other document (such as the built site in an iframe) is
 * audited as it is.
 */
export async function expectNoPageAxeViolations(
  doc: Document = document,
  options?: Parameters<typeof expectNoAxeViolations>[2],
): Promise<void> {
  if (doc === document) {
    if (!doc.title) doc.title = 'Test page';
    if (!doc.documentElement.lang) doc.documentElement.lang = 'en';
  }
  await expectNoAxeViolations(doc.documentElement, ALL_IMPACTS, options);
}

/**
 * Run axe on `el` (walking open shadow roots) and throw if violations of the given impacts exist
 * (by default, any impact).
 * `exclude` lists selectors of subtrees to leave out, such as third-party widgets.
 * `rules` restricts the run to those axe rule ids (this also enables rules that are off by default).
 */
export async function expectNoAxeViolations(
  el: Element,
  impacts: string[] = ALL_IMPACTS,
  { exclude, rules }: { exclude?: string[][]; rules?: string[] } = {},
): Promise<void> {
  const axe = await loadAxe(el.ownerDocument.defaultView as AxeWindow);
  const context = exclude ? { include: [el], exclude } : el;
  const results = await axe.run(context as AxeCore.ElementContext, {
    resultTypes: ['violations'],
    ...(rules
      ? { runOnly: { type: 'rule', values: rules } }
      : { rules: Object.fromEntries(LIGHTHOUSE_EXTRA_RULES.map((id) => [id, { enabled: true }])) }),
  });
  const bad = results.violations.filter((v) => v.impact && impacts.includes(v.impact));
  if (bad.length) {
    throw new Error(
      'axe violations:\n' +
        bad
          .map(
            (v) =>
              `- ${v.id} (${v.impact}): ${v.help}\n    ` +
              v.nodes.map((n) => n.target.join(' ')).join('\n    '),
          )
          .join('\n'),
    );
  }
}
