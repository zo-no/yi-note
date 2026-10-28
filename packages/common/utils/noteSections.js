import { v4 } from 'uuid';

const kinds = ['observation', 'analysis', 'takeaway'];

export const createSection = (label, content = '', kind = 'custom') => ({
  id: v4(),
  kind,
  label,
  content
});

export const createDefaultSections = (content, labels) =>
  kinds.map((kind, index) =>
    createSection(labels[kind], index === 0 ? content || '' : '', kind)
  );

const escapeLabel = label =>
  label
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .replace(/[\\`*_{}[\]()#+.!<>|&~-]/g, '\\$&');

// Keep a readable Markdown projection for search, exports and older clients.
export const sectionsToMarkdown = sections =>
  sections
    .map(
      ({ label, content }) => `### ${escapeLabel(label) || '…'}\n\n${content}`
    )
    .join('\n\n');

export const getNoteSections = note => {
  const { sections, content } = note;
  if (
    !Array.isArray(sections) ||
    sections.length === 0 ||
    !sections.every(
      section =>
        section &&
        typeof section.id === 'string' &&
        section.id &&
        typeof section.label === 'string' &&
        typeof section.content === 'string'
    ) ||
    new Set(sections.map(section => section.id)).size !== sections.length
  ) {
    return null;
  }
  // A legacy/plain-text editor may change content without updating sections.
  // In that case the latest Markdown wins; never show stale structured text.
  return sectionsToMarkdown(sections) === content ? sections : null;
};

export const hasNoteContent = note => {
  const sections = getNoteSections(note);
  return sections
    ? sections.some(section => section.content.trim())
    : !!(note.content || '').trim();
};
