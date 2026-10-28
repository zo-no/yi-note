import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStoreActions } from 'easy-peasy';
import styled from 'styled-components';
import { Grid } from '@material-ui/core';
import Video from './Video';
import ExportAndImport from './ExportAndImport';

const StyledSection = styled.section`
  width: 100%;
  padding: 24px;
  background: ${props => props.theme.tokens.colors.surface};
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;
`;

const Settings = () => {
  const { t } = useTranslation('options');
  const {
    app: { setTitle }
  } = useStoreActions(actions => actions);

  useEffect(() => {
    setTitle(t('settings.title'));
  }, [setTitle, t]);

  return (
    <Grid container spacing={3}>
      <Grid item container>
        <StyledSection>
          <Video />
        </StyledSection>
      </Grid>
      <Grid item container>
        <StyledSection>
          <ExportAndImport />
        </StyledSection>
      </Grid>
    </Grid>
  );
};

export default Settings;
