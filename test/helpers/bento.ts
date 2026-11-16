import {
  bentoEndpoints,
  bentoTiming,
  resetBentoCache,
} from '../../src/components/bento-box/bento-data.js';

const DEFAULT_ENDPOINTS = { ...bentoEndpoints };
const DEFAULT_TIMING = { ...bentoTiming };

/** Forget cached results and the token, restore the endpoints, with fast retries for tests. */
export function resetBento(): void {
  resetBentoCache();
  delete window.uvalibBentoEndpoints;
  Object.assign(bentoEndpoints, DEFAULT_ENDPOINTS);
  Object.assign(bentoTiming, DEFAULT_TIMING, { retryDelay: 1 });
}

/** Point every source at a test host from bento-intercept.mjs (`bento-fail.test`, …). */
export function useBentoHost(
  host: string,
  keys: (keyof typeof bentoEndpoints)[] = ['authorize', 'catalog', 'articles', 'guides', 'website'],
): void {
  const paths = {
    authorize: '/authorize',
    catalog: '/api/search',
    articles: '/api/search',
    guides: '/production/library/libguides-proxy',
    website: '/jsonapi/index/default_index',
  };
  for (const k of keys) bentoEndpoints[k] = `https://${host}${paths[k]}`;
}
