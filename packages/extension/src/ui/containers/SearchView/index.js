import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import NoteItem from './NoteItem';
import BookmarkItem from './BookmarkItem';
import ScrollableList from '../../components/ScrollableList';
import { TYPE_BOOKMARKS, TYPE_NOTES } from '@yi-note/common/constants';

const StyledItemWrapper = styled.div`
  background: ${props => props.theme.tokens.colors.surface};
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;
  padding: 16px;

  &:focus-within {
    border-color: ${props => props.theme.tokens.colors.controlBorder};
  }
`;

const StyledTabs = styled(Tabs)`
  flex-shrink: 0;
  min-height: 48px;
  padding: 4px;
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;
  background: ${props => props.theme.tokens.colors.inset};

  & button[role='tab'] {
    min-width: 0;
    min-height: 40px;
    border-radius: ${props => props.theme.tokens.radius.small}px;
    font-weight: 600;
    color: ${props => props.theme.tokens.colors.muted};
    opacity: 1;
  }

  & button[aria-selected='true'] {
    background: ${props => props.theme.tokens.colors.peach};
    color: ${props => props.theme.tokens.colors.action};
  }
`;

const SearchView = () => {
  const { t } = useTranslation('searchView');
  const { query, type, results, bookmarks, notes } = useStoreState(
    state => state.search
  );
  const {
    setQuery,
    setType,
    setResults,
    fetchBookmarks,
    fetchNotes
  } = useStoreActions(actions => actions.search);

  useEffect(() => {
    if (type === TYPE_BOOKMARKS) {
      if (bookmarks.length) {
        setResults(bookmarks);
      } else {
        fetchBookmarks();
      }
    } else if (type === TYPE_NOTES) {
      if (notes.length) {
        setResults(notes);
      } else {
        fetchNotes();
      }
    }
  }, [type, fetchBookmarks, fetchNotes, setResults, bookmarks, notes]);

  const handleTypeChange = (event, newValue) => {
    setType(newValue);
    setQuery('');
  };

  const ItemComponent = {
    [TYPE_BOOKMARKS]: BookmarkItem,
    [TYPE_NOTES]: NoteItem
  }[type];

  return (
    <>
      <StyledTabs
        value={type}
        onChange={handleTypeChange}
        variant="fullWidth"
        TabIndicatorProps={{ style: { display: 'none' } }}
      >
        <Tab label={t('tab.bookmarks')} value={TYPE_BOOKMARKS} />
        <Tab label={t('tab.notes')} value={TYPE_NOTES} />
      </StyledTabs>
      <ScrollableList
        items={results}
        renderItem={item => (
          <StyledItemWrapper>
            <ItemComponent item={item} query={query} />
          </StyledItemWrapper>
        )}
      />
    </>
  );
};

export default SearchView;
