/**
 * Keep a query parameter in the address, in the search string or, on a hash route, inside the
 * hash. Shared by `<uvalib-lightbox url-param>` and `<uvalib-chip-group url-param>`.
 */

/** Location pieces the deep-link helpers read and write. `search` includes the leading `?`. */
export interface PageLocation {
  pathname: string;
  search: string;
  hash: string;
}

/** A hash used as a route (`#/…`, `#!/…`) or that already carries a query string. */
export function usesHashParam(hash: string): boolean {
  return hash.startsWith('#/') || hash.startsWith('#!/') || hash.includes('?');
}

/** The deep-link id in `loc`, from the hash query on a hash route and the search string otherwise. */
export function paramFromLocation(loc: PageLocation, name: string): string | null {
  if (!name) return null;
  if (usesHashParam(loc.hash)) {
    const q = loc.hash.indexOf('?');
    const params = new URLSearchParams(q >= 0 ? loc.hash.slice(q + 1) : '');
    return params.get(name);
  }
  return new URLSearchParams(loc.search).get(name);
}

/**
 * `loc` with `name` set to `id`, or removed when `id` is null. Hash routes keep the param in
 * the hash (`#/text/d9?photo=2`) and leave `search` alone; every other URL uses `search` and
 * keeps the hash. The hash is written as text so a `?` in it is not percent-encoded.
 * `hashMode` forces the hash (or the search) when the caller is mid-rewrite and the hash no
 * longer shows that it was a route, as when `?photo=` was just removed from `#chapter?photo=1`.
 * `keepEmpty` writes an empty `id` as `?name=` instead of removing the parameter.
 */
export function hrefWithParam(
  loc: PageLocation,
  name: string,
  id: string | null,
  hashMode?: boolean,
  keepEmpty = false,
): string {
  const set = id !== null && (id !== '' || keepEmpty);
  if (hashMode ?? usesHashParam(loc.hash)) {
    const q = loc.hash.indexOf('?');
    const path = q >= 0 ? loc.hash.slice(0, q) : loc.hash;
    const params = new URLSearchParams(q >= 0 ? loc.hash.slice(q + 1) : '');
    if (set) params.set(name, id);
    else params.delete(name);
    const qs = params.toString();
    return loc.pathname + loc.search + (qs ? `${path}?${qs}` : path);
  }
  const params = new URLSearchParams(loc.search);
  if (set) params.set(name, id);
  else params.delete(name);
  const qs = params.toString();
  return loc.pathname + (qs ? `?${qs}` : '') + loc.hash;
}
