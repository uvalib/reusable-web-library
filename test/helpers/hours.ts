import { executeServerCommand } from '@web/test-runner-commands';
import { waitUntil } from '@open-wc/testing';
import {
  hoursEndpoints,
  hoursTiming,
  resetHoursCache,
} from '../../src/components/library-hours/hours-data.js';

const DEFAULT_ENDPOINTS = { ...hoursEndpoints };
const DEFAULT_TIMING = { ...hoursTiming };

/**
 * Fix the page's clock (`Date.now()` and `new Date()`) at `time`, an ISO instant, with
 * Playwright's `page.clock.setFixedTime` (see hoursClockPlugin). Timers keep running.
 */
export async function setClock(time: string): Promise<void> {
  await executeServerCommand('hours-clock', { time });
  // The fixed time applies to this page's next Date read; check it took effect.
  if (Date.now() !== Date.parse(time)) throw new Error(`clock not set to ${time}`);
}

/** Forget cached data and restore the default endpoints, with fast retries for tests. */
export function resetHours(): void {
  resetHoursCache();
  delete window.uvalibHoursEndpoints;
  Object.assign(hoursEndpoints, DEFAULT_ENDPOINTS);
  Object.assign(hoursTiming, DEFAULT_TIMING, { retryDelay: 1 });
}

/** Point both endpoints at a test host from hours-intercept.mjs (`hours-fail.test`, …). */
export function useHoursHost(host: string): void {
  hoursEndpoints.libraries = `https://${host}/jsonapi/index/default_index?filter[type]=library&page[limit]=100`;
  hoursEndpoints.hours = `https://${host}/api/1.0/hours/{ids}?iid=863&key=test`;
}

/** Record every fetch URL the page makes while `fn` runs. */
export function recordFetches(): { urls: string[]; restore: () => void } {
  const original = window.fetch;
  const urls: string[] = [];
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(input instanceof Request ? input.url : String(input));
    return original.call(window, input, init);
  };
  return { urls, restore: () => (window.fetch = original) };
}

/** Wait until an hours element has finished loading (its `state` is no longer `loading`) and rendered. */
export async function settled(
  el: HTMLElement & { state: string; updateComplete: Promise<boolean> },
) {
  await el.updateComplete; // a property set just before (such as week-count) starts a load
  await waitUntil(() => el.state !== 'loading', `still loading`, { timeout: 4000 });
  await el.updateComplete;
}

/**
 * Hold back the responses of fetches whose URL matches `match` until `release()`; other
 * fetches pass through. `restore()` puts the real fetch back (held ones stay held until released).
 */
export function holdFetches(match: (url: string) => boolean) {
  const original = window.fetch;
  const held: (() => void)[] = [];
  const urls: string[] = [];
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const response = await original.call(window, input, init);
    if (!match(url)) return response;
    urls.push(url);
    await new Promise<void>((resolve) => held.push(resolve));
    return response;
  };
  return {
    urls,
    get count() {
      return held.length;
    },
    release: () => held.splice(0).forEach((r) => r()),
    restore: () => (window.fetch = original),
  };
}
