import type AxeCore from 'axe-core';

// axe-core is CommonJS, so it has no ES default export under wtr's nodeResolve:
// load the minified bundle with a classic script tag instead.
let axePromise: Promise<typeof AxeCore> | undefined;
function loadAxe(): Promise<typeof AxeCore> {
  axePromise ??= new Promise((resolve, reject) => {
    const w = window as unknown as { axe?: typeof AxeCore };
    if (w.axe) return resolve(w.axe);
    const script = document.createElement('script');
    script.src = '/node_modules/axe-core/axe.min.js';
    script.onload = () => resolve(w.axe as typeof AxeCore);
    script.onerror = () => reject(new Error('failed to load axe-core'));
    document.head.append(script);
  });
  return axePromise;
}

/** Run axe on `el` (walking open shadow roots) and throw if violations of the given impacts exist. */
export async function expectNoAxeViolations(
  el: Element,
  impacts: string[] = ['serious', 'critical'],
): Promise<void> {
  const axe = await loadAxe();
  const results = await axe.run(el, { resultTypes: ['violations'] });
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
