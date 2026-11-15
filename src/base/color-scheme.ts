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

/** Per document, the controllers that currently own `data-uva-color-scheme`. */
const owners = new WeakMap<Document, Set<ColorSchemeController>>();
const ownersOf = (doc: Document): Set<ColorSchemeController> => {
  let set = owners.get(doc);
  if (!set) owners.set(doc, (set = new Set()));
  return set;
};

const FORCED_QUERY = '(forced-colors: active)';

/** The scheme the root element shows: from `data-uva-color-scheme`, or null when dark mode is off. */
export function rootColorScheme(doc: Document = document): ResolvedColorScheme | null {
  const attr = doc.documentElement.getAttribute(COLOR_SCHEME_ATTR);
  if (attr === null || !colorSchemeSupported(doc)) return null;
  return resolvePreference(asPreference(attr), doc);
}

/**
 * A component's view of dark mode. While `enabled()` and supported (`active`), it owns
 * `data-uva-color-scheme` on the root element: it sets it, keeps it current with the
 * stored preference (any control on the page, another tab through the `storage` event) and
 * removes it when the last owner in the document is turned off or disconnected. A connected
 * controller that is not enabled removes a stray attribute (for example from the inline
 * snippet on a page without the switch) unless another one owns it.
 *
 * Every connected controller also follows the root's scheme (`rootDark`) and the OS
 * preference (`systemDark`), so a header without the switch never shows the navy logo on a
 * dark page.
 */
export class ColorSchemeController implements ReactiveController {
  preference: ColorSchemePreference = 'system';
  /** What "System" resolves to: the OS preference. */
  systemDark = false;
  /** Whether the root element currently shows the dark scheme. */
  rootDark = false;
  /** Whether forced colors (a contrast theme) are on. */
  forcedColors = false;
  /** Whether the root element has `data-uva-color-scheme` (dark mode is on for the page). */
  rootOn = false;
  /** Enabled and supported: this controller owns the root attribute. */
  active = false;
  /** Set while sync() runs, so its own change events do not request a second update. */
  private syncing = false;

  private listening?: { doc: Document; dark?: MediaQueryList; forced?: MediaQueryList };

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly enabled: () => boolean,
    private readonly inline: () => boolean,
    /** Whether the host renders anything from this state (and so needs updates). */
    private readonly renders = true,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    this.sync();
  }

  hostDisconnected(): void {
    this.listen(false);
    this.release(this.host.ownerDocument);
  }

  /** Call when `enabled()` may have changed (from the host's `willUpdate`). */
  sync(): void {
    const doc = this.host.ownerDocument;
    if (!this.host.isConnected) return;
    this.syncing = true;
    const supported = colorSchemeSupported(doc);
    this.active = this.enabled() && supported;
    if (this.active) {
      ownersOf(doc).add(this);
      if (!this.inline()) installColorSchemeStyles(doc);
      this.preference = readPreference(doc);
      applyPreference(doc, this.preference, this.inline());
      doc.dispatchEvent(new CustomEvent(CHANGE));
    } else {
      this.release(doc);
      // Not ours, and nobody owns it: a stray attribute (the snippet without the switch).
      if (!ownersOf(doc).size && doc.documentElement.hasAttribute(COLOR_SCHEME_ATTR)) {
        clearPreference(doc);
        doc.dispatchEvent(new CustomEvent(CHANGE));
      }
    }
    this.listen(supported);
    this.syncing = false;
    this.refresh(false);
  }

  /**
   * Whether to show the reversed (white) logo: only while the page shows dark mode, and under
   * forced colors (a contrast theme repaints the header) only when the OS theme is dark.
   */
  get logoDark(): boolean {
    return this.rootOn && (this.forcedColors ? this.systemDark : this.rootDark);
  }

  /** The visitor picked `pref` in a control. */
  choose(pref: ColorSchemePreference): void {
    setPreference(this.host.ownerDocument, pref, this.inline());
  }

  /** Stop owning the attribute; the last owner to go removes it. */
  private release(doc: Document): void {
    const set = ownersOf(doc);
    if (!set.delete(this)) return;
    this.active = false;
    if (!set.size) {
      clearPreference(doc);
      doc.dispatchEvent(new CustomEvent(CHANGE));
    }
  }

  private readonly onChange = (): void => this.refresh(!this.syncing);

  private readonly onStorage = (e: StorageEvent): void => {
    if (e.key !== null && e.key !== COLOR_SCHEME_STORAGE_KEY) return;
    if (this.active)
      applyPreference(
        this.host.ownerDocument,
        readPreference(this.host.ownerDocument),
        this.inline(),
      );
    this.refresh(true);
  };

  private refresh(update: boolean): void {
    const doc = this.host.ownerDocument;
    const next = {
      preference: readPreference(doc),
      systemDark: systemIsDark(doc),
      rootDark: rootColorScheme(doc) === 'dark',
      rootOn: rootColorScheme(doc) !== null,
      forcedColors: !!doc.defaultView?.matchMedia?.(FORCED_QUERY).matches,
    };
    const changed = (Object.keys(next) as (keyof typeof next)[]).some((k) => next[k] !== this[k]);
    Object.assign(this, next);
    if (changed && update && this.renders) this.host.requestUpdate();
  }

  private listen(on: boolean): void {
    if (on === !!this.listening) return;
    if (on) {
      const doc = this.host.ownerDocument;
      const dark = doc.defaultView?.matchMedia?.(DARK_QUERY);
      const forced = doc.defaultView?.matchMedia?.(FORCED_QUERY);
      doc.addEventListener(CHANGE, this.onChange);
      doc.defaultView?.addEventListener('storage', this.onStorage);
      dark?.addEventListener('change', this.onChange);
      forced?.addEventListener('change', this.onChange);
      this.listening = { doc, dark, forced };
    } else {
      const { doc, dark, forced } = this.listening!;
      doc.removeEventListener(CHANGE, this.onChange);
      doc.defaultView?.removeEventListener('storage', this.onStorage);
      dark?.removeEventListener('change', this.onChange);
      forced?.removeEventListener('change', this.onChange);
      this.listening = undefined;
    }
  }
}
