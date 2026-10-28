import styled from 'styled-components';

export const StyledDrawer = styled.div`
  display: flex;
  position: fixed;
  font-family: ${props => props.theme.tokens.fonts.body};
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  width: ${props => props.theme.panel.width}px;
  max-width: 100vw;
  top: 0;
  bottom: 0;
  right: 0;
  background: ${props => props.theme.tokens.colors.canvas};
  color: ${props => props.theme.tokens.colors.ink};
  border-left: 1px solid ${props => props.theme.tokens.colors.border};
  overflow: hidden;
  z-index: ${props => props.theme.panel.zIndex};
  transition: transform 0.3s;
  transform: ${props => (props.open ? 'translateX(0)' : 'translateX(100%)')};

  > div:first-child {
    flex-wrap: nowrap;
    flex-direction: column;
    min-width: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const StyledViewWrapper = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  padding: 20px;
  width: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.tokens.colors.controlBorder}
    transparent;
  overflow-wrap: anywhere;

  & > div {
    margin-bottom: 16px;
  }
`;
