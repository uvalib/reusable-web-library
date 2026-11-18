// The alerts a reader closed with <site-alerts>, per site (localStorage is per origin).
//
// The headless <uvalib-alerts> marks every Information (alert3) alert "seen" the moment it
// arrives, as Virgo does (Virgo lists them in its Alerts menu). Our sites have no such menu
// and, like library.virginia.edu, show Information alerts until the reader closes them, so
// <site-alerts> keeps its own record of what was closed. Shared by every <site-alerts> in the
// document (and every copy of this library), synced across tabs by the `storage` event.

const STORES = Symbol.for('uvalib.site-alerts.dismissed');

export interface DismissedStore {
  has(uuid: string): boolean;
  add(uuid: string): void;
  /** Forget closed alerts that no longer exist (keeps the record small). */
  keepOnly(uuids: readonly string[]): void;
  /** Call `fn` on every change (this tab or another); returns the unsubscribe. */
  subscribe(fn: () => void): () => void;
}

/** The storage key: the headless element's key with a suffix, so the two never collide. */
export const dismissedKey = (storageKey: string | undefined): string =>
  `${storageKey || 'uvalib-alerts-seen'}:site-alerts-closed`;

function read(key: string): Set<string> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function write(key: string, ids: Set<string>): void {
  try {
    if (ids.size) localStorage.setItem(key, JSON.stringify([...ids]));
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable (private mode, blocked): remembered for this page only */
  }
}

/** The shared store for `key` in `win`. */
export function dismissedStore(win: Window, key: string): DismissedStore {
  const all = ((win as unknown as Record<symbol, Map<string, DismissedStore>>)[STORES] ??=
    new Map());
  let store = all.get(key);
  if (store) return store;
  let ids = read(key);
  const subs = new Set<() => void>();
  const notify = () => subs.forEach((fn) => fn());
  win.addEventListener('storage', (e) => {
    if (e.key !== key && e.key !== null) return;
    ids = read(key);
    notify();
  });
  store = {
    has: (uuid) => ids.has(uuid),
    add(uuid) {
      if (ids.has(uuid)) return;
      ids.add(uuid);
      write(key, ids);
      notify();
    },
    keepOnly(uuids) {
      const keep = new Set(uuids);
      const next = new Set([...ids].filter((id) => keep.has(id)));
      if (next.size === ids.size) return;
      ids = next;
      write(key, ids);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
  all.set(key, store);
  return store;
}
