import styled from 'styled-components';
import Grid from '@material-ui/core/Grid';

export const StyledSearch = styled(Grid)`
  margin-top: 20px;
  min-height: 44px;
  padding: 6px 12px;
  border: 1px solid ${props => props.theme.tokens.colors.controlBorder};
  border-radius: ${props => props.theme.tokens.radius.medium}px;
  background: ${props => props.theme.tokens.colors.inset};

  &:focus-within {
    background: ${props => props.theme.tokens.colors.surface};
    outline: 2px solid ${props => props.theme.tokens.colors.action};
    outline-offset: 2px;
  }
`;

export const StyledArrow = styled(Grid)`
  display: flex;
  color: ${props => props.theme.tokens.colors.muted};
  margin-right: 8px;
`;

export const StyledInput = styled.input`
  border: none;
  flex: 1;
  min-width: 0;
  padding: 4px 0;
  font-family: ${props => props.theme.tokens.fonts.body};
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  line-height: 1.5;
  background: transparent;
  color: ${props => props.theme.tokens.colors.ink};

  &:focus,
  &:focus-visible {
    outline: none;
  }

  &::placeholder {
    color: ${props => props.theme.tokens.colors.muted};
    opacity: 1;
  }
`;
