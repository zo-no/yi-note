import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Grid from '@material-ui/core/Grid';

const StyledContainer = styled(Grid)`
  height: ${props => (props.height ? `${props.height}px` : 'auto')};
  min-height: 0;
  max-height: 100%;
  align-content: flex-start;
  flex-shrink: 1;
  row-gap: 12px;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.tokens.colors.controlBorder}
    transparent;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const ScrollableList = ({ items, renderItem, height }) => {
  return (
    <StyledContainer container height={height}>
      {items.map(item => (
        <Grid key={item.id} item xs={12}>
          {renderItem(item)}
        </Grid>
      ))}
    </StyledContainer>
  );
};

ScrollableList.propTypes = {
  items: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  height: PropTypes.number
};

export default ScrollableList;
