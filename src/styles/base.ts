import { css } from 'lit';

export const TYPEKIT_URL = 'https://use.typekit.net/oym8nvz.css';

export const base = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  html,
  body {
    font-family: var(--uva-font-family, franklin-gothic-urw, Arial, Helvetica, sans-serif);
  }
  html {
    font-size: var(--uva-font-size-base, 17px);
  }
  body {
    margin: 0;
    line-height: 1.5;
    min-height: 100vh;
    color: var(--uva-grey-darkest, #2b2b2b);
  }
`;
