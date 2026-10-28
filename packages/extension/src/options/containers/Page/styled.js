import styled from 'styled-components';

export const StyledPage = styled.div`
  min-width: 0;
  color: ${props => props.theme.tokens.colors.ink};
`;

export const StyledHeader = styled.header`
  margin-bottom: 16px;
`;

export const StyledTitle = styled.h1`
  margin: 0;
  font-family: ${props => props.theme.tokens.fonts.heading};
  font-size: ${props => props.theme.tokens.fontSizes.heading}px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
`;

export const StyledMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 8px;
`;

export const StyledSource = styled.span`
  color: ${props => props.theme.tokens.colors.muted};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  overflow-wrap: anywhere;
`;

export const StyledNoteList = styled.section`
  display: grid;
  gap: ${props => props.theme.tokens.layout.itemGap}px;
  min-width: 0;
`;

export const StyledTextNote = styled.article`
  padding: ${props => props.theme.tokens.layout.cardPadding}px;
  background: ${props => props.theme.tokens.colors.surface};
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

export const StyledEmptyState = styled.div`
  padding: 24px 16px;
  border: 1px dashed ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;

  & h2 {
    margin: 0;
    font-size: ${props => props.theme.tokens.fontSizes.body}px;
  }

  & p {
    margin: 8px 0 0;
    color: ${props => props.theme.tokens.colors.muted};
    font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  }
`;

export const StyledTags = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
`;

export const StyledTag = styled.li`
  max-width: 100%;
  padding: 2px 8px;
  border-radius: ${props => props.theme.tokens.radius.pill}px;
  background: ${props => props.theme.tokens.colors.sageSoft};
  color: ${props => props.theme.tokens.colors.ink};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;
