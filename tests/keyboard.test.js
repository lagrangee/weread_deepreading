import { getKeyboardAction } from '../src/shared/keyboard.js';

function keyEvent(overrides = {}) {
  const target = document.createElement('textarea');
  target.className = 'chat-input';
  return { key: 'Enter', target, ...overrides };
}

test('中文输入法确认候选词不发送消息', () => {
  expect(getKeyboardAction(keyEvent({ isComposing: true }), true)).toBeNull();
  expect(getKeyboardAction(keyEvent({ keyCode: 229 }), true)).toBeNull();
});
test('Enter 发送，Shift+Enter 保留浏览器换行', () => {
  expect(getKeyboardAction(keyEvent(), true)).toBe('send');
  expect(getKeyboardAction(keyEvent({ shiftKey: true }), true)).toBeNull();
});
test('浏览器组合键和其他编辑区域不触发阅读动作', () => {
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    expect(getKeyboardAction(keyEvent({ [modifier]: true }), true)).toBeNull();
  }
  const input = document.createElement('input');
  expect(getKeyboardAction(keyEvent({ key: 'e', target: input }), true)).toBeNull();
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.setAttribute('contenteditable', 'true');
  expect(getKeyboardAction(keyEvent({ key: 'x', target: editor }), true)).toBeNull();
});
