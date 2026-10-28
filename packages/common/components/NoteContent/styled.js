import styled from 'styled-components';

const sectionLabelWidth = ({ theme }) =>
  (theme.tokens.layout || {}).sectionLabelWidth || 96;
const itemGap = ({ theme }) => (theme.tokens.layout || {}).itemGap || 10;

export const StyledSections = styled.div`
  display: grid;
  width: 100%;
  min-width: 0;
`;

export const StyledSection = styled.div`
  display: grid;
  grid-template-columns: min(${sectionLabelWidth}px, 30%) minmax(0, 1fr);
  align-items: start;
  gap: ${itemGap}px;
  min-width: 0;
  padding: 6px 0;

  & + & {
    border-top: 1px solid ${props => props.theme.tokens.colors.border};
  }
`;

export const StyledSectionBody = styled.div`
  min-width: 0;

  & .markdown-body {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    font-size: ${props => props.theme.tokens.fontSizes.compact}px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    overflow-x: auto;
  }

  & .markdown-body > :first-child {
    margin-top: 0;
  }

  & .markdown-body > :last-child {
    margin-bottom: 0;
  }
`;

export const StyledLabel = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
  padding-top: 2px;
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  font-weight: 600;
  line-height: 1.6;
  color: ${props => props.theme.tokens.colors.ink};
  overflow-wrap: anywhere;

  & span {
    min-width: 0;
  }

  & svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 2px;
    color: ${props => props.theme.tokens.colors.muted};
  }
`;

export const StyledEditor = styled.div`
  display: grid;
  gap: ${itemGap}px;
  width: 100%;
  min-width: 0;
`;

export const StyledEditorToolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;

  & > button {
    min-width: 0;
    max-width: 100%;
    min-height: 28px;
    padding: 2px 6px;
  }

  & > span button {
    padding: 4px;
  }
`;

export const StyledSectionEditor = styled(StyledSection)`
  grid-template-columns: min(${sectionLabelWidth}px, 30%) minmax(0, 1fr) auto;

  & > label {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    margin: 0;
    color: ${props => props.theme.tokens.colors.muted};
  }

  & label svg {
    flex-shrink: 0;
    font-size: 18px;
  }

  & > span {
    display: inline-flex;
  }

  & input,
  & textarea {
    display: block;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    margin: 0;
    padding: 3px 4px;
    border: 1px solid transparent;
    border-radius: ${props => props.theme.tokens.radius.small / 2}px;
    color: ${props => props.theme.tokens.colors.ink};
    background: transparent;
    font-family: ${props => props.theme.tokens.fonts.body};
    font-size: ${props => props.theme.tokens.fontSizes.compact}px;
    line-height: 1.6;
  }

  & input {
    border-bottom-color: ${props => props.theme.tokens.colors.border};
    font-weight: 600;
  }

  & textarea:not([aria-hidden='true']) {
    min-height: calc(1.6em + 8px);
    resize: vertical;
    overflow-wrap: anywhere;
    /* Keep content reachable when manually resized below the autosized height. */
    overflow-y: auto !important;
  }

  & input:hover:not(:disabled),
  & textarea:hover:not(:disabled) {
    border-color: ${props => props.theme.tokens.colors.controlBorder};
  }

  & input:focus,
  & textarea:focus {
    outline: 2px solid ${props => props.theme.tokens.colors.action};
    outline-offset: -2px;
  }

  & input::placeholder,
  & textarea::placeholder {
    color: ${props => props.theme.tokens.colors.muted};
    opacity: 1;
  }

  & input:disabled,
  & textarea:disabled {
    opacity: 0.65;
    resize: none;
  }
`;
