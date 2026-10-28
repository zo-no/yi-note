import { useEffect, useRef, useState } from 'react';
import { useStore } from 'easy-peasy';
import { storage as StorageService } from '@yi-note/common/services';
import { hasNoteContent } from '@yi-note/common/utils/noteSections';
import {
  TYPE_VIDEO_NOTE,
  KEY_PAUSE_VIDEO_WHEN_EDITING
} from '@yi-note/common/constants';
import { PlayerFactory } from '../services/player';
import { takeScreenshot } from '../utils';

const hasTimestamp = timestamp => Number.isFinite(timestamp) && timestamp >= 0;

export default () => {
  const store = useStore();
  const actions = store.getActions();
  const getEditor = () => store.getState().videoNotes.editor;
  const initializing = useRef(null);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const isCurrent = revision =>
    mounted.current && getEditor().revision === revision;

  const ensureTimestamp = () => {
    const { note, revision } = getEditor();
    if (hasTimestamp(note.timestamp)) {
      return Promise.resolve(note.timestamp);
    }
    // Never silently give an old, damaged note today's playback position.
    if (note.id) {
      return Promise.reject(new Error('Existing note has no valid timestamp'));
    }
    if (initializing.current && initializing.current.revision === revision) {
      return initializing.current.promise;
    }

    actions.videoNotes.editor.setActive(true);
    const request = { revision };
    initializing.current = request;
    request.promise = (async () => {
      const { app, settings } = store.getState();
      const player = await PlayerFactory.getPlayer({ url: app.url });
      if (!isCurrent(revision)) return null;
      if (!player) throw new Error('No video player available');
      if (settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING]) {
        await player.pause();
      }
      const timestamp = await player.getCurrentTime();
      if (!isCurrent(revision)) return null;
      if (!hasTimestamp(timestamp)) {
        throw new Error('The video player returned an invalid timestamp');
      }
      // Merge metadata only: typing may already have started during the await.
      actions.videoNotes.editor.setNote({ timestamp });

      // Screenshots are optional and must not delay saving or affect a new draft.
      Promise.resolve()
        .then(() => {
          if (isCurrent(revision)) {
            return takeScreenshot(player.getVideoElement());
          }
        })
        .then(image => {
          if (isCurrent(revision)) {
            actions.videoNotes.editor.setNote({ image: image || '' });
          }
        })
        .catch(error => logger.warn(error));
      return timestamp;
    })().finally(() => {
      if (initializing.current === request) initializing.current = null;
    });
    return request.promise;
  };

  const handleFocus = () => {
    if (savingRef.current || store.getState().app.showingAd) return;
    const { revision } = getEditor();
    ensureTimestamp().catch(error => {
      logger.error(error);
      if (isCurrent(revision)) {
        setError({ revision, key: 'editor.timestampUnavailable' });
      }
    });
  };

  const handleChange = value => {
    if (savingRef.current || store.getState().app.showingAd) return;
    const patch =
      typeof value === 'string'
        ? {
            content: value,
            ...(getEditor().note.sections ? { sections: [] } : {})
          }
        : value;
    actions.videoNotes.editor.setNote(patch);
    setError(null);
    // Enter saves without blurring; the next draft may never receive onFocus.
    handleFocus();
  };

  const handleSave = async () => {
    if (savingRef.current || store.getState().app.showingAd) return;
    const { note, revision } = getEditor();
    if (!hasNoteContent(note)) return;

    savingRef.current = true;
    setSaving(true);
    setError(null);
    let errorKey = 'editor.timestampUnavailable';
    try {
      const timestamp = await ensureTimestamp();
      if (!isCurrent(revision)) return;
      errorKey = 'editor.saveError';
      await actions.page.saveNote({
        ...getEditor().note,
        timestamp,
        type: TYPE_VIDEO_NOTE
      });
      if (!isCurrent(revision)) return;
      actions.videoNotes.editor.reset();

      StorageService.getStorage()
        .getNotes()
        .then(notes => {
          if (mounted.current && notes.length && notes.length % 50 === 0) {
            actions.videoNotes.support.setOpen(true);
          }
        })
        .catch(error => logger.warn(error));
    } catch (error) {
      logger.error(error);
      if (isCurrent(revision)) setError({ revision, key: errorKey });
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const handleCancel = () => {
    if (savingRef.current) return;
    actions.videoNotes.editor.reset();
    setError(null);
  };

  return {
    saving,
    error: error && error.revision === getEditor().revision ? error.key : '',
    handleFocus,
    handleChange,
    handleSave,
    handleCancel
  };
};
