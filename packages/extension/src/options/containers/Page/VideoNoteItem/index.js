import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useStoreActions } from 'easy-peasy';
import { MarkerArea } from 'markerjs';
import { Grid, Link, IconButton, Tooltip } from '@material-ui/core';
import {
  GestureOutlined as DrawIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Done as DoneIcon,
  Close as CloseIcon
} from '@material-ui/icons';
import NoteContent from '@yi-note/common/components/NoteContent';
import NoteContentEditor from '@yi-note/common/components/NoteContent/Editor';
import { hasNoteContent } from '@yi-note/common/utils/noteSections';
import { secondsToTime, buildAutoSeekUrl } from '@yi-note/common/utils';
import {
  StyledCard,
  StyledImgContainer,
  StyledImg,
  StyledNoteContainer,
  StyledNoteHeader,
  StyledActions,
  StyledTimestamp
} from './styled';

const ACTION_EDIT = 'EDIT';
const ACTION_ANNOTATE = 'ANNOTATE';

const NoteItem = ({ note, url }) => {
  const { id, timestamp, image } = note;
  const formattedTime = secondsToTime(timestamp);
  const hasTimestamp = formattedTime !== '--:--';
  const { t } = useTranslation('options');
  const {
    page: { saveNote, removeNote },
    alerts: { show: showAlerts }
  } = useStoreActions(actions => actions);
  const imgRef = useRef(null);
  const imgContainerRef = useRef(null);
  const markerRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const [currentAction, setCurrentAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (imgRef.current && imgContainerRef.current) {
      markerRef.current = new MarkerArea(imgRef.current, {
        targetRoot: imgContainerRef.current
      });
    }
    return () => {
      try {
        if (markerRef.current) markerRef.current.close();
      } catch (e) {
        logger.error(e);
      }
    };
  }, [image]);

  const handleStartEditing = () => {
    setDraft(note);
    setSaveError(false);
    setEditing(true);
    setCurrentAction(ACTION_EDIT);
  };

  const handleStartAnnotation = () => {
    if (markerRef.current) {
      // Remove last three action buttons from markerJs toolbar
      if (markerRef.current.toolbars.length === 13) {
        Array(3)
          .fill(0)
          .forEach(() => markerRef.current.toolbars.pop());
      }
      // Show toolbars on top of image
      markerRef.current.show();
    }
    setCurrentAction(ACTION_ANNOTATE);
  };

  const handleEditorChange = patch => {
    setDraft(previous => ({ ...previous, ...patch }));
    setSaveError(false);
  };

  const handleDelete = e => {
    e.stopPropagation();
    showAlerts({
      content: t('note:remove.alert'),
      onConfirm: removeNote.bind(null, id)
    });
  };

  const handleActionFinished = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      if (currentAction === ACTION_EDIT) {
        await saveNote({
          ...note,
          content: draft.content,
          ...(draft.sections ? { sections: draft.sections } : {})
        });
        setEditing(false);
      } else if (currentAction === ACTION_ANNOTATE) {
        const image = await new Promise(resolve =>
          markerRef.current.render(resolve)
        );
        await saveNote({ ...note, image });
        markerRef.current.close();
      }
      setCurrentAction(null);
    } catch (error) {
      logger.error(error);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleActionCanceled = () => {
    if (saving) return;
    setSaveError(false);
    if (currentAction === ACTION_EDIT) {
      setDraft(note);
      setEditing(false);
    } else if (currentAction === ACTION_ANNOTATE) {
      try {
        markerRef.current.close();
      } catch (e) {
        logger.info(e);
      }
    }
    setCurrentAction(null);
  };

  return (
    <StyledCard component="article" data-has-image={!!image}>
      {image && (
        <Grid item container>
          <StyledImgContainer ref={imgContainerRef}>
            <StyledImg
              ref={imgRef}
              src={image}
              alt={t('page.detail.screenshot', { defaultValue: 'Screenshot' })}
            />
          </StyledImgContainer>
        </Grid>
      )}
      <Grid item container>
        <StyledNoteContainer container direction="column">
          <StyledNoteHeader>
            <StyledTimestamp>
              {hasTimestamp ? (
                <Link href={buildAutoSeekUrl(url, timestamp)} target="_blank">
                  {formattedTime}
                </Link>
              ) : (
                <span>{formattedTime}</span>
              )}
            </StyledTimestamp>
            <StyledActions>
              {currentAction ? (
                <>
                  <Grid item>
                    <Tooltip title={t('page.save.tooltip')}>
                      <IconButton
                        size="small"
                        color="inherit"
                        aria-label={t('page.save.tooltip')}
                        disabled={saving || (editing && !hasNoteContent(draft))}
                        onClick={handleActionFinished}
                      >
                        <DoneIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                  <Grid item>
                    <Tooltip title={t('page.cancel.tooltip')}>
                      <IconButton
                        size="small"
                        color="inherit"
                        aria-label={t('page.cancel.tooltip')}
                        disabled={saving}
                        onClick={handleActionCanceled}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </>
              ) : (
                <>
                  {image && (
                    <Grid item>
                      <Tooltip title={t('page.annotation.tooltip')}>
                        <IconButton
                          size="small"
                          color="inherit"
                          aria-label={t('page.annotation.tooltip')}
                          onClick={handleStartAnnotation}
                        >
                          <DrawIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  )}
                  <Grid item>
                    <Tooltip title={t('page.edit.note.tooltip')}>
                      <IconButton
                        size="small"
                        color="inherit"
                        aria-label={t('page.edit.note.tooltip')}
                        onClick={handleStartEditing}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                  <Grid item>
                    <Tooltip title={t('page.delete.note.tooltip')}>
                      <IconButton
                        size="small"
                        color="inherit"
                        data-action="delete"
                        aria-label={t('page.delete.note.tooltip')}
                        onClick={handleDelete}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </>
              )}
            </StyledActions>
          </StyledNoteHeader>
          {saveError && (
            <Grid item role="alert">
              {t('notesView:editor.saveError')}
            </Grid>
          )}
          {editing ? (
            <Grid item container>
              <NoteContentEditor
                note={draft}
                disabled={saving}
                onChange={handleEditorChange}
              />
            </Grid>
          ) : (
            <Grid item container>
              <NoteContent note={note} />
            </Grid>
          )}
        </StyledNoteContainer>
      </Grid>
    </StyledCard>
  );
};

NoteItem.propTypes = {
  note: PropTypes.object.isRequired,
  url: PropTypes.string.isRequired
};

export default NoteItem;
