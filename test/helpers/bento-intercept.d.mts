export const TOKEN: string;
export const STALE_TOKEN: string;
export const XSS: string;
export const BENTO_FAIL_HOST: string;
export const BENTO_EMPTY_HOST: string;
export const BENTO_HANG_HOST: string;
export const BENTO_STALE_HOST: string;
export function interceptBento(context: unknown): Promise<unknown>;
