// Inserting alert body HTML, exactly as the alerts project does (component/src/body.ts).
// Bodies are already sanitized by the alerts sync Lambda (a bluemonday allowlist). Where the
// browser has the native Sanitizer API, setHTML() re-applies the same allowlist as defense in
// depth, so a server regression cannot inject script into the many sites using these
// components. Elsewhere the server-sanitized HTML is inserted as is (a client sanitizer library
// would cost more than the whole element; the server allowlist is the guaranteed layer).

/**
 * Mirrors the alerts project's `lambda/internal/sanitize` (bluemonday policy) and its
 * `component/src/body.ts`: keep the three in sync.
 */
export const BODY_SANITIZER = {
  elements: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'a',
    'ul',
    'ol',
    'li',
    'span',
    'div',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ],
  attributes: ['href', 'class', 'rel'],
};

type SetHTML = (html: string, options: { sanitizer: typeof BODY_SANITIZER }) => void;

const inserted = new WeakMap<Element, string>();

/** Lit ref callback target: put `html` into `el` once per distinct value. */
export function setBody(el: Element | undefined, html: string): void {
  if (!el || inserted.get(el) === html) return;
  inserted.set(el, html);
  const setHTML = (el as Element & { setHTML?: SetHTML }).setHTML;
  if (typeof setHTML === 'function') {
    setHTML.call(el, html, { sanitizer: BODY_SANITIZER });
  } else {
    el.innerHTML = html;
  }
}
