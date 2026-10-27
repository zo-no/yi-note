import React from 'react';
import { useStoreState } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import Grid from '@material-ui/core/Grid';
import { secondsToTime } from '@yi-note/common/utils';
import { MarkdownEditor } from '@yi-note/common/components';
import useNoteEditor from '../../../hooks/useNoteEditor';
import TextButton from '../../../components/TextButton';

import handleNoteEditorKeyDown from '../../../utils/handleNoteEditorKeyDown';

const StyledStatus = styled.span`
  font-weight: bold;
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
        <MarkdownEditor
          disabled={disabled}
          readOnly={saving}
          content={note.content}
          placeholder={t('editor.placeholder')}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={event =>
            handleNoteEditorKeyDown(event, handleSave, handleChange)
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
            <Grid container spacing={1}>
              <Grid item>
                {note.id ? (
                  <StyledStatus>{t('editor.statusExisting')}</StyledStatus>
                ) : (
                  <StyledStatus>{t('editor.statusNew')}</StyledStatus>
                )}
              </Grid>
              <Grid item>{secondsToTime(note.timestamp)}</Grid>
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
                <TextButton onClick={handleSave} disabled={saving || disabled}>
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
