import { css } from 'lit';

/**
 * A metric-matched fallback for Franklin Gothic URW (issue #32). The Adobe Fonts kit uses
 * `font-display: auto`, so on a slow connection text is drawn in the next font of
 * `--uva-font-family` and redrawn when the kit's files arrive. Plain Arial is wider than
 * Franklin Gothic (by 6% regular, 9% bold), so paragraphs rewrapped and the page moved
 * (layout shift). "UVA Franklin Fallback" is the system's Arial scaled to Franklin Gothic's
 * average widths, with its ascent and descent, for each face the kit serves (400, 500, 700 and
 * 400 italic; a 600 rule gets the 700 face, as the kit's own matching does). Measured against
 * the kit in Chromium: the fallback wraps a paragraph like Franklin Gothic in about 99% of
 * widths from 260 to 700px at 16 to 20px, against 55 to 82% for plain Arial.
 *
 * `size-adjust` scales Arial's glyphs; the overrides are Franklin Gothic's ascent (0.95 em) and
 * descent (0.25 em) divided by that scale, with no line gap, so a line is as tall in both.
 * Liberation Sans (Linux) has Arial's metrics. Where neither is installed (Android has Roboto),
 * the face is skipped and the next font in the stack is used, as before.
 */
export const fontFallback = css`
  @font-face {
    font-family: 'UVA Franklin Fallback';
    src: local('Arial'), local('ArialMT'), local('Liberation Sans'), local('LiberationSans');
    font-weight: 100 450;
    font-style: normal;
    size-adjust: 94.52%;
    ascent-override: 100.93%;
    descent-override: 26.56%;
    line-gap-override: 0%;
  }
  @font-face {
    font-family: 'UVA Franklin Fallback';
    src: local('Arial'), local('ArialMT'), local('Liberation Sans'), local('LiberationSans');
    font-weight: 451 599;
    font-style: normal;
    size-adjust: 95.99%;
    ascent-override: 99.18%;
    descent-override: 26.04%;
    line-gap-override: 0%;
  }
  @font-face {
    font-family: 'UVA Franklin Fallback';
    src:
      local('Arial Bold'), local('Arial-BoldMT'), local('Liberation Sans Bold'),
      local('LiberationSans-Bold');
    font-weight: 600 1000;
    font-style: normal;
    size-adjust: 91.32%;
    ascent-override: 104.03%;
    descent-override: 27.38%;
    line-gap-override: 0%;
  }
  @font-face {
    font-family: 'UVA Franklin Fallback';
    src:
      local('Arial Italic'), local('Arial-ItalicMT'), local('Liberation Sans Italic'),
      local('LiberationSans-Italic');
    font-weight: 100 599;
    font-style: italic;
    size-adjust: 95.06%;
    ascent-override: 101.09%;
    descent-override: 26.4%;
    line-gap-override: 0%;
  }
`;
