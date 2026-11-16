import {
  eventsEndpoints,
  eventsTiming,
  resetEventsCache,
} from '../../src/components/events-section/events-data.js';

const DEFAULT_ENDPOINTS = { ...eventsEndpoints };
const DEFAULT_TIMING = { ...eventsTiming };

/** Forget cached events and restore the default endpoints, with fast retries for tests. */
export function resetEvents(): void {
  resetEventsCache();
  delete window.uvalibEventsEndpoints;
  Object.assign(eventsEndpoints, DEFAULT_ENDPOINTS);
  Object.assign(eventsTiming, DEFAULT_TIMING, { retryDelay: 1 });
}

/** Point both endpoints at a test host from events-intercept.mjs (`events-fail.test`, …). */
export function useEventsHost(host: string): void {
  eventsEndpoints.events = `https://${host}/api/1.0/events?key=test&iid=863&cal_id=4299&days=30`;
  eventsEndpoints.search = `https://${host}/api/1.0/event_search?key=test&iid=863&cal_id=4299&days=30`;
}
