import { svg } from 'lit';

// library.virginia.edu's alert icons (drupal_library_theme: $icon-critical, $icon-warning,
// $icon-info and $icon-close). Decorative: severity is also given as visually hidden text and
// the dismiss button has its own accessible name. They are drawn in currentColor.
// Font Awesome Pro 6.2.0 (c) 2022 Fonticons, Inc. https://fontawesome.com (Commercial License)
const icon = (viewBox: string, d: string) =>
  svg`<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox=${viewBox} aria-hidden="true" focusable="false"><path fill="currentColor" d=${d}></path></svg>`;

/** circle-exclamation (solid): critical, alert1. */
export const criticalIcon = icon(
  '0 0 512 512',
  'M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zm32 224c0 17.7-14.3 32-32 32s-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32z',
);

/** triangle-exclamation (solid): warning, alert2. */
export const warningIcon = icon(
  '0 0 512 512',
  'M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32z',
);

/** circle-info (solid): information, alert3. */
export const infoIcon = icon(
  '0 0 512 512',
  'M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z',
);

/** square-x: the dismiss button. */
export const closeIcon = icon(
  '0 0 448 512',
  'M384 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h320c35.35 0 64-28.65 64-64V96C448 60.65 419.3 32 384 32zM416 416c0 17.64-14.36 32-32 32H64c-17.64 0-32-14.36-32-32V96c0-17.64 14.36-32 32-32h320c17.64 0 32 14.36 32 32V416zM330.4 131.8c-6.688-5.75-16.8-4.938-22.55 1.75L224 231.4l-83.86-97.84C134.4 126.9 124.3 126.2 117.6 131.8c-6.719 5.75-7.5 15.88-1.734 22.56L202.9 256l-87.08 101.6c-5.766 6.688-4.984 16.81 1.734 22.56C120.6 382.8 124.3 384 128 384c4.5 0 8.984-1.906 12.14-5.594L224 280.6l83.86 97.84C311 382.1 315.5 384 320 384c3.688 0 7.391-1.281 10.41-3.844c6.719-5.75 7.5-15.88 1.734-22.56L245.1 256l87.08-101.6C337.9 147.7 337.1 137.6 330.4 131.8z',
);
