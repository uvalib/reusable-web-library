import type { CSSResultGroup, CSSResultOrNative } from 'lit';

const HOST = ':host';
type Root = Document | ShadowRoot;
const installed = new WeakMap<Root, Set<string>>();
const STYLE_RULE = 1;
const KEYFRAMES_RULE = 7;

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
        out += tag + cssText.slice(after + 1, j).trim();
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

function isNativeSheet(s: unknown): s is CSSStyleSheet {
  return typeof s === 'object' && s !== null && 'cssRules' in s;
}

function flatten(styles: CSSResultGroup | CSSResultOrNative | undefined, out: string[]): void {
  if (!styles) return;
  if (Array.isArray(styles)) {
    for (const s of styles) flatten(s, out);
  } else if (isNativeSheet(styles)) {
    out.push([...styles.cssRules].map((r) => r.cssText).join('\n'));
  } else {
    out.push((styles as { cssText: string }).cssText);
  }
}

/** Split a selector list on commas that are not inside parentheses or brackets. */
function splitSelectors(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function scopeRules(rules: CSSRuleList, tag: string): string {
  let out = '';
  for (const rule of rules) {
    const text = rule.cssText;
    if (rule.type === STYLE_RULE) {
      const sel = (rule as CSSStyleRule).selectorText;
      const scoped = splitSelectors(sel)
        .map((s) => (s.startsWith(HOST) ? rewriteHost(s, tag) : `${tag} ${s}`))
        .join(', ');
      out += scoped + text.slice(text.indexOf('{'));
    } else if (rule.type !== KEYFRAMES_RULE && 'cssRules' in rule) {
      out += `${text.slice(0, text.indexOf('{'))}{${scopeRules((rule as CSSGroupingRule).cssRules, tag)}}`;
    } else {
      out += text;
    }
  }
  return out;
}

function sheetConstructor(root: Root): typeof CSSStyleSheet {
  const doc = (root as ShadowRoot).ownerDocument ?? (root as Document);
  return (doc.defaultView as (Window & typeof globalThis) | null)?.CSSStyleSheet ?? CSSStyleSheet;
}

/**
 * Install `styles` once per tag per root as an adopted constructed sheet. With `layer`
 * (default) the sheet is wrapped in `@layer uvalib`, so unlayered page CSS always wins;
 * with `layer: false` it is unlayered and, adopted after the document's own stylesheets,
 * wins ties against host rules of equal specificity (used for page-level base styles).
 * With `scope` (default) every selector is confined to `tag` and `:host` is rewritten to
 * it. Returns true only on first successful install.
 */
export function installLightDomStyles(
  tag: string,
  styles: CSSResultGroup,
  opts: { root?: Root; scope?: boolean; layer?: boolean } = {},
): boolean {
  const root = opts.root ?? document;
  const tags = installed.get(root) ?? new Set<string>();
  if (tags.has(tag)) return false;
  const parts: string[] = [];
  flatten(styles, parts);
  const raw = parts.join('\n');
  const Ctor = sheetConstructor(root);
  let body = raw;
  if (opts.scope ?? true) {
    const tmp = new Ctor();
    tmp.replaceSync(raw);
    body = scopeRules(tmp.cssRules, tag);
  }
  const sheet = new Ctor();
  sheet.replaceSync((opts.layer ?? true) ? `@layer uvalib{${body}}` : body);
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  tags.add(tag);
  installed.set(root, tags);
  return true;
}
