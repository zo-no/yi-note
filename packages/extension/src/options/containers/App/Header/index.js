import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useStoreState, useStoreActions } from 'easy-peasy';
import styled from 'styled-components';
import {
  AppBar,
  Toolbar as MuiToolbar,
  Typography,
  IconButton,
  Hidden
} from '@material-ui/core';
import { Menu as MenuIcon, ArrowBack } from '@material-ui/icons';
import Toolbar from './Toolbar';
import { drawerWidth, headerHeight } from '../constants';

const StyledAppBar = styled(AppBar)`
  @media (min-width: 600px) {
    margin-left: ${drawerWidth}px;
    width: calc(100% - ${drawerWidth}px);
  }
`;

const StyledToolbar = styled(MuiToolbar)`
  min-height: ${headerHeight}px;
  padding: 0 ${props => props.theme.tokens.layout.pagePadding}px;
  gap: 12px;

  @media (max-width: 959px) {
    padding: 0 12px;
    gap: 8px;
  }
`;

const StyledTitle = styled(Typography)`
  flex: 1;
  min-width: 0;
  font-family: ${props => props.theme.tokens.fonts.body};
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  font-weight: 600;
  color: ${props => props.theme.tokens.colors.ink};
`;

const StyledBackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  color: inherit;
  text-decoration: none;

  & svg {
    font-size: 20px;
  }

  &:hover {
    color: ${props => props.theme.tokens.colors.action};
  }
`;

const StyledActions = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  max-width: calc(100% - 80px);
  overflow-x: auto;
  color: ${props => props.theme.tokens.colors.ink};

  & button {
    padding: 7px;
    margin-left: 4px;
  }

  & svg {
    width: 20px;
    height: 20px;
  }
`;

const Header = () => {
  const { t } = useTranslation('options');
  const { pathname } = useLocation();
  const isPage = pathname.startsWith('/pages/');
  const {
    title,
    drawer: { open: drawerOpen }
  } = useStoreState(state => state.app);
  const { setOpen: setDrawOpen } = useStoreActions(
    actions => actions.app.drawer
  );

  const handleDrawerToggle = () => setDrawOpen(!drawerOpen);

  return (
    <StyledAppBar position="fixed" elevation={0}>
      <StyledToolbar variant="dense">
        <Hidden smUp>
          <IconButton
            edge="start"
            color="inherit"
            aria-label={t('navigation.toggle')}
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
        </Hidden>
        <StyledTitle component={isPage ? 'div' : 'h1'} noWrap>
          {isPage ? (
            <StyledBackLink to="/" aria-label={t('page.back')}>
              <ArrowBack />
              {t('bookmarks.title')}
            </StyledBackLink>
          ) : (
            title || t('bookmarks.title')
          )}
        </StyledTitle>
        <StyledActions>
          <Toolbar />
        </StyledActions>
      </StyledToolbar>
    </StyledAppBar>
  );
};

export default Header;
