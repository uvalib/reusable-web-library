/** Inline elements whose meaning a copied label keeps (emphasis, titles, code, languages…). */
const INLINE = new Set([
  'abbr',
  'b',
  'bdi',
  'bdo',
  'cite',
  'code',
  'dfn',
  'em',
  'i',
  'kbd',
  'mark',
  'q',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'var',
]);
const DIRS = new Set(['ltr', 'rtl', 'auto']);

/** An element's `lang` and a valid `dir`, to carry over to what is drawn for it (WCAG 3.1.2). */
export function langDir(el: Element | null | undefined): { lang?: string; dir?: string } {
  const out: { lang?: string; dir?: string } = {};
  const lang = el?.getAttribute('lang');
  if (lang !== null && lang !== undefined) out.lang = lang.trim();
  const dir = el?.getAttribute('dir')?.trim().toLowerCase();
  if (dir && DIRS.has(dir)) out.dir = dir;
  return out;
}

/** The attributes an inline copy keeps on an element. */
function kept(el: Element): [string, string][] {
  const out: [string, string][] = [];
  const { lang, dir } = langDir(el);
  if (lang !== undefined) out.push(['lang', lang]);
  if (dir) out.push(['dir', dir]);
  const tag = el.localName;
  const title = el.getAttribute('title');
  if (title !== null && (tag === 'abbr' || tag === 'dfn')) out.push(['title', title]);
  const datetime = el.getAttribute('datetime');
  if (datetime !== null && tag === 'time') out.push(['datetime', datetime]);
  return out;
}

/**
 * A safe copy of `nodes` for a label: text, and the inline elements above with only `lang`,
 * `dir` (and `title` on `abbr`/`dfn`, `datetime` on `time`). Any other element is replaced
 * by its copied content; nothing is parsed as HTML. `key` describes the copy, to compare
 * two reads. `rich` is false when the copy is text only (draw the label as text then).
 */
export function inlineCopy(
  nodes: Iterable<Node>,
  doc: Document,
): { nodes: Node[]; key: string; rich: boolean } {
  let key = '';
  let rich = false;
  const walk = (list: Iterable<Node>): Node[] => {
    const out: Node[] = [];
    for (const n of list) {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n.textContent ?? '';
        key += JSON.stringify(t);
        out.push(doc.createTextNode(t));
      } else if (n instanceof Element) {
        const children = n.childNodes;
        if (!INLINE.has(n.localName)) {
          out.push(...walk(children));
          continue;
        }
        rich = true;
        const el = doc.createElement(n.localName);
        const attrs = kept(n);
        for (const [k, v] of attrs) el.setAttribute(k, v);
        key += `<${n.localName}${JSON.stringify(attrs)}>`;
        el.append(...walk(children));
        key += `</${n.localName}>`;
        out.push(el);
      }
    }
    return out;
  };
  const copied = walk(nodes);
  return { nodes: copied, key, rich };
}
