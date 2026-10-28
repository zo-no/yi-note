import styled from 'styled-components';
import { Grid } from '@material-ui/core';

export const StyledCard = styled(Grid)`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  padding: ${props => props.theme.tokens.layout.cardPadding}px;
  background: ${props => props.theme.tokens.colors.surface};
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;

  & > div {
    min-width: 0;
  }

  @media (min-width: 900px) {
    &[data-has-image='true'] {
      --note-image-width: ${props =>
        props.theme.tokens.layout.noteImageWidth}px;
      grid-template-columns: min(28%, var(--note-image-width)) minmax(0, 1fr);
    }
  }

  @media (max-width: 599px) {
    gap: 12px;
  }
`;

export const StyledImgContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: ${props => props.theme.tokens.layout.noteImageWidth}px;
  min-width: 0;
  background: ${props =>
    props.theme.tokens.colors.inset || props.theme.tokens.colors.canvas};
  border-radius: ${props => props.theme.tokens.radius.medium}px;
`;

export const StyledImg = styled.img`
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: ${props => props.theme.tokens.radius.medium}px;
`;

export const StyledNoteContainer = styled(Grid)`
  min-width: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  gap: 8px;

  & .markdown-body {
    width: 100%;
    min-width: 0;
    font-size: ${props => props.theme.tokens.fontSizes.compact}px;
    line-height: 1.75;
    overflow-wrap: anywhere;
  }

  & textarea {
    box-sizing: border-box;
  }
`;

export const StyledNoteHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  padding-bottom: 2px;
`;

export const StyledActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  color: ${props => props.theme.tokens.colors.muted};

  & button {
    padding: 7px;
    border-radius: ${props => props.theme.tokens.radius.small}px;
  }

  & button:hover {
    background: ${props =>
      props.theme.tokens.colors.peach || props.theme.tokens.colors.selected};
    color: ${props => props.theme.tokens.colors.action};
  }

  & button[data-action='delete']:hover {
    background: ${props =>
      props.theme.tokens.colors.dangerSoft || props.theme.tokens.colors.hover};
    color: ${props => props.theme.tokens.colors.error};
  }

  & svg {
    font-size: 18px;
  }
`;

export const StyledTimestamp = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: 999px;
  background: ${props =>
    props.theme.tokens.colors.peach || props.theme.tokens.colors.selected};
  font-family: ${props => props.theme.tokens.fonts.mono};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${props => props.theme.tokens.colors.action};

  & a {
    color: inherit;
    font: inherit;
  }
`;

export const StyledEditorContainer = styled(Grid)`
  flex: 1;
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;
`;

export const StyledTextArea = styled(Grid)`
  flex: 1;

  & textarea {
    font-family: ${props => props.theme.tokens.fonts.body};
    font-size: ${props => props.theme.tokens.fontSizes.compact}px;
    line-height: 1.6;
    color: ${props => props.theme.tokens.colors.ink};
    background: ${props => props.theme.tokens.colors.surface};
    padding: 8px;
    flex: 1;
    min-height: 160px;
    border: none;
  }

  & div.markdown-body {
    font-size: ${props => props.theme.tokens.fontSizes.compact}px;
    padding: 8px;
  }
`;
