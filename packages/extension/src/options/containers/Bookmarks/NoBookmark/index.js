import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { BookmarkBorder } from '@material-ui/icons';

const StyledEmptyState = styled.div`
  display: grid;
  justify-items: center;
  gap: 16px;
  width: 100%;
  padding: 64px 24px;
  text-align: center;
  color: ${props => props.theme.tokens.colors.muted};
  border: 1px dashed ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;
  background: ${props => props.theme.tokens.colors.surface};

  & svg {
    font-size: 40px;
    color: ${props => props.theme.tokens.colors.terracotta};
  }
`;

const NoBookmark = () => {
  const { t } = useTranslation('bookmark');

  return (
    <StyledEmptyState>
      <BookmarkBorder aria-hidden="true" />
      <div>{t('nobookmark')}</div>
    </StyledEmptyState>
  );
};

export default NoBookmark;
