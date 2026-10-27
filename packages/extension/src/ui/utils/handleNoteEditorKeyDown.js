export default (event, onSave, onChange) => {
  const nativeEvent = event.nativeEvent || event;
  if (
    event.key !== 'Enter' ||
    nativeEvent.isComposing ||
    nativeEvent.keyCode === 229
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (!event.metaKey) {
    if (!event.repeat) onSave();
    return;
  }

  const textarea = event.currentTarget;
  const { value, selectionStart, selectionEnd } = textarea;
  const nextValue = `${value.slice(0, selectionStart)}\n${value.slice(
    selectionEnd
  )}`;
  onChange(nextValue);

  // Restore the caret after React applies the controlled textarea value.
  window.requestAnimationFrame(() => {
    textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
  });
};
