import React from 'react';
import { useStoreActions } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import Grid from '@material-ui/core/Grid';
import {
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon
} from '@material-ui/icons';
import { IconButton } from '@yi-note/common/components';
import { StyledContainer, StyledBrand, StyledSubtitle } from './styled';
import Search from '../Search';

const Header = () => {
  const { t } = useTranslation('header');
  const history = useHistory();
  const { pathname } = useLocation();
  const {
    search: { setQuery },
    app: { setOpen: setAppOpen }
  } = useStoreActions(actions => actions);

  const handleCloseSearch = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      setAppOpen(false);
    }
    setQuery('');
  };

  const handleClose = () => setAppOpen(false);

  return (
    <StyledContainer
      container
      justify="space-between"
      alignItems="center"
      direction="row"
    >
      <Grid item xs={10}>
        <StyledBrand>wildframe</StyledBrand>
        <StyledSubtitle>
          {t('subtitle', { defaultValue: 'Video notes, in context' })}
        </StyledSubtitle>
      </Grid>
      <Grid item xs={2} container justify="flex-end">
        {pathname === '/search' && history.length > 1 ? (
          <IconButton
            aria-label={t('closeSearch', { defaultValue: 'Close search' })}
            onClick={handleCloseSearch}
          >
            <CloseIcon />
          </IconButton>
        ) : (
          <IconButton
            aria-label={t('closePanel', { defaultValue: 'Close wildframe' })}
            onClick={handleClose}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Grid>
      <Grid item xs={12}>
        <Search />
      </Grid>
    </StyledContainer>
  );
};

export default Header;
