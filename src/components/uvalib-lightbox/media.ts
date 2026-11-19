/** Location pieces the deep-link helpers read and write. `search` includes the leading `?`. */
export interface PageLocation {
  pathname: string;
  search: string;
  hash: string;
}

const REGION = /^(full|square|max|pct:[^/]+|\d+,\d+,\d+,\d+)$/i;
const ROTATION = /^!?\d+(\.\d+)?$/;
const QUALITY = /^(default|color|gray|grey|bitonal|native)\.(jpe?g|png|gif|webp|tiff?|jp2)$/i;

export interface IiifRequest {
  url: URL;
  /** Path segments, with a leading `''` for an absolute path. */
  parts: string[];
  regionIndex: number;
  sizeIndex: number;
}

/**
 * A IIIF Image API request, recognised from the end of the path:
 * `/{region}/{size}/{rotation}/{quality}.{format}`. The identifier may contain slashes
 * and colons (`uva-lib:286686`). Anything else, including an image that merely lives
 * under a `/full/` folder, is not one.
 */
export function parseIiif(href: string, base: string): IiifRequest | null {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const parts = url.pathname.split('/');
  if (parts.length < 5) return null;
  const file = parts[parts.length - 1] ?? '';
  const rotation = parts[parts.length - 2] ?? '';
  const region = parts[parts.length - 4] ?? '';
  if (!QUALITY.test(file) || !ROTATION.test(rotation) || !REGION.test(region)) return null;
  return { url, parts, regionIndex: parts.length - 4, sizeIndex: parts.length - 3 };
}

/**
 * The same image requested at `/full/!w,h/` so the server sends a size that fits `w` by `h`
 * device pixels and does not scale the original up. Returns null when `href` is not IIIF.
 */
export function sizedIiifUrl(href: string, base: string, w: number, h: number): string | null {
  const parsed = parseIiif(href, base);
  if (!parsed) return null;
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  parsed.parts[parsed.regionIndex] = 'full';
  parsed.parts[parsed.sizeIndex] = `!${width},${height}`;
  parsed.url.pathname = parsed.parts.join('/');
  return parsed.url.toString();
}

/** The IIIF identifier (the segment before the region), for a stable deep-link id. */
export function iiifIdentifier(href: string, base: string): string | null {
  const parsed = parseIiif(href, base);
  if (!parsed) return null;
  const id = parsed.parts[parsed.regionIndex - 1];
  return id || null;
}

/** CSS pixels of the viewport, in device pixels, capped so a request stays reasonable. */
export function viewportIiifSize(
  view: Pick<Window, 'innerWidth' | 'innerHeight' | 'devicePixelRatio'>,
): {
  w: number;
  h: number;
} {
  const dpr = Math.min(view.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.min(2000, Math.round((view.innerWidth || 800) * dpr)));
  const h = Math.max(1, Math.min(2000, Math.round((view.innerHeight || 600) * dpr)));
  return { w, h };
}

/**
 * Whether `href` may be shown or offered as the full image: http(s), a relative URL, or a
 * `data:image/…` URL. `javascript:` and other schemes are refused.
 */
export function usableImageUrl(href: string, base: string): boolean {
  try {
    const url = new URL(href, base);
    if (url.protocol === 'http:' || url.protocol === 'https:') return true;
    if (url.protocol === 'data:') return url.pathname.startsWith('image/');
    return false;
  } catch {
    return false;
  }
}

/** A hash used as a route (`#/…`, `#!/…`) or that already carries a query string. */
function hashRoute(hash: string): boolean {
  return hash.startsWith('#/') || hash.startsWith('#!/') || hash.includes('?');
}

/** The deep-link id in `loc`, from the hash query on a hash route and the search string otherwise. */
export function paramFromLocation(loc: PageLocation, name: string): string | null {
  if (!name) return null;
  if (hashRoute(loc.hash)) {
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
 */
export function hrefWithParam(loc: PageLocation, name: string, id: string | null): string {
  if (hashRoute(loc.hash)) {
    const q = loc.hash.indexOf('?');
    const path = q >= 0 ? loc.hash.slice(0, q) : loc.hash;
    const params = new URLSearchParams(q >= 0 ? loc.hash.slice(q + 1) : '');
    if (id) params.set(name, id);
    else params.delete(name);
    const qs = params.toString();
    return loc.pathname + loc.search + (qs ? `${path}?${qs}` : path);
  }
  const params = new URLSearchParams(loc.search);
  if (id) params.set(name, id);
  else params.delete(name);
  const qs = params.toString();
  return loc.pathname + (qs ? `?${qs}` : '') + loc.hash;
}
