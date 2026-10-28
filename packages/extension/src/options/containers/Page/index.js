import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import VideoNoteItem from './VideoNoteItem';
import Description from './Description';
import { TagDialog } from '@yi-note/common/components';
import { TYPE_VIDEO_NOTE } from '@yi-note/common/constants';
import {
  StyledPage,
  StyledHeader,
  StyledTitle,
  StyledMeta,
  StyledSource,
  StyledNoteList,
  StyledTextNote,
  StyledEmptyState,
  StyledTags,
  StyledTag
} from './styled';

const Page = () => {
  const { t } = useTranslation('options');
  const { id } = useParams();
  const {
    data: {
      meta: { title, url, description },
      notes,
      tags
    }
  } = useStoreState(state => state.page);
  const {
    app: { setTitle: setAppTitle },
    page: { fetchPage, addTag, removeTag }
  } = useStoreActions(actions => actions);

  useEffect(() => {
    setAppTitle(t('page.title'));
    fetchPage(id);
  }, [fetchPage, id, setAppTitle, t]);

  let source = url;
  try {
    source = new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    // Imported bookmarks may not have a complete URL; retain the saved value.
  }

  return (
    <StyledPage>
      <StyledHeader>
        <StyledTitle>{title || t('page.untitled')}</StyledTitle>
        {(source || tags.length > 0) && (
          <StyledMeta>
            {source && <StyledSource>{source}</StyledSource>}
            {tags.length > 0 && (
              <StyledTags aria-label={t('page.tag.tooltip')}>
                {tags.map(tag => (
                  <StyledTag key={tag}>{tag}</StyledTag>
                ))}
              </StyledTags>
            )}
          </StyledMeta>
        )}
        <Description key={id} description={description} />
      </StyledHeader>
      <StyledNoteList aria-label={t('notesView:title')}>
        {notes.map(note =>
          note.type === TYPE_VIDEO_NOTE ? (
            <VideoNoteItem key={note.id} note={note} url={url} />
          ) : (
            <StyledTextNote key={note.id}>{note.content}</StyledTextNote>
          )
        )}
        {notes.length === 0 && (
          <StyledEmptyState>
            <h2>{t('note:nonote')}</h2>
            <p>{t('page.emptyHint')}</p>
          </StyledEmptyState>
        )}
      </StyledNoteList>
      <TagDialog tags={tags} onAddTag={addTag} onRemoveTag={removeTag} />
    </StyledPage>
  );
};

export default Page;
