import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Grid from '@material-ui/core/Grid';
import {
  GitHub as GitHubIcon,
  Settings as SettingsIcon
} from '@material-ui/icons';
import { IconButton } from '@yi-note/common/components';
import { GITHUB_URL } from '@yi-note/common/constants';

const StyledContainer = styled(Grid)`
  flex-shrink: 0;
  min-height: ${props => props.theme.footer.height}px;
  padding: 10px 20px;
  background: ${props => props.theme.tokens.colors.sidebar};
  border-top: 1px solid ${props => props.theme.tokens.colors.border};
`;

const Footer = () => {
  const { t } = useTranslation('footer');

  const openGithubRepo = () => {
    window.open(GITHUB_URL, '_blank');
  };

  const openManagementPage = () => {
    browser.runtime.sendMessage({ action: 'open-options' });
  };

  return (
    <StyledContainer container justify="space-between" alignItems="center">
      <Grid item>
        <IconButton tooltip={t('github.tooltip')} onClick={openGithubRepo}>
          <GitHubIcon />
        </IconButton>
      </Grid>
      <Grid item>
        <IconButton
          tooltip={t('management.tooltip')}
          onClick={openManagementPage}
        >
          <SettingsIcon />
        </IconButton>
      </Grid>
    </StyledContainer>
  );
};

export default Footer;
