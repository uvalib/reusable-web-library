export const LIBCAL_HOST: string;
export const DRUPAL_PATH: string;
export const HOURS_FAIL_HOST: string;
export const HOURS_EMPTY_HOST: string;
export const HOURS_HANG_HOST: string;
export function interceptHours(context: unknown): Promise<unknown>;
export function hoursClockPlugin(): unknown;
