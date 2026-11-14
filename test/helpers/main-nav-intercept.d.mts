export const MAIN_NAV_TEST_HOST: string;
export const MAIN_NAV_FAIL_HOST: string;
export const MAIN_NAV_HANG_HOST: string;
export const MAIN_NAV_TEST_ITEMS: {
  label: string;
  href?: string;
  items?: { label: string; href: string }[];
}[];
export function interceptMainNav(context: unknown): Promise<unknown>;
