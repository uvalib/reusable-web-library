// One headless <uvalib-alerts> per document (per alerts base and storage key), shared by every
// <site-alerts>. The alerts project's element keeps the data, the live connection, the
// dismissals and the regional matching (it follows the page URL, SPA navigation included);
// each <site-alerts> reads its properties and listens for its events.
import { ALERTS_TAG, loadAlerts } from './alerts.js';

/** One alert as the headless element gives it (the alerts data contract, the fields used here). */
export interface SiteAlert {
  uuid: string;
  title: string;
  /** Server-sanitized HTML. */
  body: string;
  /** `alert1` (critical) to `alert4` (header banner); regional alerts use `alert2`/`alert3`. */
  severity: string;
}

/** What a `<site-alerts>` draws: the headless element's lists and status. */
export interface AlertsSnapshot {
  headerAlerts: SiteAlert[];
  menuAlerts: SiteAlert[];
  regionalAlerts: SiteAlert[];
  /** `connecting`, `live`, `polling` or `offline` (the headless element's `status`). */
  status: string;
}

/** A subscription to the shared element. */
export interface AlertsSubscription {
  /** The shared element's key: base URL and storage key. */
  readonly key: string;
  /** Mark an alert seen (dismissed), through the headless element. */
  dismiss(uuid: string): void;
  /** Stop listening; the last subscriber's release removes the shared element. */
  release(): void;
}

/** Marks the shared element (so a second copy of this library, CDN and npm, finds it too). */
const SHARED_ATTR = 'data-site-alerts';
/** Its subscribers, on the element itself, shared by every copy of this module. */
const USERS = Symbol.for('uvalib.site-alerts.users');
const UPDATE = 'uvalib-alerts-update';
const STATUS = 'uvalib-alerts-status';

type Headless = HTMLElement & {
  [USERS]?: Set<unknown>;
  headerAlerts?: unknown;
  menuAlerts?: unknown;
  regionalAlerts?: unknown;
  status?: unknown;
  dismiss?: (uuid: string) => void;
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** The valid alerts in `v` (an array from the headless element), as plain records. */
function alertsOf(v: unknown): SiteAlert[] {
  if (!Array.isArray(v)) return [];
  const out: SiteAlert[] = [];
  for (const a of v as Record<string, unknown>[]) {
    if (!a || typeof a !== 'object' || !str(a.uuid)) continue;
    out.push({
      uuid: str(a.uuid),
      title: str(a.title),
      body: str(a.body),
      severity: str(a.severity),
    });
  }
  return out;
}

function snapshot(el: Headless): AlertsSnapshot {
  try {
    return {
      headerAlerts: alertsOf(el.headerAlerts),
      menuAlerts: alertsOf(el.menuAlerts),
      regionalAlerts: alertsOf(el.regionalAlerts),
      status: str(el.status) || 'connecting',
    };
  } catch {
    return { headerAlerts: [], menuAlerts: [], regionalAlerts: [], status: 'offline' };
  }
}

/** The connected shared element for `base` and `storageKey` in `doc`, if there is one. */
function find(doc: Document, base: string, storageKey: string): Headless | undefined {
  for (const el of doc.querySelectorAll<Headless>(`${ALERTS_TAG}[${SHARED_ATTR}]`)) {
    if (el.getAttribute('src') === base && (el.getAttribute('storage-key') ?? '') === storageKey)
      return el;
  }
  return undefined;
}

function create(doc: Document, base: string, storageKey: string): Headless {
  const el = doc.createElement(ALERTS_TAG) as Headless;
  el.setAttribute('headless', '');
  el.setAttribute(SHARED_ATTR, '');
  el.setAttribute('src', base);
  if (storageKey) el.setAttribute('storage-key', storageKey);
  el.hidden = true;
  (doc.body ?? doc.documentElement).append(el);
  return el;
}

/**
 * Subscribe to the alerts at `base` in `doc`: the shared headless element is found or created
 * (hidden, at the end of `<body>`), the alerts script is loaded if needed, and `onChange` runs
 * once the element is defined and after every update or status event it fires.
 */
export function subscribeAlerts(
  doc: Document,
  base: string,
  storageKey: string | undefined,
  onChange: (s: AlertsSnapshot) => void,
): AlertsSubscription {
  const key = storageKey?.trim() ?? '';
  const el = find(doc, base, key) ?? create(doc, base, key);
  const users = (el[USERS] ??= new Set());
  const me = {};
  users.add(me);
  let live = true;
  const notify = () => {
    if (live) onChange(snapshot(el));
  };
  el.addEventListener(UPDATE, notify);
  el.addEventListener(STATUS, notify);
  loadAlerts(doc, base);
  doc.defaultView?.customElements.whenDefined(ALERTS_TAG).then(notify, () => {});
  return {
    key: `${base}\n${key}`,
    dismiss(uuid) {
      if (live && typeof el.dismiss === 'function') el.dismiss(uuid);
    },
    release() {
      if (!live) return;
      live = false;
      el.removeEventListener(UPDATE, notify);
      el.removeEventListener(STATUS, notify);
      users.delete(me);
      // A <site-alerts> moved in the page reconnects in the same task: keep the element.
      queueMicrotask(() => {
        if (!users.size) el.remove();
      });
    },
  };
}
