/** Join a site root and a path with exactly one "/"; paths with a URL scheme or starting with //  pass through. */
export function siteLink(root: string, path: string): string {
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path;
  return `${root.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
