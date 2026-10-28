import styled from 'styled-components';

export const StyledArchor = styled.a`
  display: block;
  text-decoration: none;
  color: ${props => props.theme.tokens.colors.ink};
  line-height: 1.6;
  overflow-wrap: anywhere;

  &:hover {
    color: ${props => props.theme.tokens.colors.action};
    text-decoration: underline;
    cursor: pointer;
  }

  & mark {
    color: ${props => props.theme.tokens.colors.ink};
    background: ${props => props.theme.tokens.colors.selected};
  }
`;

export const StyledImg = styled.img`
  float: left;
  width: 24px;
  height: 24px;
  margin-right: 12px;
  border-radius: ${props => props.theme.tokens.radius.small}px;
  object-fit: contain;
`;

export const StyledMainLine = styled.div`
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  font-weight: 600;
`;

export const StyledAdditionalInfo = styled.div`
  width: 100%;
  margin-top: 8px;
  font-size: ${props => props.theme.tokens.fontSizes.auxiliary}px;
  color: ${props => props.theme.tokens.colors.muted};
`;
