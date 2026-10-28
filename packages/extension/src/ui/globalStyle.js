import { createGlobalStyle } from 'styled-components';
import { APP_ID } from '@yi-note/common/constants';
import { tokens } from '@yi-note/common/theme';

export default createGlobalStyle`
  #${APP_ID} {
    font-family: ${tokens.fonts.body};
    font-size: ${tokens.fontSizes.compact}px;
    line-height: 1.6;
    color: ${tokens.colors.ink};
    text-align: left;
    color-scheme: light;
  }

  #${APP_ID}, #${APP_ID} *, #${APP_ID} *::before, #${APP_ID} *::after {
    box-sizing: border-box;
  }

  #${APP_ID} button, #${APP_ID} input, #${APP_ID} textarea, #${APP_ID} select {
    font-family: ${tokens.fonts.body};
  }

  #${APP_ID} :focus-visible {
    outline: 2px solid ${tokens.colors.action};
    outline-offset: 2px;
  }

  #${APP_ID} ::selection {
    background: ${tokens.colors.selected};
    color: ${tokens.colors.ink};
  }

  #${APP_ID} .panel-shadow {
    box-shadow: ${tokens.shadows.panel};
  }
`;
