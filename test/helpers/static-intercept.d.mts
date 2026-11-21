export const STATIC_HOST: string;
export const IIIF_HOST: string;
export const OSM_TILE_HOST: string;
export const LEAFLET_CDN: string;
export function tile(): Uint8Array;
export function interceptStatic(context: unknown): Promise<unknown>;
