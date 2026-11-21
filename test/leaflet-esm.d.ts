// Leaflet's package has no "module" or "exports" entry, so the browser tests import its ES
// module build by path; it has the same API as the 'leaflet' types.
declare module 'leaflet/dist/leaflet-src.esm.js' {
  export * from 'leaflet';
}
