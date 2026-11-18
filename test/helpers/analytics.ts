/** Test helpers for the analytics element: the queue, the injected scripts and a reset. */

type Command = unknown[];
interface Stub {
  loads: number;
  queue: Command[];
}
const w = window as unknown as Record<string | symbol, unknown> & { _paq?: Command[] };
const STATE = Symbol.for('@uvalib/web-components/analytics');

/** Matomo's queue (empty when there is none). */
export const paq = (): Command[] => w._paq ?? [];

/** The matomo.js scripts on the page. */
export const matomoScripts = (): HTMLScriptElement[] => [
  ...document.querySelectorAll<HTMLScriptElement>('script[src*="matomo.js"]'),
];

/** What the stub matomo.js (test/helpers/analytics-intercept.mjs) saw when it last ran. */
export const stub = (): Stub | undefined => w.__matomoStub as Stub | undefined;

/** Forget the queue, the one-tracker state, the stub's record and every matomo.js script. */
export function resetAnalytics(): void {
  delete w._paq;
  delete w[STATE];
  delete w.__matomoStub;
  for (const s of matomoScripts()) s.remove();
}

/** Dispatch a bubbling, composed CustomEvent. */
export function fire(target: EventTarget, type: string, detail: unknown): void {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/** Record the `uvalib-analytics-*` and `site-analytics-*` events reaching `document`. */
export function recordAnalytics() {
  const events: { type: string; detail: Record<string, unknown> }[] = [];
  const types = ['event', 'search', 'pageview', 'content'].flatMap((t) => [
    `uvalib-analytics-${t}`,
    `site-analytics-${t}`,
  ]);
  const log = (e: Event) =>
    events.push({ type: e.type, detail: (e as CustomEvent).detail as Record<string, unknown> });
  for (const t of types) document.addEventListener(t, log);
  return {
    events,
    of: (type: string) => events.filter((e) => e.type === type).map((e) => e.detail),
    restore: () => {
      for (const t of types) document.removeEventListener(t, log);
    },
  };
}
