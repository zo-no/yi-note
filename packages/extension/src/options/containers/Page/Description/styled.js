import styled from 'styled-components';

export const StyledDescription = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin: ${props => props.theme.tokens.space}px 0;
  color: ${props => props.theme.tokens.colors.ink};
  font-family: ${props => props.theme.tokens.fonts.body};
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  line-height: 1.6;
  overflow-wrap: anywhere;
`;

export const StyledToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => props.theme.tokens.space}px;
  width: 100%;
  min-height: ${props => props.theme.tokens.space * 4}px;
  padding: ${props => props.theme.tokens.space / 2}px 0;
  border: 0;
  border-radius: ${props => props.theme.tokens.radius.small}px;
  background: none;
  color: ${props => props.theme.tokens.colors.action};
  font: inherit;
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  text-align: left;
  cursor: pointer;

  & strong {
    color: ${props => props.theme.tokens.colors.ink};
    font-weight: 600;
    flex-shrink: 0;
  }

  & > span:last-child {
    flex-shrink: 0;
    white-space: nowrap;
  }

  &:hover {
    background: ${props => props.theme.tokens.colors.hover};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.tokens.colors.action};
    outline-offset: 2px;
  }
`;

export const StyledPreview = styled.p`
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  max-height: 1.6em;
  overflow: hidden;
  margin: 0;
  color: ${props => props.theme.tokens.colors.muted};
  white-space: normal;
`;

export const StyledContent = styled.div`
  max-height: min(${props => props.theme.tokens.space * 32}px, 40vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  margin-top: ${props => props.theme.tokens.space / 2}px;
  padding: ${props => props.theme.tokens.space}px 0;
  border-top: 1px solid ${props => props.theme.tokens.colors.border};

  &[hidden] {
    display: none;
  }

  &:focus {
    outline: 2px solid ${props => props.theme.tokens.colors.action};
    outline-offset: 2px;
  }
`;

export const StyledBlock = styled.div`
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  & + & {
    margin-top: ${props => props.theme.tokens.space / 2}px;
  }
`;

export const StyledLabel = styled.strong`
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  font-weight: 600;
`;
