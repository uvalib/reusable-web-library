// Shared fetching for the data-backed components (library hours, events, search results).
// Internal: not exported from the package entry. No side effects on import.

/** How a fetch is attempted: attempts, the delay between them (ms) and each attempt's timeout (ms). */
export interface FetchTiming {
  retries: number;
  retryDelay: number;
  timeout: number;
}

/** A non-OK HTTP answer's error carries its `status` (a 401 refreshes a token, for example). */
export type HttpError = Error & { status: number };

/** Request options: any `RequestInit` (method, headers, body, signal) plus retry control. */
export interface FetchOptions extends RequestInit {
  /**
   * Whether a non-OK answer with this status is tried again. Default: every status (as the
   * hours and events data always did). A network error or timeout is always tried again.
   */
  retryStatus?: (status: number) => boolean;
}

/**
 * Fetch `url` and read the answer as JSON (or, with `text`, as text). Each attempt times out
 * after `timing.timeout` ms; a failed, non-OK or timed-out attempt is retried after
 * `timing.retryDelay` ms, `timing.retries` attempts in all (a non-OK status only when
 * `retryStatus` allows it). Once `options.signal` aborts, no attempt follows and the call
 * rejects with its reason. Otherwise rejects with the last attempt's error.
 */
export async function fetchJson(
  url: string,
  timing: FetchTiming,
  { retryStatus, signal, ...init }: FetchOptions = {},
  text = false,
): Promise<unknown> {
  let error: unknown;
  const attempts = Math.max(1, timing.retries);
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, timing.retryDelay));
    signal?.throwIfAborted();
    try {
      // A hung attempt times out and counts as a failed attempt.
      const timeout = AbortSignal.timeout(timing.timeout);
      const response = await fetch(url, {
        ...init,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (!response.ok) {
        error = Object.assign(new Error(`${response.status} ${response.statusText} for ${url}`), {
          status: response.status,
        });
        if (retryStatus && !retryStatus(response.status)) break;
        continue;
      }
      return await (text ? response.text() : response.json());
    } catch (e) {
      signal?.throwIfAborted();
      error = e;
    }
  }
  throw error instanceof Error ? error : new Error(String(error));
}

/** `fetchJson`, reading the answer as text. */
export const fetchText = (url: string, timing: FetchTiming, options?: FetchOptions) =>
  fetchJson(url, timing, options, true) as Promise<string>;
