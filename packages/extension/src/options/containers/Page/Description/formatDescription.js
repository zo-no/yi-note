const FIELD_BOUNDARIES = /(?:^|[，,、；;])[ \t\u3000]*(视频播放量|弹幕量|点赞数|投硬币枚数|收藏人数|转发人数|视频作者|作者简介|相关视频)(?=[:：\s]|$)/g;
const URL_TOKENS = /(?:[a-z][a-z\d+.-]*:|www\.|\/\/)[^\s<>]+/gi;
const PREVIEW_LENGTH = 140;

export const formatDescription = description => {
  if (typeof description !== 'string' || !description.trim()) return [];

  const blocks = [];
  let relatedVideos = false;
  // Keep every original character, including separators and CRLF, in order.
  for (const line of description.match(/[^\r\n]*(?:[\r\n]+|$)/g)) {
    if (!line) continue;
    // Markup-looking lines are opaque text, not HTML to parse or sanitize.
    if (relatedVideos || /[<>]/.test(line)) {
      blocks.push({ label: '', text: line });
      continue;
    }

    const urls = Array.from(line.matchAll(URL_TOKENS));
    let start = 0;
    let label = '';
    for (const match of line.matchAll(FIELD_BOUNDARIES)) {
      const nextLabel = match[1];
      const nextStart = match.index + match[0].length - nextLabel.length;
      // A field-like substring inside a URL is still part of the URL.
      if (
        urls.some(
          url => nextStart >= url.index && nextStart < url.index + url[0].length
        )
      ) {
        continue;
      }
      if (nextStart > start) {
        blocks.push({ label, text: line.slice(start, nextStart) });
      }
      start = nextStart;
      label = nextLabel;
      // Remaining related titles may span lines and contain field names/commas.
      if (label === '相关视频') {
        relatedVideos = true;
        break;
      }
    }
    blocks.push({ label, text: line.slice(start) });
  }
  return blocks;
};

export const getDescriptionPreview = description => {
  if (typeof description !== 'string') return '';
  const characters = Array.from(description.trim().replace(/\s+/g, ' '));
  return characters.length > PREVIEW_LENGTH
    ? `${characters.slice(0, PREVIEW_LENGTH).join('')}…`
    : characters.join('');
};
