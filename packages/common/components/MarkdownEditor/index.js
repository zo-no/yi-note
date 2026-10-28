import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Grid, Divider, TextareaAutosize } from '@material-ui/core';
import MarkdownViewer from '../MarkdownViewer';
import IconButton from '../IconButton';
import { MarkdownIcon } from '../../icons';
import { tokens } from '../../theme';

const EDITOR_MIN_WIDTH = 100;

export const StyledEditorContainer = styled(Grid)`
  flex: 1;
  min-width: 0;
  border: 1px solid ${tokens.colors.border};
  border-radius: ${tokens.radius.medium}px;
  background: ${tokens.colors.surface};
  color: ${tokens.colors.ink};

  &:focus-within {
    border-color: ${tokens.colors.action};
  }

  &[data-compact='true'] {
    width: 100%;
    margin: 0;
    padding: 0;
    border-radius: ${props => props.theme.tokens.radius.small}px;
    box-shadow: none;
  }
`;

export const StyledTextArea = styled(Grid)`
  flex: 1;

  & textarea {
    font-family: ${tokens.fonts.body};
    font-size: ${tokens.fontSizes.compact}px;
    line-height: 1.6;
    padding: 8px;
    background: ${tokens.colors.surface};
    color: ${tokens.colors.ink};
    border-radius: ${tokens.radius.small}px;
    width: 100%;
    resize: vertical;
    flex: 1;
    min-height: ${EDITOR_MIN_WIDTH}px;
    border: none;
    word-break: break-word;

    &::placeholder {
      color: ${tokens.colors.muted};
      opacity: 1;
    }
  }

  & div.markdown-body {
    font-size: 14px;
    padding: 8px;
    min-height: ${EDITOR_MIN_WIDTH}px;
  }

  &[data-compact='true'] {
    min-width: 0;
    width: 100%;

    & textarea {
      display: block;
      box-sizing: border-box;
      min-width: 0;
      min-height: 0;
      max-height: none;
      margin: 0;
      border: 0;
      border-radius: ${props => props.theme.tokens.radius.small}px;
      box-shadow: none;
      resize: none;
      overflow-wrap: anywhere;
      overflow-y: auto;
    }

    & textarea:focus,
    & textarea:focus-visible {
      /* The APP_ID global focus ring must not add a second input frame. */
      outline: none !important;
      box-shadow: none;
    }

    & div.markdown-body {
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
      min-height: calc(3 * 1.6em + 16px);
      max-height: calc(12 * 1.6em + 16px);
      font-size: ${props => props.theme.tokens.fontSizes.compact}px;
      line-height: 1.6;
      overflow-wrap: anywhere;
      overflow: auto;
    }
  }
`;

const StyledMode = styled.button`
  padding: 8px;
  border: 0;
  border-radius: ${tokens.radius.small}px;
  font-family: ${tokens.fonts.body};
  font-size: ${tokens.fontSizes.compact}px;
  font-weight: ${props => (props.selected ? 600 : 400)};
  color: ${tokens.colors.action};
  background: ${props =>
    props.selected ? tokens.colors.selected : 'transparent'};
  cursor: pointer;
`;

const EDIT_MODE_WRITE = 'WRITE';
const EDIT_MODE_PREVIEW = 'PREVIEW';

const MarkdownEditor = ({
  disabled,
  content = '',
  placeholder,
  onChange,
  compact = false,
  hideToolbar = false,
  ...rest
}) => {
  const { t } = useTranslation('editor');
  const [mode, setMode] = useState(EDIT_MODE_WRITE);
  const Textarea = compact ? TextareaAutosize : 'textarea';

  const EDIT_MODES = [
    { key: EDIT_MODE_WRITE, value: t('mode.write') },
    { key: EDIT_MODE_PREVIEW, value: t('mode.preview') }
  ];

  const handleModeChange = mode => setMode(mode);

  const handleValueChange = e => {
    const { value } = e.target;
    onChange(value);
  };

  const handleOpenMarkdownGuide = () => {
    window.open(
      'https://guides.github.com/features/mastering-markdown/',
      '_blank'
    );
  };

  return (
    <StyledEditorContainer
      container
      data-compact={compact || undefined}
      spacing={compact ? 0 : 1}
      direction="column"
      justify="flex-start"
    >
      {!hideToolbar && (
        <>
          <Grid
            item
            container
            spacing={1}
            direction="row"
            justify="space-between"
          >
            <Grid item>
              <Grid container alignItems="center">
                {EDIT_MODES.map(m => (
                  <Grid key={m.key} item>
                    <StyledMode
                      type="button"
                      aria-pressed={m.key === mode}
                      selected={m.key === mode}
                      onClick={handleModeChange.bind(null, m.key)}
                    >
                      {m.value}
                    </StyledMode>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item>
              <IconButton
                size="large"
                tooltip={t('markdown.tooltip')}
                onClick={handleOpenMarkdownGuide}
              >
                <MarkdownIcon />
              </IconButton>
            </Grid>
          </Grid>
          <Grid item>
            <Divider />
          </Grid>
        </>
      )}
      <StyledTextArea item container data-compact={compact || undefined}>
        {hideToolbar || mode === EDIT_MODE_WRITE ? (
          <Textarea
            {...(compact ? { rowsMin: 3, rowsMax: 12 } : {})}
            disabled={disabled}
            placeholder={placeholder}
            value={content}
            onChange={handleValueChange}
            {...rest}
          />
        ) : (
          <MarkdownViewer content={content} />
        )}
      </StyledTextArea>
    </StyledEditorContainer>
  );
};

MarkdownEditor.propTypes = {
  disabled: PropTypes.bool,
  content: PropTypes.string,
  placeholder: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  compact: PropTypes.bool,
  hideToolbar: PropTypes.bool
};

export default MarkdownEditor;
