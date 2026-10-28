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
  gap: 4px;
  width: 100%;
  min-width: 0;
`;

export const StyledEditorToolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 2px;
  min-width: 0;
  padding: 4px;
  overflow-x: auto;

  & > span {
    display: inline-flex;
    flex-shrink: 0;
  }

  & > [data-preview] {
    margin-left: auto;
  }
`;

export const StyledEditorAction = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 28px;
  min-height: 28px;
  margin: 0;
  padding: 3px 6px;
  border: 0;
  border-radius: ${props => props.theme.tokens.radius.small / 2}px;
  background: transparent;
  color: ${props => props.theme.tokens.colors.muted};
  box-shadow: none;
  font-family: ${props => props.theme.tokens.fonts.body};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  font-weight: 400;
  line-height: 1.5;
  text-decoration: none;
  text-transform: none;
  white-space: nowrap;
  cursor: pointer;

  &[aria-pressed='true'] {
    background: ${props => props.theme.tokens.colors.hover};
    color: ${props => props.theme.tokens.colors.action};
    font-weight: 600;
  }

  &:hover:not(:disabled) {
    background: ${props => props.theme.tokens.colors.inset};
    color: ${props => props.theme.tokens.colors.ink};
    text-decoration: none;
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.tokens.colors.action};
    outline-offset: 0;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  & svg {
    width: 16px;
    height: 16px;
  }
`;

export const StyledEditorPreview = styled.div`
  box-sizing: border-box;
  min-width: 0;
  min-height: calc(3 * 1.6em + 16px);
  max-height: calc(12 * 1.6em + 16px);
  padding: 8px;
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.small}px;
  background: ${props => props.theme.tokens.colors.surface};
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  line-height: 1.6;
  overflow: auto;

  & .markdown-body {
    min-width: 0;
    max-width: 100%;
    font-size: inherit;
    overflow-wrap: anywhere;
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
    box-shadow: none;
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
    resize: none;
    overflow-wrap: anywhere;
    overflow-y: auto;
  }

  & input:hover:not(:disabled),
  & textarea:hover:not(:disabled) {
    border-color: ${props => props.theme.tokens.colors.controlBorder};
  }

  & input:focus,
  & input:focus-visible,
  & textarea:focus,
  & textarea:focus-visible {
    border-color: ${props => props.theme.tokens.colors.action};
    /* Override the APP_ID global ring; the existing 1px border shows focus. */
    outline: none !important;
    box-shadow: none;
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
