import styled from 'styled-components';
import { Modal } from '@material-ui/core';

export const StyledModal = styled(Modal)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const StyledPaper = styled.div`
  background-color: ${props => props.theme.palette.background.paper};
  color: ${props => props.theme.tokens.colors.ink};
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.large}px;
  box-shadow: ${props => props.theme.tokens.shadows.floating};
  padding: ${props => props.theme.spacing(2, 4, 3)};
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  width: 352px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
`;

export const StyledTitle = styled.div`
  font-family: ${props => props.theme.tokens.fonts.heading};
  font-size: ${props => props.theme.tokens.fontSizes.heading}px;
  font-weight: 600;
`;
