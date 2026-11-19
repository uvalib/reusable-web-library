/** rightsstatements.org's statements, by their id in the URL, with their short names. */
const STATEMENTS: Record<string, string> = {
  INC: 'In Copyright',
  'INC-OW-EU': 'In Copyright – EU Orphan Work',
  'INC-EDU': 'In Copyright – Educational Use Permitted',
  'INC-NC': 'In Copyright – Non-Commercial Use Permitted',
  'INC-RUU': 'In Copyright – Rights-holder(s) Unlocatable or Unidentifiable',
  'NOC-CR': 'No Copyright – Contractual Restrictions',
  'NOC-NC': 'No Copyright – Non-Commercial Use Only',
  'NOC-OKLR': 'No Copyright – Other Known Legal Restrictions',
  'NOC-US': 'No Copyright – United States',
  CNE: 'Copyright Not Evaluated',
  UND: 'Copyright Undetermined',
  NKC: 'No Known Copyright',
};

/**
 * The short name of a rightsstatements.org statement or Creative Commons licence or tool from
 * its URL ("In Copyright", "CC BY-NC 4.0", "CC0 1.0", "Public Domain Mark 1.0"), or
 * `undefined` for any other URL.
 */
export function rightsName(href: string): string | undefined {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return undefined;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const path = u.pathname;
  if (host === 'rightsstatements.org') {
    const m = /^\/(?:vocab|page|data)\/([a-z-]+)\/\d/i.exec(path);
    return m ? STATEMENTS[m[1]!.toUpperCase()] : undefined;
  }
  if (host === 'creativecommons.org') {
    const licence = /^\/licenses\/((?:by|nc|nd|sa)(?:-(?:by|nc|nd|sa))*)\/(\d+(?:\.\d+)*)/i.exec(
      path,
    );
    if (licence) return `CC ${licence[1]!.toUpperCase()} ${licence[2]}`;
    const tool = /^\/publicdomain\/(zero|mark)\/(\d+(?:\.\d+)*)/i.exec(path);
    if (tool)
      return tool[1]!.toLowerCase() === 'zero' ? `CC0 ${tool[2]}` : `Public Domain Mark ${tool[2]}`;
  }
  return undefined;
}

/** The Albert and Shirley Small Special Collections Library's citation for a title or collection. */
export const specialCollectionsCitation = (title: string): string =>
  `${title}, Albert and Shirley Small Special Collections Library, University of Virginia`;
