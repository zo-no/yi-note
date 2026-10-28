import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  Button,
  IconButton,
  TextareaAutosize,
  Tooltip
} from '@material-ui/core';
import { Add, Close, HelpOutline, ViewListOutlined } from '@material-ui/icons';
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
        {sections ? (
          <>
            <Button
              size="small"
              disabled={disabled}
              aria-pressed={preview}
              onClick={() => setPreview(!preview)}
            >
              {t(preview ? 'edit' : 'preview')}
            </Button>
            <Button
              size="small"
              disabled={disabled}
              onClick={() => changePlainText(note.content)}
            >
              {t('toMarkdown')}
            </Button>
            {!preview && (
              <Button
                size="small"
                startIcon={<Add />}
                disabled={disabled}
                onClick={() =>
                  updateSections([...sections, createSection(t('custom'))])
                }
              >
                {t('add')}
              </Button>
            )}
          </>
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ViewListOutlined />}
            disabled={disabled}
            onClick={enableSections}
          >
            {t('enable')}
          </Button>
        )}
        <Tooltip title={t('hint')}>
          <span>
            <IconButton size="small" aria-label={t('hint')} disabled={disabled}>
              <HelpOutline fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </StyledEditorToolbar>
      {!sections ? (
        <MarkdownEditor
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
      ) : preview ? (
        <NoteContent note={note} />
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
                  <IconButton
                    size="small"
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
                    <Close fontSize="small" />
                  </IconButton>
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
