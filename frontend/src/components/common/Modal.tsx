import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  focusAndKeepVisible,
  useVisualViewport,
} from '../../hooks/useVisualViewport';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isDirty?: boolean;
  confirmCloseMessage?: string;
  headerActions?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  isDirty = false,
  confirmCloseMessage = 'Masz niezapisane zmiany. Czy na pewno chcesz wyjść bez zapisywania?',
  headerActions,
}) => {
  const viewport = useVisualViewport();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const confirmMsgRef = useRef(confirmCloseMessage);
  confirmMsgRef.current = confirmCloseMessage;

  const isOpenRef = useRef(isOpen);
  const historyPushedRef = useRef(false);

  const handleRequestClose = useCallback(() => {
    if (isDirtyRef.current) {
      const ok = window.confirm(confirmMsgRef.current);
      if (!ok) return;
    }
    onCloseRef.current();
  }, []);

  /**
   * Obsługa cofania (przycisk Wstecz przeglądarki / gest na telefonie).
   */
  useEffect(() => {
    if (isOpen && !isOpenRef.current) {
      // Otwarcie modala
      isOpenRef.current = true;
      const modalId = 'modal_' + Date.now();
      window.history.pushState({ modalId }, '');
      historyPushedRef.current = true;

      const handlePopState = () => {
        if (!historyPushedRef.current) return;
        historyPushedRef.current = false;
        isOpenRef.current = false;

        if (isDirtyRef.current) {
          const ok = window.confirm(confirmMsgRef.current);
          if (!ok) {
            window.history.pushState({ modalId }, '');
            historyPushedRef.current = true;
            isOpenRef.current = true;
            return;
          }
        }
        onCloseRef.current();
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (historyPushedRef.current) {
          historyPushedRef.current = false;
          isOpenRef.current = false;
          if (window.history.state?.modalId === modalId) {
            window.history.back();
          }
        }
      };
    } else if (!isOpen && isOpenRef.current) {
      // Zamknięcie modala
      isOpenRef.current = false;
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        window.history.back();
      }
    }
  }, [isOpen]);

  /**
   * Blokada scrolla strony pod modalem i obsługa Escape.
   */
  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleRequestClose]);

  /**
   * Pilnujemy widoczności inputów wewnątrz modala.
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;
      if (!panelRef.current?.contains(target)) return;

      if (
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        return;
      }

      focusAndKeepVisible(target);
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isOpen]);

  /**
   * Po zmianie wysokości visual viewportu
   * (np. pojawienie się klawiatury) sprawdzamy aktywne pole.
   */
  useEffect(() => {
    if (!isOpen) return;

    const active = document.activeElement;

    if (
      active instanceof HTMLElement &&
      panelRef.current?.contains(active)
    ) {
      focusAndKeepVisible(active);
    }
  }, [isOpen, viewport.height]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  const panelMaxHeight =
    viewport.height > 0
      ? `min(
          calc(100dvh - max(24px, env(safe-area-inset-top, 0px))),
          ${Math.max(240, viewport.height - 16)}px
        )`
      : `calc(100dvh - max(24px, env(safe-area-inset-top, 0px)))`;

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-end sm:items-center
        justify-center
        bg-black/70
        backdrop-blur-sm
        animate-fade-in
        p-0 sm:p-4
      "
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleRequestClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`
          w-full
          ${maxWidthClasses}
          bg-slate-900
          border border-slate-700/80
          rounded-t-2xl sm:rounded-2xl
          shadow-2xl
          overflow-hidden
          flex flex-col
          min-h-0
          animate-slide-up
        `}
        style={{
          maxHeight: panelMaxHeight,
        }}
      >
        {/* Header */}
        <div
          className="
            flex items-center justify-between
            px-5 py-3.5
            border-b border-slate-800
            bg-slate-900/90
            shrink-0
            gap-3
          "
        >
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
            {title}
          </h2>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={handleRequestClose}
              aria-label="Zamknij"
              className="
                p-1.5
                text-slate-400
                hover:text-white
                rounded-lg
                hover:bg-slate-800
                transition-colors
              "
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollowalna zawartość */}
        <div
          ref={bodyRef}
          className="
            px-5 pt-4
            pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]
            overflow-y-auto
            overscroll-contain
            flex-1
            min-h-0
            [-webkit-overflow-scrolling:touch]
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
};