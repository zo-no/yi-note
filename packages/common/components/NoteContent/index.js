import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  VisibilityOutlined,
  EmojiObjectsOutlined,
  BookmarkBorder,
  LabelOutlined
} from '@material-ui/icons';
import MarkdownViewer from '../MarkdownViewer';
import { getNoteSections } from '../../utils/noteSections';
import {
  StyledSections,
  StyledSection,
  StyledLabel,
  StyledSectionBody
} from './styled';

export const SectionIcon = ({ kind }) => {
  const icons = new Map([
    ['observation', VisibilityOutlined],
    ['analysis', EmojiObjectsOutlined],
    ['takeaway', BookmarkBorder]
  ]);
  const Icon = icons.get(kind) || LabelOutlined;
  return <Icon aria-hidden="true" />;
};

SectionIcon.propTypes = { kind: PropTypes.string };

const NoteContent = ({ note }) => {
  const { t } = useTranslation('noteContent');
  const sections = getNoteSections(note);
  if (!sections) return <MarkdownViewer content={note.content || ''} />;

  return (
    <StyledSections>
      {sections
        .filter(section => section.content.trim())
        .map(section => (
          <StyledSection key={section.id}>
            <StyledLabel>
              <SectionIcon kind={section.kind} />
              <span>{section.label || t('custom')}</span>
            </StyledLabel>
            <StyledSectionBody>
              <MarkdownViewer content={section.content} />
            </StyledSectionBody>
          </StyledSection>
        ))}
    </StyledSections>
  );
};

NoteContent.propTypes = { note: PropTypes.object.isRequired };

export default NoteContent;
