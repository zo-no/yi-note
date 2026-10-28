import styled from 'styled-components';

export const StyledTimestamp = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${props => props.theme.tokens.radius.small}px;
  background: ${props => props.theme.tokens.colors.peach};
  color: ${props => props.theme.tokens.colors.action};
  font-family: ${props => props.theme.tokens.fonts.mono};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  margin-right: 8px;
`;
