'use client';

import { useCallback, useState } from 'react';

type Layout = 'si' | 'ta';

interface KeyboardState {
  visible: boolean;
  layout: Layout;
}

export function useOnScreenKeyboard() {
  const [state, setState] = useState<KeyboardState>({
    visible: false,
    layout: 'si',
  });
  const [targetRef, setTargetRef] = useState<
    HTMLInputElement | HTMLTextAreaElement | null
  >(null);

  const open = useCallback(
    (
      target: HTMLInputElement | HTMLTextAreaElement | null,
      layout: Layout
    ) => {
      setTargetRef(target);
      setState({ visible: true, layout });
    },
    []
  );

  const close = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
    setTargetRef(null);
  }, []);

  const insert = useCallback(
    (char: string) => {
      if (!targetRef) return;
      const start = targetRef.selectionStart ?? targetRef.value.length;
      const end = targetRef.selectionEnd ?? targetRef.value.length;
      const before = targetRef.value.slice(0, start);
      const after = targetRef.value.slice(end);
      if (char === '\b') {
        // backspace
        const newStart = Math.max(0, start - 1);
        targetRef.value = before.slice(0, -1) + after;
        targetRef.setSelectionRange(newStart, newStart);
      } else {
        targetRef.value = before + char + after;
        const pos = start + char.length;
        targetRef.setSelectionRange(pos, pos);
      }
      // Fire input event so React/controlled components pick up the change
      targetRef.dispatchEvent(new Event('input', { bubbles: true }));
      targetRef.focus();
    },
    [targetRef]
  );

  return { state, open, close, insert };
}
