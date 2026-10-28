import React, { useEffect } from 'react';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  Grid,
  Chip,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@material-ui/core';

import BookmarkItem from './BookmarkItem';
import NoBookmark from './NoBookmark';

const StyledContainer = styled.div`
  min-width: 0;
`;

const StyledFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
  margin-bottom: ${props => props.theme.tokens.layout.itemGap}px;
`;

const StyledList = styled.ul`
  display: grid;
  gap: ${props => props.theme.tokens.layout.itemGap}px;
  width: 100%;
  padding: 0;
  margin: 0;
  list-style: none;

  & > li {
    min-width: 0;
  }
`;

const Bookmarks = () => {
  const { t } = useTranslation('options');
  const { search } = useLocation();
  const {
    bookmarks: {
      bookmarks,
      tags,
      toolbar: { filtering, exporting, exportFormat }
    }
  } = useStoreState(state => state);
  const {
    fetchBookmarks,
    fetchTags,
    selectTag,
    toolbar: { setExportFormat }
  } = useStoreActions(actions => actions.bookmarks);
  const { setTitle } = useStoreActions(actions => actions.app);

  useEffect(() => {
    setTitle(t('bookmarks.title'));
  }, [setTitle, t]);

  useEffect(() => {
    let tagsFromUrl = [];
    const tagsStr = new URLSearchParams(search).get('tags');
    if (tagsStr) {
      tagsFromUrl = tagsStr.split(',');
    }
    fetchBookmarks();
    fetchTags(tagsFromUrl);
  }, [fetchBookmarks, fetchTags, search]);

  const handleSelectTag = tag => {
    selectTag(tag);
  };

  const handleExportFormatChange = e => setExportFormat(e.target.value);

  return (
    <StyledContainer>
      {bookmarks.length === 0 && !filtering ? (
        <NoBookmark />
      ) : (
        <Grid container>
          {exporting && (
            <Grid
              item
              container
              direction="row"
              alignItems="center"
              spacing={1}
            >
              <Grid item>
                <FormLabel>{t('bookmarks.export.format.label')}</FormLabel>
              </Grid>
              <Grid item>
                <RadioGroup
                  row
                  value={exportFormat}
                  onChange={handleExportFormatChange}
                >
                  <FormControlLabel
                    value="json"
                    control={<Radio size="small" />}
                    label="JSON"
                  />
                  <FormControlLabel
                    value="markdown"
                    control={<Radio size="small" />}
                    label="Markdown (no image)"
                  />
                </RadioGroup>
              </Grid>
            </Grid>
          )}
          {filtering && tags.length > 0 && (
            <StyledFilters aria-label={t('bookmarks.tag.tooltip')}>
              {tags.map(({ tag, selected }) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  color={selected ? 'primary' : 'default'}
                  clickable
                  aria-pressed={selected}
                  onClick={handleSelectTag.bind(null, tag)}
                />
              ))}
            </StyledFilters>
          )}
          <StyledList>
            {bookmarks.map(bookmark => (
              <li key={bookmark.id}>
                <BookmarkItem {...bookmark} />
              </li>
            ))}
          </StyledList>
          {bookmarks.length === 0 && <NoBookmark />}
        </Grid>
      )}
    </StyledContainer>
  );
};

export default Bookmarks;
