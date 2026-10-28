import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useStoreActions, useStoreState } from 'easy-peasy';
import styled from 'styled-components';
import { IconButton, Tooltip, Checkbox } from '@material-ui/core';
import {
  OpenInNew as OpenInNewIcon,
  DeleteOutlineOutlined as DeleteIcon,
  PlayCircleOutline as VideoIcon,
  Language as SourceIcon
} from '@material-ui/icons';

const StyledContainer = styled.article`
  display: grid;
  grid-template-columns: ${props =>
      props.theme.tokens.layout.bookmarkImageWidth}px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: ${props => props.theme.tokens.layout.cardPadding}px;
  cursor: pointer;
  background: ${props => props.theme.tokens.colors.surface};
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;

  &:hover,
  &:focus-within {
    border-color: ${props => props.theme.tokens.colors.controlBorder};
  }

  @media (max-width: 899px) {
    grid-template-columns: 104px minmax(0, 1fr);
    align-items: start;
    gap: 8px 12px;
  }
`;

const StyledImgContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  background: ${props => props.theme.tokens.colors.inset};
  color: ${props => props.theme.tokens.colors.sage};
  border-radius: ${props => props.theme.tokens.radius.small}px;
  overflow: hidden;

  & img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  & svg {
    font-size: 40px;
  }

  @media (max-width: 899px) {
    grid-row: 1 / span 2;
  }
`;

const StyledContent = styled.div`
  min-width: 0;
`;

const StyledTitle = styled.button`
  display: -webkit-box;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: ${props => props.theme.tokens.colors.ink};
  font-family: ${props => props.theme.tokens.fonts.heading};
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const StyledDescription = styled.p`
  display: -webkit-box;
  margin: 6px 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  line-height: 1.7;
  color: ${props => props.theme.tokens.colors.muted};
`;

const StyledMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  color: ${props => props.theme.tokens.colors.muted};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  overflow-wrap: anywhere;

  & svg {
    font-size: 16px;
  }

  & time {
    padding-left: 8px;
    border-left: 1px solid ${props => props.theme.tokens.colors.border};
    font-variant-numeric: tabular-nums;
  }
`;

const StyledActions = styled.div`
  display: flex;
  align-self: start;
  gap: 4px;

  @media (max-width: 899px) {
    grid-column: 2;
    justify-self: end;
  }

  & button {
    padding: 7px;
    border: 1px solid ${props => props.theme.tokens.colors.border};
    background: ${props => props.theme.tokens.colors.canvas};
    color: ${props => props.theme.tokens.colors.ink};
  }

  & button[data-action='delete'] {
    border-color: transparent;
    background: ${props => props.theme.tokens.colors.dangerSoft};
    color: ${props => props.theme.tokens.colors.error};
  }

  & button:hover {
    background: ${props => props.theme.tokens.colors.peach};
  }

  & svg {
    font-size: 20px;
  }
`;

const BookmarkItem = ({
  id,
  title,
  description,
  url,
  image,
  selected,
  createdAt
}) => {
  const { t } = useTranslation(['bookmark', 'options']);
  const history = useHistory();
  const { exporting } = useStoreState(state => state.bookmarks.toolbar);
  const {
    bookmarks: { setBookmark, removeBookmark },
    alerts: { show: showAlerts }
  } = useStoreActions(actions => actions);

  const setSelect = () => setBookmark({ id, selected: !selected });

  const handleOpenPageDetail = () => {
    if (exporting) {
      setSelect();
      return;
    }
    history.push(`/pages/${id}`);
  };

  const handleOpenPageInNewTab = e => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = e => {
    e.stopPropagation();
    showAlerts({
      content: t('remove.alert'),
      onConfirm: removeBookmark.bind(null, id)
    });
  };

  let source = '';
  try {
    source = new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    // Legacy imports can lack a valid source URL.
  }
  const savedDate = createdAt ? new Date(createdAt) : null;
  const hasSavedDate = savedDate && !Number.isNaN(savedDate.getTime());

  return (
    <StyledContainer onClick={handleOpenPageDetail}>
      <StyledImgContainer>
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <VideoIcon aria-hidden="true" />
        )}
      </StyledImgContainer>
      <StyledContent>
        <StyledTitle type="button">{title}</StyledTitle>
        {description && <StyledDescription>{description}</StyledDescription>}
        <StyledMeta>
          {source && (
            <>
              <SourceIcon aria-hidden="true" />
              <span>{source}</span>
            </>
          )}
          {hasSavedDate && (
            <time dateTime={savedDate.toISOString()}>
              {savedDate.toLocaleDateString()}
            </time>
          )}
        </StyledMeta>
      </StyledContent>
      <StyledActions onClick={e => e.stopPropagation()}>
        {exporting ? (
          <Checkbox
            checked={!!selected}
            onChange={setSelect}
            inputProps={{
              'aria-label': t('select', {
                defaultValue: 'Select {{title}}',
                title
              })
            }}
          />
        ) : (
          <>
            <Tooltip title={t('open.tooltip')}>
              <IconButton
                aria-label={t('open.tooltip')}
                onClick={handleOpenPageInNewTab}
              >
                <OpenInNewIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('remove.tooltip')}>
              <IconButton
                aria-label={t('remove.tooltip')}
                data-action="delete"
                onClick={handleDelete}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      </StyledActions>
    </StyledContainer>
  );
};

BookmarkItem.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  description: PropTypes.string,
  image: PropTypes.string,
  selected: PropTypes.bool,
  createdAt: PropTypes.number
};

export default BookmarkItem;
