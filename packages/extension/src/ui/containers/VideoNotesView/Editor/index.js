import React from 'react';
import { useStoreState } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { secondsToTime } from '@yi-note/common/utils';
import { hasNoteContent } from '@yi-note/common/utils/noteSections';
import NoteContentEditor from '@yi-note/common/components/NoteContent/Editor';
import useNoteEditor from '../../../hooks/useNoteEditor';
import TextButton from '../../../components/TextButton';

import handleNoteEditorKeyDown from '../../../utils/handleNoteEditorKeyDown';

const StyledEditor = styled.div`
  display: grid;
  gap: 6px;
  width: 100%;
  min-width: 0;
`;

const StyledFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`;

const StyledMeta = styled.div`
  display: grid;
  min-width: 0;
  color: ${props => props.theme.tokens.colors.muted};
  font-family: ${props => props.theme.tokens.fonts.body};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

const StyledTimestamp = styled.span`
  font-family: ${props => props.theme.tokens.fonts.mono};
  font-variant-numeric: tabular-nums;
`;

const StyledActions = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
`;

const StyledMessage = styled.div`
  min-width: 0;
  color: ${props => props.theme.tokens.colors.muted};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  line-height: 1.5;
  overflow-wrap: anywhere;

  &[role='alert'] {
    color: ${props => props.theme.tokens.colors.error};
  }
`;

const Editor = () => {
  const { t } = useTranslation('notesView');
  const {
    videoNotes: {
      editor: { active, note, revision }
    },
    app: { showingAd: disabled }
  } = useStoreState(state => state);
  const {
    saving,
    error,
    notice,
    handleFocus,
    handleChange,
    handleSave,
    handleCancel
  } = useNoteEditor();

  return (
    <StyledEditor>
      <NoteContentEditor
        key={revision}
        disabled={disabled || saving}
        note={note}
        placeholder={t('editor.placeholder')}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={(event, changeField) =>
          handleNoteEditorKeyDown(event, handleSave, changeField)
        }
      />
      {notice && <StyledMessage role="status">{t(notice)}</StyledMessage>}
      {error && <StyledMessage role="alert">{t(error)}</StyledMessage>}
      {active && (
        <StyledFooter>
          <StyledMeta>
            <StyledTimestamp>
              {note.id
                ? t('editor.originalTime', {
                    time: secondsToTime(note.timestamp)
                  })
                : t('editor.timeOnSave')}
            </StyledTimestamp>
            <span>{t('editor.shortcut')}</span>
          </StyledMeta>
          <StyledActions>
            <TextButton quiet onClick={handleCancel} disabled={saving}>
              {t('editor.cancelButton')}
            </TextButton>
            <TextButton
              primary
              onClick={handleSave}
              disabled={saving || disabled || !hasNoteContent(note)}
            >
              {t(saving ? 'editor.saving' : 'editor.saveButton')}
            </TextButton>
          </StyledActions>
        </StyledFooter>
      )}
    </StyledEditor>
  );
};

export default Editor;
