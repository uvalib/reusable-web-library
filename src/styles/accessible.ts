import { css } from 'lit';

export const accessible = css`
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .skip-link {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 1000;
    padding: 0.5em 1em;
    background: var(--uva-brand-blue, #232d4b);
    color: #fff;
    transform: translateY(-120%);
  }
  .skip-link:focus-visible {
    transform: translateY(0);
  }
  a:focus-visible,
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  [tabindex]:focus-visible {
    outline: 3px solid var(--uva-brand-orange, #e57200);
    outline-offset: 2px;
  }
`;
