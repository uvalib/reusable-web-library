// Dates in the library's time zone, America/New_York, whatever the visitor's own zone.
// Internal: not exported from the package entry. No side effects on import.

export const TIME_ZONE = 'America/New_York';

const formatters = new Map<string, Intl.DateTimeFormat>();

/** An en-US `Intl.DateTimeFormat` for `options`, created once per `key` and reused. */
export function formatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat('en-US', options)));
  return f;
}

/** The date in America/New_York at the instant `at` (ms; default now), as `YYYY-MM-DD`. */
export function todayInNewYork(at: number = Date.now()): string {
  const parts = formatter('today', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
