import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { TextareaAutosize, Tooltip } from '@material-ui/core';
import { Add, Close, HelpOutline } from '@material-ui/icons';
import MarkdownEditor from '../MarkdownEditor';
import NoteContent, { SectionIcon } from './index';
import {
  createSection,
  createDefaultSections,
  getNoteSections,
  sectionsToMarkdown
} from '../../utils/noteSections';
import {
  StyledEditor,
  StyledEditorToolbar,
  StyledEditorAction,
  StyledEditorPreview,
  StyledSections,
  StyledSectionEditor,
  StyledSectionBody
} from './styled';

const NoteContentEditor = ({
  note,
  onChange,
  disabled = false,
  onFocus,
  onKeyDown,
  placeholder
}) => {
  const { t } = useTranslation('noteContent');
  const [preview, setPreview] = useState(false);
  const sections = getNoteSections(note);
  const updateSections = next => {
    if (!disabled) {
      onChange({ sections: next, content: sectionsToMarkdown(next) });
    }
  };
  const changePlainText = content => {
    if (!disabled) {
      onChange({ content, ...(note.sections ? { sections: [] } : {}) });
    }
  };
  const changeSection = (id, patch) =>
    updateSections(
      sections.map(section =>
        section.id === id ? { ...section, ...patch } : section
      )
    );
  const enableSections = () => {
    updateSections(
      createDefaultSections(note.content, {
        observation: t('observation'),
        analysis: t('analysis'),
        takeaway: t('takeaway')
      })
    );
    setPreview(false);
  };

  return (
    <StyledEditor>
      <StyledEditorToolbar>
        <StyledEditorAction
          type="button"
          disabled={disabled}
          aria-pressed={!sections}
          title={sections ? t('toMarkdown') : undefined}
          onClick={() => {
            if (sections) {
              changePlainText(note.content);
              setPreview(false);
            }
          }}
        >
          {t('mode.plain')}
        </StyledEditorAction>
        <StyledEditorAction
          type="button"
          disabled={disabled}
          aria-pressed={!!sections}
          onClick={() => {
            if (!sections) enableSections();
          }}
        >
          {t('mode.sections')}
        </StyledEditorAction>
        <StyledEditorAction
          type="button"
          data-preview
          disabled={disabled}
          aria-pressed={preview}
          title={preview ? t('edit') : undefined}
          onClick={() => setPreview(!preview)}
        >
          {t('preview')}
        </StyledEditorAction>
        {sections && !preview && (
          <Tooltip title={t('add')}>
            <span>
              <StyledEditorAction
                type="button"
                aria-label={t('add')}
                disabled={disabled}
                onClick={() =>
                  updateSections([...sections, createSection(t('custom'))])
                }
              >
                <Add />
              </StyledEditorAction>
            </span>
          </Tooltip>
        )}
        <Tooltip title={t('hint')}>
          <StyledEditorAction
            as="a"
            href="https://guides.github.com/features/mastering-markdown/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('help')}
          >
            <HelpOutline />
          </StyledEditorAction>
        </Tooltip>
      </StyledEditorToolbar>
      {preview ? (
        <StyledEditorPreview>
          <NoteContent note={note} />
        </StyledEditorPreview>
      ) : !sections ? (
        <MarkdownEditor
          compact
          hideToolbar
          content={note.content || ''}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={t('body')}
          onFocus={onFocus}
          onChange={changePlainText}
          onKeyDown={
            onKeyDown ? event => onKeyDown(event, changePlainText) : undefined
          }
        />
      ) : (
        <StyledSections>
          {sections.map(section => (
            <StyledSectionEditor key={section.id}>
              <label>
                <SectionIcon kind={section.kind} />
                <input
                  value={section.label}
                  title={section.label || t('custom')}
                  maxLength={48}
                  disabled={disabled}
                  aria-label={t('label')}
                  placeholder={t('custom')}
                  onFocus={onFocus}
                  onChange={event =>
                    changeSection(section.id, { label: event.target.value })
                  }
                />
              </label>
              <StyledSectionBody>
                <TextareaAutosize
                  rowsMin={1}
                  rowsMax={12}
                  value={section.content}
                  disabled={disabled}
                  aria-label={t('sectionBody', { label: section.label })}
                  placeholder={t('body')}
                  onFocus={onFocus}
                  onChange={event =>
                    changeSection(section.id, { content: event.target.value })
                  }
                  onKeyDown={
                    onKeyDown
                      ? event =>
                          onKeyDown(event, content =>
                            changeSection(section.id, { content })
                          )
                      : undefined
                  }
                />
              </StyledSectionBody>
              <Tooltip title={t('remove')}>
                <span>
                  <StyledEditorAction
                    type="button"
                    aria-label={t('remove')}
                    disabled={disabled || sections.length === 1}
                    onClick={() => {
                      if (sections.length > 1) {
                        updateSections(
                          sections.filter(item => item.id !== section.id)
                        );
                      }
                    }}
                  >
                    <Close />
                  </StyledEditorAction>
                </span>
              </Tooltip>
            </StyledSectionEditor>
          ))}
        </StyledSections>
      )}
    </StyledEditor>
  );
};

NoteContentEditor.propTypes = {
  note: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  onFocus: PropTypes.func,
  onKeyDown: PropTypes.func,
  placeholder: PropTypes.string
};

export default NoteContentEditor;
