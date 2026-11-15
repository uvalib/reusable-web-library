import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { colorScheme } from '../styles/color-scheme.js';
import { installLightDomStyles } from './light-dom-styles.js';

/** The visitor's choice: follow the OS (`system`, the default) or pin `light` or `dark`. */
export type ColorSchemePreference = 'light' | 'dark' | 'system';
/** What is shown: the preference, with `system` resolved from `prefers-color-scheme`. */
export type ResolvedColorScheme = 'light' | 'dark';

/** localStorage key, per site (origin): `light` or `dark`; absent means `system`. */
export const COLOR_SCHEME_STORAGE_KEY = 'uvalib-color-scheme';
/** Attribute on the root element that turns the opt-in dark-mode rules on. */
export const COLOR_SCHEME_ATTR = 'data-uva-color-scheme';
/** Fired on the document whenever a control changes the preference. */
const CHANGE = 'uvalib-color-scheme-change';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Choices made while storage is unavailable, kept for the page's lifetime. */
const memory = new WeakMap<Document, ColorSchemePreference>();

const asPreference = (v: unknown): ColorSchemePreference =>
  v === 'light' || v === 'dark' ? v : 'system';

/** Dark mode needs light-dark(); without it nothing is shown or set, and the page stays light. */
export function colorSchemeSupported(doc: Document = document): boolean {
  const css = doc.defaultView?.CSS;
  try {
    return !!css?.supports?.('color', 'light-dark(#000, #fff)');
  } catch {
    return false;
  }
}

/** The stored preference: this page's in-memory choice if storage failed, else localStorage. */
export function readPreference(doc: Document = document): ColorSchemePreference {
  const kept = memory.get(doc);
  if (kept) return kept;
  try {
    return asPreference(doc.defaultView?.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

/** Whether the OS asks for dark. */
export function systemIsDark(doc: Document = document): boolean {
  return !!doc.defaultView?.matchMedia?.(DARK_QUERY).matches;
}

export function resolvePreference(
  pref: ColorSchemePreference,
  doc: Document = document,
): ResolvedColorScheme {
  return pref === 'system' ? (systemIsDark(doc) ? 'dark' : 'light') : pref;
}

/**
 * Show `pref` on the page: `data-uva-color-scheme` on the root element, and with `inline`
 * (for `no-style`, where no stylesheet maps the attribute) `color-scheme` as an inline style.
 */
export function applyPreference(doc: Document, pref: ColorSchemePreference, inline = false): void {
  const html = doc.documentElement;
  if (html.getAttribute(COLOR_SCHEME_ATTR) !== pref) html.setAttribute(COLOR_SCHEME_ATTR, pref);
  if (inline) html.style.colorScheme = pref === 'system' ? 'light dark' : pref;
}

/** Turn dark mode off again: remove the attribute and any inline `color-scheme`. */
export function clearPreference(doc: Document): void {
  const html = doc.documentElement;
  html.removeAttribute(COLOR_SCHEME_ATTR);
  html.style.removeProperty('color-scheme');
  if (!html.getAttribute('style')) html.removeAttribute('style');
}

/**
 * Remember and show `pref`. `system` removes the stored value; storage that throws keeps the
 * choice in memory for this page. Every connected control is told.
 */
export function setPreference(doc: Document, pref: ColorSchemePreference, inline = false): void {
  try {
    const storage = doc.defaultView!.localStorage;
    if (pref === 'system') storage.removeItem(COLOR_SCHEME_STORAGE_KEY);
    else storage.setItem(COLOR_SCHEME_STORAGE_KEY, pref);
    memory.delete(doc);
  } catch {
    memory.set(doc, pref);
  }
  applyPreference(doc, pref, inline);
  doc.dispatchEvent(new CustomEvent(CHANGE));
}

/** The opt-in rules on the document (layered, so host CSS wins), for pages without tokens.css. */
export function installColorSchemeStyles(doc: Document): void {
  installLightDomStyles('uvalib-color-scheme', [colorScheme], { root: doc, scope: false });
}

/**
 * Keeps a component's view of the color scheme current while it is `enabled()` and the
 * browser supports dark mode: the preference (from any control on the page, another tab
 * through the `storage` event, or storage) and the OS preference. While active it keeps
 * `data-uva-color-scheme` on the root element; when it stops being enabled it removes it.
 */
export class ColorSchemeController implements ReactiveController {
  preference: ColorSchemePreference = 'system';
  resolved: ResolvedColorScheme = 'light';
  /** Enabled and supported: the control is shown and the attribute set. */
  active = false;

  private listening?: { doc: Document; mql?: MediaQueryList };

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly enabled: () => boolean,
    private readonly inline: () => boolean,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    this.sync();
  }

  hostDisconnected(): void {
    this.listen(false);
  }

  /** Call when `enabled()` may have changed (from the host's `willUpdate`). */
  sync(): void {
    const doc = this.host.ownerDocument;
    const was = this.active;
    this.active = this.enabled() && colorSchemeSupported(doc);
    if (this.active) {
      if (!this.inline()) installColorSchemeStyles(doc);
      this.listen(true);
      this.refresh(false);
      applyPreference(doc, this.preference, this.inline());
    } else {
      this.listen(false);
      if (was) clearPreference(doc);
    }
  }

  /** The visitor picked `pref` in a control. */
  choose(pref: ColorSchemePreference): void {
    setPreference(this.host.ownerDocument, pref, this.inline());
  }

  private readonly onChange = (): void => this.refresh(true);

  private readonly onStorage = (e: StorageEvent): void => {
    if (e.key !== null && e.key !== COLOR_SCHEME_STORAGE_KEY) return;
    this.refresh(true);
    applyPreference(this.host.ownerDocument, this.preference, this.inline());
  };

  private refresh(update: boolean): void {
    const doc = this.host.ownerDocument;
    const preference = readPreference(doc);
    const resolved = resolvePreference(preference, doc);
    if (preference === this.preference && resolved === this.resolved) return;
    this.preference = preference;
    this.resolved = resolved;
    if (update) this.host.requestUpdate();
  }

  private listen(on: boolean): void {
    if (on === !!this.listening) return;
    if (on) {
      const doc = this.host.ownerDocument;
      const mql = doc.defaultView?.matchMedia?.(DARK_QUERY);
      doc.addEventListener(CHANGE, this.onChange);
      doc.defaultView?.addEventListener('storage', this.onStorage);
      mql?.addEventListener('change', this.onChange);
      this.listening = { doc, mql };
    } else {
      const { doc, mql } = this.listening!;
      doc.removeEventListener(CHANGE, this.onChange);
      doc.defaultView?.removeEventListener('storage', this.onStorage);
      mql?.removeEventListener('change', this.onChange);
      this.listening = undefined;
    }
  }
}
