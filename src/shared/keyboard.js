/** 判断阅读面板中需要处理的键盘动作；输入法与浏览器快捷键优先。 */
export function getKeyboardAction(event, isShowing) {
  if (event.isComposing || event.keyCode === 229) {
    return null;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  const target = event.target;
  if (target?.classList?.contains('chat-input')) {
    return event.key === 'Enter' && !event.shiftKey ? 'send' : null;
  }
  if (
    target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
  ) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (!isShowing) {
    return key === 'o' ? 'open' : null;
  }
  return (
    {
      t: 'mode',
      escape: 'close',
      a: event.key === 'A' ? 'increase' : 'decrease',
      d: 'theme',
      e: 'explain',
      x: 'digest',
      m: 'analyze',
      '?': 'settings',
    }[key] ?? null
  );
}
