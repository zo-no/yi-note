import React, { useEffect, useMemo, useRef } from 'react';
import { useStoreState, useStoreActions } from 'easy-peasy';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Grid } from '@material-ui/core';
import { generatePageId } from '@yi-note/common/utils';
import SupportExtension from './SupportExtension';
import NoteItem from './NoteItem';
import Editor from './Editor';
import Toolbar from './Toolbar';
import Tags from './Tags';
import ScrollableList from '../../components/ScrollableList';
import Spinner from '../../components/Spinner';
import { useLoadScreenshots } from '../../hooks';
import sortNotes from '../../utils/sortNotes';

export const StyledEditorContainer = styled.div`
  height: 70px;
`;

export const StyledTitle = styled.h2`
  margin: 0;
  font-family: ${props => props.theme.tokens.fonts.heading};
  font-size: ${props => props.theme.tokens.fontSizes.heading}px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.025em;
  color: ${props => props.theme.tokens.colors.ink};
`;

const StyledHeading = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const StyledSort = styled.select`
  max-width: 100%;
  min-height: 32px;
  padding: 4px 2px;
  border: 1px solid transparent;
  border-radius: ${props => props.theme.tokens.radius.small}px;
  background: ${props => props.theme.tokens.colors.canvas};
  color: ${props => props.theme.tokens.colors.muted};
  font-family: ${props => props.theme.tokens.fonts.body};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: ${props => props.theme.tokens.colors.controlBorder};
    color: ${props => props.theme.tokens.colors.ink};
  }
`;

const NotesView = () => {
  const { t } = useTranslation(['notesView', 'bookmark']);
  const {
    page: {
      data: { id, notes, meta, tags }
    },
    app: { url },
    videoNotes: { sortOrder }
  } = useStoreState(state => state);
  const {
    page: { fetchPage, bookmarkPage },
    videoNotes: { setSortOrder }
  } = useStoreActions(actions => actions);
  const tryLoadMeta = useRef(false);
  const { loading } = useLoadScreenshots();
  const sortedNotes = useMemo(() => sortNotes(notes, sortOrder), [
    notes,
    sortOrder
  ]);

  useEffect(() => {
    if (!id) {
      const pageId = generatePageId(url);
      fetchPage(pageId);
    } else if (
      (!meta || !meta.description || !meta.image) &&
      !tryLoadMeta.current
    ) {
      // Try add more meta info for migrated data
      tryLoadMeta.current = true;
      bookmarkPage();
    }
  }, [id, fetchPage, url, meta, bookmarkPage]);

  return (
    <>
      <Grid container spacing={2} direction="column" justify="flex-start">
        <Grid item>
          <Editor />
        </Grid>
        <Grid
          item
          container
          direction="row"
          justify="space-between"
          alignItems="center"
        >
          <Grid item>
            <StyledHeading>
              <StyledTitle>{t('title')}</StyledTitle>
              <StyledSort
                aria-label={t('sort.label')}
                value={sortOrder}
                onChange={event => setSortOrder(event.target.value)}
              >
                <option value="asc">{t('sort.asc')}</option>
                <option value="desc">{t('sort.desc')}</option>
              </StyledSort>
            </StyledHeading>
          </Grid>
          <Grid item>
            <Toolbar />
          </Grid>
        </Grid>
        {tags.length !== 0 && (
          <Grid item>
            <Tags />
          </Grid>
        )}
      </Grid>
      {loading ? (
        <Spinner />
      ) : (
        <ScrollableList
          items={sortedNotes}
          renderItem={note => <NoteItem note={note} />}
        />
      )}
      <SupportExtension />
    </>
  );
};

export default NotesView;
