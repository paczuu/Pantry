import { useEffect, useState } from 'react';

export interface VisualViewportBox {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
  keyboardHeight: number;
}

const readViewport = (): VisualViewportBox => {
  if (typeof window === 'undefined') {
    return {
      offsetTop: 0,
      offsetLeft: 0,
      width: 0,
      height: 0,
      keyboardHeight: 0,
    };
  }

  const vv = window.visualViewport;

  if (!vv) {
    return {
      offsetTop: 0,
      offsetLeft: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      keyboardHeight: 0,
    };
  }

  const keyboardHeight = Math.max(
    0,
    window.innerHeight - vv.height - vv.offsetTop
  );

  return {
    offsetTop: Math.max(0, vv.offsetTop),
    offsetLeft: Math.max(0, vv.offsetLeft),
    width: vv.width,
    height: vv.height,
    keyboardHeight,
  };
};

export function useVisualViewport(): VisualViewportBox {
  const [box, setBox] = useState<VisualViewportBox>(
    () => readViewport()
  );

  useEffect(() => {
    const vv = window.visualViewport;

    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        setBox(readViewport());
      });
    };

    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    update();

    return () => {
      cancelAnimationFrame(frame);

      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);

      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return box;
}

export function focusAndKeepVisible(
  el: HTMLElement | null
) {
  if (!el) return;

  window.setTimeout(() => {
    el.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }, 100);
}