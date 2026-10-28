import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { tokens } from '@yi-note/common/theme';

const StyledButton = styled.button`
  font-family: ${tokens.fonts.body};
  font-weight: 600;
  font-size: ${tokens.fontSizes.compact}px;
  cursor: pointer;
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: ${tokens.radius.small}px;
  background: ${props =>
    props.primary ? tokens.colors.action : 'transparent'};
  color: ${props =>
    props.color ||
    (props.primary ? tokens.colors.surface : tokens.colors.action)};

  &:hover:not(:disabled) {
    background: ${props =>
      props.primary ? tokens.colors.ink : tokens.colors.peach};
  }

  &:disabled {
    background: ${props =>
      props.primary ? tokens.colors.inset : 'transparent'};
    color: ${tokens.colors.muted};
    cursor: default;
  }
`;

const TextButton = ({ children, color, onClick, disabled, primary }) => (
  <StyledButton
    type="button"
    color={color}
    primary={primary}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </StyledButton>
);

TextButton.propTypes = {
  children: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  color: PropTypes.string,
  disabled: PropTypes.bool,
  primary: PropTypes.bool
};

export default TextButton;
