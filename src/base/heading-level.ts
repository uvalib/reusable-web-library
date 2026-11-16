/**
 * The level of the nearest heading before `el` in document order (`<h1>`–`<h6>`, or
 * `role="heading"` with `aria-level`), or null when there is none.
 *
 * Skipped: anything inside `el` itself, hidden headings (`hidden` or `aria-hidden="true"`
 * on them or an ancestor), and headings another custom element rendered into the light DOM
 * (for example an earlier `<events-section no-shadow-dom>`'s card titles), so sibling
 * components do not nest under each other. `<site-page>` is a page wrapper, not a widget,
 * so headings in its content count. When `el` sits inside a shadow root, the search goes on
 * from that root's host.
 */
export function precedingHeadingLevel(el: Element): number | null {
  let start: Node = el;
  for (;;) {
    const root = start.getRootNode() as Document | ShadowRoot;
    const walker = (start.ownerDocument ?? document).createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
    );
    walker.currentNode = start;
    for (let n = walker.previousNode(); n; n = walker.previousNode()) {
      const level = headingLevel(n as Element);
      if (level !== null && counts(n as Element, el)) return level;
    }
    if (!(root instanceof ShadowRoot)) return null;
    start = root.host;
  }
}

function headingLevel(n: Element): number | null {
  const m = /^H([1-6])$/.exec(n.tagName);
  if (m) return Number(m[1]);
  if (n.getAttribute('role') === 'heading') {
    const level = Number.parseInt(n.getAttribute('aria-level') ?? '', 10);
    return level >= 1 ? Math.min(level, 6) : 2; // ARIA's default heading level is 2
  }
  return null;
}

/** Whether heading `n` counts as context for `el`. */
function counts(n: Element, el: Element): boolean {
  // An ancestor of el (previousNode() visits ancestors) is not a heading el sits under.
  if (n.contains(el)) return false;
  if (n.closest('[hidden], [aria-hidden="true"]')) return false;
  // Rendered by another custom element (a widget's own headings), not page structure.
  for (let p = n.parentElement; p; p = p.parentElement) {
    if (p.localName.includes('-') && p.localName !== 'site-page') return false;
  }
  return true;
}
