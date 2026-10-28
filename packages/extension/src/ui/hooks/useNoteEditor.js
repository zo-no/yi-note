import { useEffect, useRef, useState } from 'react';
import { useStore } from 'easy-peasy';
import { storage as StorageService } from '@yi-note/common/services';
import { hasNoteContent } from '@yi-note/common/utils/noteSections';
import {
  TYPE_VIDEO_NOTE,
  KEY_PAUSE_VIDEO_WHEN_EDITING,
  KEY_RESUME_VIDEO_AFTER_SAVE
} from '@yi-note/common/constants';
import { PlayerFactory } from '../services/player';
import { takeScreenshot } from '../utils';

const hasTimestamp = timestamp => Number.isFinite(timestamp) && timestamp >= 0;

const withTimeout = (promise, milliseconds = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Video operation timed out')),
      milliseconds
    );
    Promise.resolve(promise).then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const getPaused = async player => {
  try {
    return typeof player.getPaused === 'function'
      ? await withTimeout(player.getPaused(), 500)
      : null;
  } catch (error) {
    logger.warn(error);
    return null;
  }
};

const sameVideo = session => {
  const element = session.player.getVideoElement();
  return (
    element === session.element &&
    (!element ||
      (element.isConnected !== false &&
        !element.ended &&
        element.currentSrc === session.source &&
        element.src === session.src))
  );
};

export default () => {
  const store = useStore();
  const actions = store.getActions();
  const getEditor = () => store.getState().videoNotes.editor;
  const sessionRef = useRef(null);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const revision = getEditor().revision;

  useEffect(() => {
    return () => {
      mounted.current = false;
      if (sessionRef.current && sessionRef.current.dispose)
        sessionRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      if (session && session.revision === revision) {
        if (session.dispose) session.dispose();
        sessionRef.current = null;
      }
    };
  }, [revision]);

  const isCurrent = request =>
    mounted.current &&
    getEditor().revision === request.revision &&
    store.getState().app.url === request.url;
  const canControl = request =>
    isCurrent(request) && !store.getState().app.showingAd;

  const prepareDraft = () => {
    const { revision } = getEditor();
    const { url } = store.getState().app;
    const existing = sessionRef.current;
    if (existing && existing.revision === revision && existing.url === url) {
      return existing.promise;
    }
    if (existing && existing.dispose) existing.dispose();
    const session = { revision, url, pausedByUs: false };
    sessionRef.current = session;
    session.promise = (async () => {
      session.player = await withTimeout(
        PlayerFactory.getPlayer({ url }),
        4000
      );
      if (!canControl(session)) return session;
      if (!session.player) throw new Error('No video player available');
      session.element = session.player.getVideoElement();
      session.source = session.element && session.element.currentSrc;
      session.src = session.element && session.element.src;
      if (store.getState().settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING]) {
        const wasPaused = await getPaused(session.player);
        if (!canControl(session) || !sameVideo(session)) return session;
        if (wasPaused !== true) {
          await withTimeout(session.player.pause());
          if (!canControl(session)) return session;
          session.pausedByUs =
            wasPaused === false && (await getPaused(session.player)) === true;
          // User playback or a source change after our pause revokes ownership.
          if (
            canControl(session) &&
            session.element &&
            session.element.addEventListener
          ) {
            const revoke = () => {
              session.pausedByUs = false;
            };
            const events = ['play', 'ended', 'emptied'];
            events.forEach(event =>
              session.element.addEventListener(event, revoke)
            );
            session.dispose = () =>
              events.forEach(event =>
                session.element.removeEventListener(event, revoke)
              );
          }
        }
      }
      return session;
    })().catch(error => {
      if (sessionRef.current === session) sessionRef.current = null;
      if (session.dispose) session.dispose();
      throw error;
    });
    return session.promise;
  };

  const handleFocus = () => {
    if (savingRef.current || store.getState().app.showingAd) return;
    actions.videoNotes.editor.setActive(true);
    setNotice(null);
    // Editing old notes must not move their timestamp or control today's video.
    if (getEditor().note.id) return;
    const request = {
      revision: getEditor().revision,
      url: store.getState().app.url
    };
    prepareDraft().catch(error => {
      logger.error(error);
      if (isCurrent(request))
        setError({ ...request, key: 'editor.videoUnavailable' });
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
    // Enter saves without a blur; typing the next note starts a new pause session.
    handleFocus();
  };

  const resumeIfOwned = async session => {
    if (
      !session ||
      !session.pausedByUs ||
      store.getState().settings.data[KEY_RESUME_VIDEO_AFTER_SAVE] === false
    )
      return;
    try {
      if (!canControl(session) || !sameVideo(session)) return;
      const paused = await getPaused(session.player);
      if (!canControl(session) || !sameVideo(session) || !session.pausedByUs)
        return;
      if (paused === false) return;
      if (paused !== true) return 'editor.savedResumeBlocked';
      await withTimeout(session.player.play());
    } catch (error) {
      logger.warn(error);
      return 'editor.savedResumeBlocked';
    }
  };

  const handleSave = async () => {
    if (savingRef.current || store.getState().app.showingAd) return;
    const { note, revision } = getEditor();
    if (!hasNoteContent(note)) return;
    const request = { revision, url: store.getState().app.url };
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setNotice(null);
    let errorKey = 'editor.timestampUnavailable';
    try {
      let snapshot = {};
      let session;
      let missingImage = false;
      if (note.id) {
        if (!hasTimestamp(note.timestamp))
          throw new Error('Existing note has no valid timestamp');
      } else {
        session = await prepareDraft();
        if (!canControl(request)) return;
        if (
          !sameVideo(session) ||
          (session.element && session.element.seeking)
        ) {
          throw new Error('Video changed or is still seeking');
        }
        // Read on each save attempt, not on focus and not after storage finishes.
        const timestamp = await withTimeout(session.player.getCurrentTime());
        if (!canControl(request)) return;
        if (
          !hasTimestamp(timestamp) ||
          !sameVideo(session) ||
          (session.element && session.element.seeking)
        )
          throw new Error('Invalid video timestamp');
        let image = '';
        try {
          // Passing loaded settings draws the frame synchronously, before any I/O.
          image =
            (await withTimeout(
              takeScreenshot(session.element, store.getState().settings.data),
              1000
            )) || '';
        } catch (error) {
          logger.warn(error);
        }
        if (!canControl(request)) return;
        if (!sameVideo(session))
          throw new Error('Video changed during capture');
        snapshot = { timestamp, image };
        missingImage = !image;
      }
      errorKey = 'editor.saveError';
      await actions.page.saveNote({
        ...note,
        ...snapshot,
        type: TYPE_VIDEO_NOTE
      });
      if (!isCurrent(request)) return;
      // Playback failures are separate from persistence: never invite duplicate saves.
      const resumeNotice = await resumeIfOwned(session);
      if (!isCurrent(request)) return;
      if (session && session.dispose) session.dispose();
      sessionRef.current = null;
      actions.videoNotes.editor.reset();
      const savedRequest = { revision: getEditor().revision, url: request.url };
      setNotice({
        ...savedRequest,
        key:
          resumeNotice ||
          (missingImage ? 'editor.savedWithoutImage' : 'editor.saved')
      });

      StorageService.getStorage()
        .getNotes()
        .then(notes => {
          if (
            isCurrent(savedRequest) &&
            !getEditor().active &&
            notes.length &&
            notes.length % 50 === 0
          ) {
            actions.videoNotes.support.setOpen(true);
          }
        })
        .catch(error => logger.warn(error));
    } catch (error) {
      logger.error(error);
      if (isCurrent(request)) setError({ ...request, key: errorKey });
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const handleCancel = () => {
    if (savingRef.current) return;
    if (sessionRef.current && sessionRef.current.dispose)
      sessionRef.current.dispose();
    sessionRef.current = null;
    actions.videoNotes.editor.reset();
    setError(null);
    setNotice(null);
  };

  return {
    saving,
    error: error && isCurrent(error) ? error.key : '',
    notice: notice && isCurrent(notice) ? notice.key : '',
    handleFocus,
    handleChange,
    handleSave,
    handleCancel
  };
};
