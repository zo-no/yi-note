import React from 'react';
import { useStoreState } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import Grid from '@material-ui/core/Grid';
import { secondsToTime } from '@yi-note/common/utils';
import NoteContentEditor from '@yi-note/common/components/NoteContent/Editor';
import useNoteEditor from '../../../hooks/useNoteEditor';
import TextButton from '../../../components/TextButton';

import handleNoteEditorKeyDown from '../../../utils/handleNoteEditorKeyDown';

const StyledStatus = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: ${props => props.theme.tokens.radius.pill}px;
  background: ${props => props.theme.tokens.colors.sageSoft};
  color: ${props => props.theme.tokens.colors.ink};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  font-weight: 600;
`;

const StyledTimestamp = styled.span`
  font-family: ${props => props.theme.tokens.fonts.mono};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  font-variant-numeric: tabular-nums;
  color: ${props => props.theme.tokens.colors.muted};
`;

const Editor = () => {
  const { t } = useTranslation('notesView');
  const {
    videoNotes: {
      editor: { active, note }
    },
    app: { showingAd: disabled }
  } = useStoreState(state => state);
  const {
    saving,
    error,
    handleFocus,
    handleChange,
    handleSave,
    handleCancel
  } = useNoteEditor();

  return (
    <Grid container spacing={1}>
      <Grid item xs={12}>
        <NoteContentEditor
          disabled={disabled || saving}
          note={note}
          placeholder={t('editor.placeholder')}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={(event, changeField) =>
            handleNoteEditorKeyDown(event, handleSave, changeField)
          }
        />
      </Grid>
      {error && (
        <Grid item xs={12} role="alert">
          {t(error)}
        </Grid>
      )}
      {active && (
        <Grid item container alignItems="center">
          <Grid item xs={6}>
            <Grid container spacing={1} alignItems="center">
              <Grid item>
                {note.id ? (
                  <StyledStatus>{t('editor.statusExisting')}</StyledStatus>
                ) : (
                  <StyledStatus>{t('editor.statusNew')}</StyledStatus>
                )}
              </Grid>
              <Grid item>
                <StyledTimestamp>
                  {secondsToTime(note.timestamp)}
                </StyledTimestamp>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={6}>
            <Grid container justify="flex-end" spacing={1}>
              <Grid item>
                <TextButton onClick={handleCancel} disabled={saving}>
                  {t('editor.cancelButton')}
                </TextButton>
              </Grid>
              <Grid item>
                <TextButton
                  primary
                  onClick={handleSave}
                  disabled={saving || disabled}
                >
                  {t(saving ? 'editor.saving' : 'editor.saveButton')}
                </TextButton>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};

export default Editor;
