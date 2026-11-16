export const EVENTS_HOST: string;
export const OLD_EVENTS_HOST: string;
export const EVENTS_FAIL_HOST: string;
export const EVENTS_EMPTY_HOST: string;
export const EVENTS_HANG_HOST: string;
export function interceptEvents(context: unknown): Promise<unknown>;
