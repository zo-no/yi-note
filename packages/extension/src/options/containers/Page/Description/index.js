import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { formatDescription, getDescriptionPreview } from './formatDescription';
import {
  StyledDescription,
  StyledToggle,
  StyledPreview,
  StyledContent,
  StyledBlock,
  StyledLabel
} from './styled';

let nextDescriptionId = 0;

const Description = ({ description }) => {
  const { t } = useTranslation('options');
  const [expanded, setExpanded] = useState(false);
  const [contentId] = useState(() => `page-description-${++nextDescriptionId}`);
  const blocks = useMemo(() => formatDescription(description), [description]);
  const preview = useMemo(() => getDescriptionPreview(description), [
    description
  ]);
  const titleId = `${contentId}-title`;

  if (!blocks.length) return null;

  return (
    <StyledDescription>
      <StyledToggle
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded(previous => !previous)}
      >
        <strong id={titleId}>{t('page.description.title')}</strong>
        {!expanded && <StyledPreview as="span">{preview}</StyledPreview>}
        <span>
          {t(
            expanded ? 'page.description.collapse' : 'page.description.expand'
          )}
        </span>
      </StyledToggle>

      <StyledContent
        id={contentId}
        role="region"
        aria-labelledby={titleId}
        hidden={!expanded}
        tabIndex={expanded ? 0 : undefined}
      >
        {expanded &&
          blocks.map((block, index) => (
            <StyledBlock key={index}>
              {block.label && <StyledLabel>{block.label}</StyledLabel>}
              {block.text.slice(block.label.length)}
            </StyledBlock>
          ))}
      </StyledContent>
    </StyledDescription>
  );
};

Description.propTypes = {
  description: PropTypes.string
};

export default Description;
