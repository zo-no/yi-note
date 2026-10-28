import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import { debounce } from 'throttle-debounce';
import { SearchSharp as SearchIcon } from '@material-ui/icons';
import { StyledSearch, StyledArrow, StyledInput } from './styled';

const Search = () => {
  const { t } = useTranslation('search');
  const history = useHistory();
  const { pathname } = useLocation();
  const { query, type } = useStoreState(state => state.search);
  const { search, setQuery } = useStoreActions(actions => actions.search);

  const debouncedSearch = debounce(500, search);

  const handleFocus = () => {
    if (pathname !== '/search') {
      history.push('/search');
    }
  };

  const onInputChangeHandler = e => {
    const { value } = e.target;
    setQuery(value);

    if (value.length >= 2) {
      debouncedSearch(query, type);
    }
  };

  return (
    <StyledSearch container direction="row" alignItems="center">
      <StyledArrow item>
        <SearchIcon />
      </StyledArrow>
      <StyledInput
        type="text"
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        value={query}
        onFocus={handleFocus}
        onChange={onInputChangeHandler}
      />
    </StyledSearch>
  );
};

export default Search;
