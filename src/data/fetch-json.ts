// Shared fetching for the data-backed components (library hours, events, search results).
// Internal: not exported from the package entry. No side effects on import.

/** How a fetch is attempted: attempts, the delay between them (ms) and each attempt's timeout (ms). */
export interface FetchTiming {
  retries: number;
  retryDelay: number;
  timeout: number;
}

/** A non-OK HTTP answer. `status` lets callers react (for example, a 401 refreshes a token). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Request options: any `RequestInit` (method, headers, body, signal) plus retry control. */
export interface FetchOptions extends RequestInit {
  /**
   * Whether a non-OK answer with this status is tried again. Default: every status (as the
   * hours and events data always did). A network error or timeout is always tried again.
   */
  retryStatus?: (status: number) => boolean;
}

/** Wait `ms`, or reject as soon as `signal` aborts. */
function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const done = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/**
 * Fetch `url` and read the answer with `read`. Each attempt times out after `timing.timeout`
 * ms; a failed, non-OK or timed-out attempt is retried after `timing.retryDelay` ms,
 * `timing.retries` attempts in all (a non-OK status only when `retryStatus` allows it).
 * An abort of `options.signal` stops at once, with no further attempts, and rejects with
 * its reason. Otherwise rejects with the last attempt's error.
 */
async function fetchWith<T>(
  url: string,
  timing: FetchTiming,
  { retryStatus, signal, ...init }: FetchOptions,
  read: (r: Response) => Promise<T>,
): Promise<T> {
  let error: unknown;
  const attempts = Math.max(1, timing.retries);
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await delay(timing.retryDelay, signal);
    if (signal?.aborted) throw signal.reason;
    try {
      // A hung attempt times out and counts as a failed attempt.
      const timeout = AbortSignal.timeout(timing.timeout);
      const response = await fetch(url, {
        ...init,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      if (!response.ok) {
        const e = new HttpError(
          response.status,
          `${response.status} ${response.statusText} for ${url}`,
        );
        if (retryStatus && !retryStatus(response.status)) throw Object.assign(e, { final: true });
        throw e;
      }
      return await read(response);
    } catch (e) {
      if (signal?.aborted) throw signal.reason;
      error = e;
      if ((e as { final?: boolean }).final) break;
    }
  }
  throw error instanceof Error ? error : new Error(String(error));
}

/** Fetch `url` as JSON (GET unless `options` says otherwise). See `fetchWith` for retries. */
export function fetchJson(
  url: string,
  timing: FetchTiming,
  options: FetchOptions = {},
): Promise<unknown> {
  return fetchWith(url, timing, options, (r) => r.json() as Promise<unknown>);
}

/** Fetch `url` as text (GET unless `options` says otherwise). See `fetchWith` for retries. */
export function fetchText(
  url: string,
  timing: FetchTiming,
  options: FetchOptions = {},
): Promise<string> {
  return fetchWith(url, timing, options, (r) => r.text());
}
