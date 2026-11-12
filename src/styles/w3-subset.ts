import { css } from 'lit';

// Subset of w3.css (via monorepo packages/site-style/src/SiteStyleW3.ts): only the
// classes used by the header and footer templates.
export const w3Subset = css`
  .w3-col {
    float: left;
    width: 100%;
  }
  .w3-container:after,
  .w3-container:before,
  .w3-row:after,
  .w3-row:before,
  .w3-row-padding:after,
  .w3-row-padding:before,
  .w3-clear:after,
  .w3-clear:before {
    content: '';
    display: table;
    clear: both;
  }
  .w3-container {
    padding: 0.01em 16px;
  }
  .w3-row-padding,
  .w3-row-padding > .w3-col {
    padding: 0 8px;
  }
  .w3-mobile {
    display: block;
    width: 100% !important;
  }
`;
