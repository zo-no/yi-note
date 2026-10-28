import styled from 'styled-components';
import Grid from '@material-ui/core/Grid';
import { ChevronRight as ExpandIcon } from '@material-ui/icons';

export const StyledCard = styled(Grid)`
  background: ${props => props.theme.tokens.colors.surface};
  border: 1px solid ${props => props.theme.tokens.colors.border};
  border-radius: ${props => props.theme.tokens.radius.medium}px;

  &:focus-within,
  &[data-expanded='true'] {
    border-color: ${props => props.theme.tokens.colors.controlBorder};
  }
`;

export const StyledMainRow = styled(Grid)`
  min-height: 64px;
  padding: 8px;
  flex-wrap: nowrap;

  > div:first-child {
    flex: 1;
    min-width: 0;

    > div {
      flex-wrap: nowrap;
    }
  }
`;

export const StyledExpandedSection = styled(Grid)`
  display: flex;

  &[hidden] {
    display: none;
  }
  padding: 16px;
  border-top: 1px solid ${props => props.theme.tokens.colors.border};
  max-height: 400px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
`;

export const StyledExpandMoreIcon = styled(ExpandIcon)`
  transform: rotate(0deg);

  &[data-expanded='true'] {
    transform: rotate(90deg);
  }
  transition: transform 0.1s ease-in-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const StyledSummary = styled.div`
  min-width: 0;
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const StyledNote = styled.div`
  width: 100%;
  min-width: 0;
`;

export const StyledTimestamp = styled.span`
  font-family: ${props => props.theme.tokens.fonts.mono};
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  white-space: nowrap;
  color: ${props => props.theme.tokens.colors.action};
  background: ${props => props.theme.tokens.colors.peach};
  border-radius: ${props => props.theme.tokens.radius.small}px;
  margin-left: 4px;
  padding: 4px 8px;
`;
