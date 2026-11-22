/**
 * The computed `text-wrap-style` of an element (`balance`, `pretty`, `auto`), read from the
 * longhand, else from the `text-wrap` shorthand in browsers that have only that. Null when
 * the browser supports neither `balance` nor `pretty` for `text-wrap`: callers then skip
 * the assertion (the property is a progressive enhancement, ignored where unsupported).
 */
export function wrapStyle(el: Element, value: 'balance' | 'pretty'): string | null {
  const win = el.ownerDocument.defaultView ?? window;
  if (!win.CSS.supports('text-wrap', value)) return null;
  const s = win.getComputedStyle(el);
  const longhand = s.getPropertyValue('text-wrap-style').trim();
  if (longhand) return longhand;
  const words = s.getPropertyValue('text-wrap').trim().split(/\s+/);
  return words.find((w) => ['balance', 'pretty', 'stable'].includes(w)) ?? 'auto';
}
