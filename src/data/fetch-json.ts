// Shared JSON fetching for the data-backed components (library hours, events). Internal: not
// exported from the package entry. No side effects on import.

/** How a fetch is attempted: attempts, the delay between them (ms) and each attempt's timeout (ms). */
export interface FetchTiming {
  retries: number;
  retryDelay: number;
  timeout: number;
}

/**
 * GET `url` as JSON. Each attempt times out after `timing.timeout` ms; a failed, non-OK or
 * timed-out attempt is retried after `timing.retryDelay` ms, `timing.retries` attempts in all.
 * Rejects with the last attempt's error.
 */
export async function fetchJson(url: string, timing: FetchTiming): Promise<unknown> {
  let error: unknown;
  const attempts = Math.max(1, timing.retries);
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, timing.retryDelay));
    try {
      // A hung attempt times out and counts as a failed attempt.
      const response = await fetch(url, { signal: AbortSignal.timeout(timing.timeout) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
      return await response.json();
    } catch (e) {
      error = e;
    }
  }
  throw error instanceof Error ? error : new Error(String(error));
}
