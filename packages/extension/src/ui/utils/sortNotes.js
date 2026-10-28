const getTime = timestamp => {
  if (typeof timestamp === 'string' && timestamp.trim()) {
    timestamp = Number(timestamp);
  }
  return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : null;
};

// Sort a copy: storage order and note identity must not depend on the view.
export default (notes, order = 'asc') =>
  notes
    .map((note, index) => ({ note, index, time: getTime(note.timestamp) }))
    .sort((a, b) => {
      if (a.time === null && b.time === null) return a.index - b.index;
      if (a.time === null) return 1;
      if (b.time === null) return -1;
      const difference = order === 'desc' ? b.time - a.time : a.time - b.time;
      return difference || a.index - b.index;
    })
    .map(({ note }) => note);
