import type { CSSResultGroup, CSSResultOrNative } from 'lit';

const HOST = ':host';
const installed = new WeakMap<Document, Set<string>>();

/** Rewrite `:host(<sel>)` to `<tag><sel>` and bare `:host` to `<tag>`. `:host-context(` is left as is. */
export function rewriteHost(cssText: string, tag: string): string {
  let out = '';
  let i = 0;
  while (i < cssText.length) {
    const at = cssText.indexOf(HOST, i);
    if (at === -1) break;
    out += cssText.slice(i, at);
    const after = at + HOST.length;
    const next = cssText[after];
    if (next === '(') {
      let depth = 0;
      let j = after;
      for (; j < cssText.length; j++) {
        if (cssText[j] === '(') depth++;
        else if (cssText[j] === ')' && --depth === 0) break;
      }
      if (j < cssText.length) {
        out += tag + cssText.slice(after + 1, j);
        i = j + 1;
        continue;
      }
      out += HOST; // unbalanced: leave untouched
      i = after;
    } else if (next !== undefined && /[\w-]/.test(next)) {
      out += HOST; // e.g. :host-context(, not our pseudo-class
      i = after;
    } else {
      out += tag;
      i = after;
    }
  }
  return out + cssText.slice(i);
}

function flatten(styles: CSSResultGroup | CSSResultOrNative | undefined, out: string[]): void {
  if (!styles) return;
  if (Array.isArray(styles)) {
    for (const s of styles) flatten(s, out);
  } else if (styles instanceof CSSStyleSheet) {
    out.push([...styles.cssRules].map((r) => r.cssText).join('\n'));
  } else {
    out.push((styles as { cssText: string }).cssText);
  }
}

/**
 * Install `styles` once per tag per document as an adopted constructed sheet,
 * rewriting `:host` selectors to the tag name. Returns true only on first install.
 */
export function installLightDomStyles(
  tag: string,
  styles: CSSResultGroup,
  doc: Document = document,
): boolean {
  let tags = installed.get(doc);
  if (!tags) installed.set(doc, (tags = new Set()));
  if (tags.has(tag)) return false;
  tags.add(tag);
  const parts: string[] = [];
  flatten(styles, parts);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(rewriteHost(parts.join('\n'), tag));
  doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
  return true;
}
