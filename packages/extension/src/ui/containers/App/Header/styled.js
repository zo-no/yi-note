import styled from 'styled-components';
import Grid from '@material-ui/core/Grid';

export const StyledContainer = styled(Grid)`
  flex-shrink: 0;
  padding: 20px;
  min-height: ${props => props.theme.header.height}px;
  background: ${props => props.theme.tokens.colors.surface};
  border-top: 3px solid ${props => props.theme.tokens.colors.terracotta};
  border-bottom: 1px solid ${props => props.theme.tokens.colors.border};
`;

export const StyledBrand = styled.div`
  font-family: ${props => props.theme.tokens.fonts.heading};
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.04em;
  color: ${props => props.theme.tokens.colors.ink};
`;

export const StyledSubtitle = styled.p`
  margin: 6px 0 0;
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  line-height: 1.5;
  color: ${props => props.theme.tokens.colors.muted};
`;
