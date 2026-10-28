import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  Grid,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Hidden,
  Drawer
} from '@material-ui/core';
import {
  Bookmarks as BookmarksIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  GitHub as GitHubIcon,
  BugReport as BugReportIcon
} from '@material-ui/icons';
import {
  APP_ID,
  GITHUB_URL,
  FAQ_URL,
  ISSUE_URL
} from '@yi-note/common/constants';
import { getVersion } from '@yi-note/common/utils';
import { drawerWidth } from '../constants';
import brandIcon from '../../../../../icons/icon-128.png';

const version = getVersion();

const StyledNav = styled.nav`
  @media (min-width: 600px) {
    width: ${drawerWidth}px;
  }
`;

const StyledDrawer = styled(({ ...rest }) => (
  <Drawer classes={{ paper: 'paper' }} {...rest} />
))`
  & .paper {
    width: ${drawerWidth}px;
    background: ${props => props.theme.tokens.colors.sidebar};
    color: ${props => props.theme.tokens.colors.ink};
    border-right: 1px solid ${props => props.theme.tokens.colors.border};
  }
`;

const StyledDrawerHeader = styled.div`
  min-height: 96px;
  display: flex;
  align-items: center;
  padding: 20px 16px;

  & img {
    display: block;
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  & h6 {
    font-family: ${props => props.theme.tokens.fonts.body};
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -1px;
  }
`;

const StyledList = styled(List)`
  padding: 4px 10px;
`;

const StyledNavItem = styled(ListItem)`
  min-height: 40px;
  margin-bottom: 4px;
  padding: 4px 12px;
  border-radius: ${props => props.theme.tokens.radius.small}px;

  &[aria-current='page'] {
    background: ${props => props.theme.tokens.colors.selected};
    color: ${props => props.theme.tokens.colors.action};
  }

  &[aria-current='page'] span {
    font-weight: 600;
  }
`;

const ResponsiveDrawer = () => {
  const { t } = useTranslation(['options']);
  const history = useHistory();
  const { pathname } = useLocation();
  const containerRef = useRef(null);
  const { open } = useStoreState(state => state.app.drawer);
  const { setOpen } = useStoreActions(actions => actions.app.drawer);

  useEffect(() => {
    containerRef.current = document.getElementById(APP_ID);
  }, []);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const drawer = (
    <>
      <StyledDrawerHeader>
        <Grid
          container
          direction="row"
          alignItems="center"
          spacing={1}
          wrap="nowrap"
        >
          <Grid item>
            <img src={brandIcon} alt="" />
          </Grid>
          <Grid item>
            <Typography variant="h6">wildframe</Typography>
            <Typography
              variant="caption"
              color="textSecondary"
            >{`v${version}`}</Typography>
          </Grid>
        </Grid>
      </StyledDrawerHeader>
      <StyledList>
        {[
          {
            label: t('bookmarks.title'),
            path: '/',
            icon: <BookmarksIcon />,
            onClick: () => history.push('/')
          },
          {
            label: t('settings.title'),
            path: '/settings',
            icon: <SettingsIcon />,
            onClick: () => history.push('/settings')
          }
        ].map(item => (
          <StyledNavItem
            button
            key={item.label}
            onClick={() => {
              item.onClick();
              setOpen(false);
            }}
            selected={
              pathname === item.path ||
              (item.path === '/' && pathname.startsWith('/pages/'))
            }
            aria-current={pathname === item.path ? 'page' : undefined}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </StyledNavItem>
        ))}
      </StyledList>
      <Divider style={{ margin: '8px 24px' }} />
      <StyledList>
        <StyledNavItem button onClick={() => window.open(FAQ_URL, '_blank')}>
          <ListItemIcon>
            <HelpIcon />
          </ListItemIcon>
          <ListItemText primary={t('faq')} />
        </StyledNavItem>
        <StyledNavItem button onClick={() => window.open(ISSUE_URL, '_blank')}>
          <ListItemIcon>
            <BugReportIcon />
          </ListItemIcon>
          <ListItemText primary={t('issues')} />
        </StyledNavItem>
        <StyledNavItem button onClick={() => window.open(GITHUB_URL, '_blank')}>
          <ListItemIcon>
            <GitHubIcon />
          </ListItemIcon>
          <ListItemText primary={t('github')} />
        </StyledNavItem>
      </StyledList>
    </>
  );

  return (
    <StyledNav>
      <Hidden smUp>
        <StyledDrawer
          variant="temporary"
          container={containerRef.current}
          open={open}
          onClose={handleDrawerToggle}
        >
          {drawer}
        </StyledDrawer>
      </Hidden>
      <Hidden xsDown>
        <StyledDrawer variant="permanent" open>
          {drawer}
        </StyledDrawer>
      </Hidden>
    </StyledNav>
  );
};

export default ResponsiveDrawer;
