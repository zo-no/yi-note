import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Tooltip from '@material-ui/core/Tooltip';
import { tokens } from '../../theme';

const sizeMap = { small: 18, medium: 24, large: 30 };

const StyledContainer = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 32px;
  min-height: 32px;
  margin: 0;
  padding: 4px;
  border: none;
  border-radius: ${tokens.radius.small}px;
  background: transparent;
  color: ${props => props.color || tokens.colors.action};
  cursor: pointer;
  line-height: 1;

  &:hover {
    background: ${tokens.colors.hover};
  }

  &:focus-visible {
    outline: 2px solid ${tokens.colors.action};
    outline-offset: 2px;
  }

  & svg {
    width: ${({ size }) => sizeMap[size]}px;
    height: ${({ size }) => sizeMap[size]}px;
    fill: currentColor;
  }
`;

const IconButton = ({ size, color, tooltip, children, onClick, ...rest }) => {
  const button = (
    <StyledContainer
      type="button"
      size={size}
      color={color}
      onClick={onClick}
      aria-label={tooltip}
      {...rest}
    >
      {children}
    </StyledContainer>
  );

  return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
};

IconButton.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.string,
  tooltip: PropTypes.string,
  children: PropTypes.element.isRequired,
  onClick: PropTypes.func.isRequired
};

IconButton.defaultProps = { size: 'medium' };

export default IconButton;
