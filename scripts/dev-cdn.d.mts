import type { IncomingMessage, ServerResponse } from 'node:http';
/** The dev URL for a request (see dev-cdn.mjs). */
export function devCdnUrl(url: string): string;
/** Connect middleware serving the Pagefind demo index in dev. */
export function pagefindDemoMiddleware(): (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => Promise<void> | void;
