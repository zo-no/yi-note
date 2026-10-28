import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const StyledButton = styled.button`
  appearance: none;
  font-family: ${props => props.theme.tokens.fonts.body};
  font-weight: 600;
  font-size: ${props => props.theme.tokens.fontSizes.compact}px;
  line-height: 1.5;
  white-space: nowrap;
  text-align: center;
  text-transform: none;
  box-shadow: none;
  cursor: pointer;
  min-width: 0;
  min-height: 32px;
  margin: 0;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: ${props => props.theme.tokens.radius.small}px;
  background: transparent;
  color: ${props => props.theme.tokens.colors.action};

  &[data-quiet='true'] {
    font-weight: 400;
    color: ${props => props.theme.tokens.colors.muted};
  }

  &[data-primary='true'] {
    background: ${props => props.theme.tokens.colors.action};
    color: ${props => props.theme.tokens.colors.surface};
  }

  &:hover:not(:disabled) {
    background: ${props => props.theme.tokens.colors.peach};
  }

  &[data-quiet='true']:hover:not(:disabled) {
    background: ${props => props.theme.tokens.colors.inset};
  }

  &[data-primary='true']:hover:not(:disabled) {
    background: ${props => props.theme.tokens.colors.ink};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.tokens.colors.action};
    outline-offset: 2px;
  }

  &:disabled {
    color: ${props => props.theme.tokens.colors.muted};
    cursor: default;
  }

  &[data-primary='true']:disabled {
    background: ${props => props.theme.tokens.colors.inset};
  }
`;

const TextButton = ({ children, color, onClick, disabled, primary, quiet }) => (
  <StyledButton
    type="button"
    style={color ? { color } : undefined}
    data-primary={primary || undefined}
    data-quiet={quiet || undefined}
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
  primary: PropTypes.bool,
  quiet: PropTypes.bool
};

export default TextButton;
