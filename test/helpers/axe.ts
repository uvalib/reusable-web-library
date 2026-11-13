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
 * Run axe on `el` (walking open shadow roots) and throw if violations of the given impacts exist.
 * `exclude` lists selectors of subtrees to leave out, such as third-party widgets.
 * `rules` restricts the run to those axe rule ids (this also enables rules that are off by default).
 */
export async function expectNoAxeViolations(
  el: Element,
  impacts: string[] = ['serious', 'critical'],
  { exclude, rules }: { exclude?: string[][]; rules?: string[] } = {},
): Promise<void> {
  const axe = await loadAxe(el.ownerDocument.defaultView as AxeWindow);
  const context = exclude ? { include: [el], exclude } : el;
  const results = await axe.run(context as AxeCore.ElementContext, {
    resultTypes: ['violations'],
    ...(rules && { runOnly: { type: 'rule', values: rules } }),
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
