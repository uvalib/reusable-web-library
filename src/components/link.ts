/** Join a site root and a path with exactly one "/"; absolute (http*) paths pass through. */
export function siteLink(root: string, path: string): string {
  if (path.startsWith('http')) return path;
  return `${root.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
