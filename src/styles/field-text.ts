import { css } from 'lit';

// Help and "required" text beside form fields (base.css only, composed into `controls`), for
// forms in a page or a <uvalib-dialog>: Virgo's dialog forms set them in a light grey that
// failed contrast. Both use the muted text role token, #4b5563 on white (7.5:1) and #adadad
// on the dark surface (8.4:1): WCAG AAA for body text in both schemes. Tie help text to its
// field with aria-describedby; say "required" in words (and set `required` on the field),
// never with colour or an asterisk alone.
export const fieldText = css`
  .uvalib-help {
    display: block;
    margin-block: 0.25rem 0;
    color: var(--uva-color-text-muted, #4b5563);
    font-size: 0.9375rem;
    line-height: 1.4;
  }
  .uvalib-required {
    color: var(--uva-color-text-muted, #4b5563);
    font-weight: 400;
  }
`;
