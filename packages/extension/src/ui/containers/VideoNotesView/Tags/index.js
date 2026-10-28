import React from 'react';
import { useStoreState } from 'easy-peasy';
import { Grid, Chip } from '@material-ui/core';
import styled from 'styled-components';

const StyledTag = styled(Chip)`
  && {
    max-width: 100%;
    border: 1px solid ${props => props.theme.tokens.colors.border};
    border-radius: ${props => props.theme.tokens.radius.pill}px;
    background: ${props => props.theme.tokens.colors.sageSoft};
    color: ${props => props.theme.tokens.colors.ink};
  }

  &&:hover {
    border-color: ${props => props.theme.tokens.colors.sage};
    background: ${props => props.theme.tokens.colors.sageSoft};
  }
`;

const Tags = () => {
  const { tags } = useStoreState(state => state.page.data);

  const handleTagClick = tag => {
    browser.runtime.sendMessage({
      action: 'open-options',
      data: { action: 'filter-by-tags', data: [tag] }
    });
  };

  return (
    <Grid container spacing={1}>
      {tags.map(tag => (
        <Grid item key={tag}>
          <StyledTag
            label={tag}
            color="default"
            clickable
            onClick={handleTagClick.bind(null, tag)}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default Tags;
