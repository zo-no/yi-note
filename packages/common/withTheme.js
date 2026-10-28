import React from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  StylesProvider,
  createGenerateClassName,
  createMuiTheme
} from '@material-ui/core/styles';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { APP_ID } from './constants';
import { tokens } from './theme';

const { colors, fonts, fontSizes, radius } = tokens;
const heading = {
  fontFamily: fonts.heading,
  fontWeight: 600,
  lineHeight: 1.4,
  color: colors.ink
};

// Portals must stay inside the extension root, including on MUI host pages.
const getContainer = () =>
  typeof document === 'undefined' ? null : document.getElementById(APP_ID);
const generateClassName = createGenerateClassName({
  disableGlobal: true,
  seed: 'wildframe'
});

const theme = createMuiTheme({
  tokens,
  header: { height: 112 },
  footer: { height: 56 },
  panel: { width: 380, zIndex: 8000 },
  spacing: tokens.space,
  shape: { borderRadius: radius.small },
  zIndex: { modal: 8000, tooltip: 8050 },
  palette: {
    common: { black: colors.ink, white: colors.surface },
    grey: {
      50: colors.surface,
      100: colors.canvas,
      200: colors.border,
      300: colors.border,
      400: colors.controlBorder,
      500: colors.muted,
      600: colors.muted,
      700: colors.ink,
      800: colors.ink,
      900: colors.ink,
      A100: colors.surface,
      A200: colors.border,
      A400: colors.muted,
      A700: colors.ink
    },
    primary: { main: colors.action, contrastText: colors.surface },
    secondary: { main: colors.action, contrastText: colors.surface },
    background: { default: colors.canvas, paper: colors.surface },
    text: {
      primary: colors.ink,
      secondary: colors.muted,
      disabled: colors.muted
    },
    divider: colors.border,
    error: { main: colors.error },
    success: { main: colors.success },
    warning: { main: colors.warning },
    info: { main: colors.ink },
    action: {
      active: colors.action,
      hover: colors.hover,
      selected: colors.selected,
      focus: colors.selected,
      disabled: colors.muted,
      disabledBackground: colors.canvas
    }
  },
  typography: {
    fontFamily: fonts.body,
    fontSize: fontSizes.compact,
    h1: { ...heading, fontSize: fontSizes.title },
    h2: { ...heading, fontSize: 28 },
    h3: { ...heading, fontSize: fontSizes.heading },
    h4: { ...heading, fontSize: fontSizes.heading },
    h5: { ...heading, fontSize: fontSizes.heading },
    h6: { ...heading, fontSize: fontSizes.heading },
    subtitle1: { fontSize: fontSizes.body, fontWeight: 600 },
    subtitle2: { fontSize: fontSizes.compact, fontWeight: 600 },
    body1: { fontSize: fontSizes.body, lineHeight: 1.6 },
    body2: { fontSize: fontSizes.compact, lineHeight: 1.6 },
    button: {
      fontSize: fontSizes.compact,
      fontWeight: 600,
      textTransform: 'none'
    },
    caption: { fontSize: fontSizes.auxiliary, lineHeight: 1.5 },
    overline: { fontSize: fontSizes.auxiliary }
  },
  props: {
    MuiButton: { disableElevation: true, color: 'primary' },
    MuiTabs: { indicatorColor: 'primary', textColor: 'primary' },
    MuiDialog: { container: getContainer, disableScrollLock: true },
    MuiModal: { container: getContainer, disableScrollLock: true },
    MuiPopover: { container: getContainer, disableScrollLock: true },
    MuiTooltip: { PopperProps: { container: getContainer } }
  },
  overrides: {
    MuiPaper: {
      rounded: { borderRadius: radius.medium },
      elevation1: { boxShadow: 'none', border: `1px solid ${colors.border}` },
      elevation8: { boxShadow: tokens.shadows.floating },
      elevation16: { boxShadow: tokens.shadows.floating },
      elevation24: { boxShadow: tokens.shadows.floating }
    },
    MuiAppBar: {
      root: { boxShadow: 'none', borderBottom: `1px solid ${colors.border}` },
      colorPrimary: { backgroundColor: colors.surface, color: colors.ink }
    },
    MuiToolbar: { regular: { minHeight: 64 } },
    MuiButton: {
      root: { minHeight: 32, padding: '8px 16px' },
      outlined: { borderColor: colors.controlBorder },
      contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } }
    },
    MuiButtonBase: {
      root: {
        '&:focus-visible': {
          outline: `2px solid ${colors.action}`,
          outlineOffset: 2
        }
      }
    },
    MuiIconButton: { root: { borderRadius: radius.small } },
    MuiSvgIcon: { root: { fontSize: 24 } },
    MuiInputBase: { root: { fontSize: fontSizes.compact } },
    MuiInput: {
      underline: { '&:before': { borderBottomColor: colors.controlBorder } }
    },
    MuiOutlinedInput: { notchedOutline: { borderColor: colors.controlBorder } },
    MuiFormLabel: { root: { fontSize: fontSizes.compact } },
    MuiFormHelperText: { root: { fontSize: fontSizes.auxiliary } },
    MuiChip: {
      root: {
        height: 28,
        fontSize: fontSizes.auxiliary,
        borderRadius: radius.pill,
        backgroundColor: colors.inset,
        color: colors.muted,
        border: '1px solid transparent'
      },
      colorPrimary: { backgroundColor: colors.peach, color: colors.action },
      colorSecondary: {
        backgroundColor: colors.sageSoft,
        color: colors.success
      },
      outlined: { borderColor: colors.border },
      clickable: { '&:hover': { backgroundColor: colors.peach } }
    },
    MuiLinearProgress: {
      root: { borderRadius: radius.pill, backgroundColor: colors.sageSoft },
      barColorPrimary: { backgroundColor: colors.sage }
    },
    MuiTab: { root: { fontSize: fontSizes.compact, textTransform: 'none' } },
    MuiListItem: {
      root: {
        '&$selected, &$selected:hover': {
          backgroundColor: colors.selected,
          color: colors.action
        }
      }
    },
    MuiListItemIcon: { root: { color: 'inherit', minWidth: 40 } },
    MuiTooltip: {
      tooltip: {
        fontSize: fontSizes.auxiliary,
        lineHeight: 1.5,
        backgroundColor: colors.ink,
        color: colors.surface,
        borderRadius: radius.small
      }
    },
    MuiDialog: {
      paper: {
        border: `1px solid ${colors.border}`,
        borderRadius: radius.large
      }
    },
    MuiBackdrop: { root: { backgroundColor: colors.backdrop } },
    MuiSnackbarContent: {
      root: { backgroundColor: colors.ink, color: colors.surface }
    },
    MuiSwitch: {
      thumb: { boxShadow: 'none' },
      track: { backgroundColor: colors.muted }
    }
  }
});

export default Component => {
  const WithTheme = () => (
    <StylesProvider generateClassName={generateClassName}>
      <StyledThemeProvider theme={theme}>
        <MuiThemeProvider theme={theme}>
          <Component />
        </MuiThemeProvider>
      </StyledThemeProvider>
    </StylesProvider>
  );
  return WithTheme;
};
