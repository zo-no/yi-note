import { createGlobalStyle } from 'styled-components';
import { tokens } from '@yi-note/common/theme';

export default createGlobalStyle`
  html, body {
    min-height: 100%;
    margin: 0;
    background: ${tokens.colors.canvas};
    color: ${tokens.colors.ink};
    font-family: ${tokens.fonts.body};
    font-size: ${tokens.fontSizes.body}px;
    line-height: 1.6;
    color-scheme: light;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  button, input, textarea, select {
    font-family: ${tokens.fonts.body};
  }

  :focus-visible {
    outline: 2px solid ${tokens.colors.action};
    outline-offset: 2px;
  }

  ::selection {
    background: ${tokens.colors.selected};
    color: ${tokens.colors.ink};
  }
`;
