/**
 * Region parsing shared by `<uvalib-image-regions>` and `<uvalib-lightbox>` (its
 * `data-regions`). No Lit, no DOM rendering: small enough for the lightbox to import
 * statically.
 */

/** One region on an image. */
export interface ImageRegion {
  /** A stable id, sent back in events. */
  id?: string;
  /** The region's name, shown in the list and on the highlighted outline. */
  label: string;
  /** Left edge, in `unit`s from the image's left. */
  x: number;
  /** Top edge, in `unit`s from the image's top. */
  y: number;
  /** Width, in `unit`s. */
  w: number;
  /** Height, in `unit`s. */
  h: number;
  /**
   * `percent` (of the image's width and height) or `px` (pixels of the image's natural size,
   * or of `image-width` × `image-height` when set). Default `px`, as in IIIF.
   */
  unit?: 'px' | 'percent';
  /** Where the region's list entry links. */
  href?: string;
  /** A short description after the label in the list. */
  description?: string;
}

/** A region box: its unit and four numbers. */
export interface RegionBox {
  x: number;
  y: number;
  w: number;
  h: number;
  unit: 'px' | 'percent';
}

/**
 * A IIIF / Media Fragments `xywh` value: `percent:10,20,30,40`, `pixel:160,120,320,240`
 * or `160,120,320,240` (pixels), optionally as `xywh=…` or a URL ending `#xywh=…`.
 * Returns null for anything else, and for a zero width or height. Regions are unsigned;
 * `signed` also takes a negative `x` and `y` (a lightbox version's `frame`: the original's
 * box in a crop starts left of or above it). The width and height stay positive.
 */
export function parseXywh(
  value: string | null | undefined,
  options: { signed?: boolean } = {},
): RegionBox | null {
  let s = String(value ?? '').trim();
  const at = s.lastIndexOf('xywh=');
  if (at >= 0) s = s.slice(at + 5);
  s = s.split('&')[0]!.trim();
  let unit: RegionBox['unit'] = 'px';
  const prefix = /^(pixel|percent):/i.exec(s);
  if (prefix) {
    unit = prefix[1]!.toLowerCase() === 'percent' ? 'percent' : 'px';
    s = s.slice(prefix[0].length);
  }
  const parts = s.split(',');
  const num = options.signed ? /^\s*-?\d+(\.\d+)?\s*$/ : /^\s*\d+(\.\d+)?\s*$/;
  if (parts.length !== 4 || parts.some((p) => !num.test(p))) return null;
  const [x, y, w, h] = parts.map(Number) as [number, number, number, number];
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h, unit };
}

const text = (v: unknown): string =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** A usable region from an unknown value (an `items` entry or JSON), or null. */
export function toRegion(v: unknown): ImageRegion | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const label = text(o.label);
  let box: RegionBox | null = null;
  if (typeof o.xywh === 'string') box = parseXywh(o.xywh);
  else {
    const n = [o.x, o.y, o.w, o.h].map((x) => (typeof x === 'string' ? Number(x) : x));
    if (n.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0)) {
      const [x, y, w, h] = n as number[];
      if (w! > 0 && h! > 0)
        box = { x: x!, y: y!, w: w!, h: h!, unit: o.unit === 'percent' ? 'percent' : 'px' };
    }
  }
  if (!box) return null;
  const out: ImageRegion = { label, ...box };
  if (o.id != null && text(o.id)) out.id = text(o.id);
  if (typeof o.href === 'string' && o.href.trim()) out.href = o.href.trim();
  if (o.description != null && text(o.description)) out.description = text(o.description);
  return out;
}

/**
 * Regions written in an attribute (the lightbox's `data-regions`): a JSON array of region
 * objects, or entries separated by `;`, each an `xywh` value then its label, e.g.
 * `percent:10,20,30,40 Person 1; percent:55,15,20,30 Sign`. Entries that do not parse are
 * dropped.
 */
export function parseRegions(value: string | null | undefined): ImageRegion[] {
  const s = String(value ?? '').trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const list: unknown = JSON.parse(s);
      return Array.isArray(list)
        ? list.map(toRegion).filter((r): r is ImageRegion => r !== null)
        : [];
    } catch {
      return [];
    }
  }
  const out: ImageRegion[] = [];
  for (const entry of s.split(';')) {
    const m = /^\s*(\S+)\s*(.*)$/.exec(entry);
    if (!m) continue;
    const box = parseXywh(m[1]);
    if (box) out.push({ label: text(m[2]), ...box });
  }
  return out;
}

/**
 * The box in percent of the image, clamped to it. Pixel boxes need the coordinate space
 * (`width` × `height`); without it they return null (not drawn yet).
 */
export function toPercent(box: RegionBox, width: number, height: number): RegionBox | null {
  let { x, y, w, h } = box;
  if (box.unit === 'px') {
    if (!(width > 0) || !(height > 0)) return null;
    x = (x / width) * 100;
    w = (w / width) * 100;
    y = (y / height) * 100;
    h = (h / height) * 100;
  }
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const left = clamp(x);
  const top = clamp(y);
  const right = clamp(x + w);
  const bottom = clamp(y + h);
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, w: right - left, h: bottom - top, unit: 'percent' };
}
