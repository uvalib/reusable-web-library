/**
 * Custom states (`ElementInternals.states`, matched by `:state(name)`): runtime flags a page
 * can style but not set. They reach CSS only, never assistive technologies, so each one
 * mirrors state the component already exposes (aria-expanded, aria-invalid, a dialog's open).
 */

/** The element's internals, or undefined where the browser has none (or they are taken). */
export function attachStateInternals(el: HTMLElement): ElementInternals | undefined {
  try {
    return typeof el.attachInternals === 'function' ? el.attachInternals() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Turn `name` on or off. A no-op without `states` (older engines), and where only the old
 * `--name` syntax is accepted (Chromium before 125 throws on a plain name).
 */
export function setState(internals: ElementInternals | undefined, name: string, on: boolean): void {
  const states = internals?.states;
  if (!states) return;
  try {
    if (on) states.add(name);
    else states.delete(name);
  } catch {
    // Not supported in this form: the state simply never matches.
  }
}
