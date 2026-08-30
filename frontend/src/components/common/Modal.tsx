import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { focusAndKeepVisible, useVisualViewport } from '../../hooks/useVisualViewport';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  const viewport = useVisualViewport();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!panelRef.current?.contains(target)) return;
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      focusAndKeepVisible(target);
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && panelRef.current?.contains(active)) {
      focusAndKeepVisible(active);
    }
  }, [isOpen, viewport.height, viewport.offsetTop]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  const overlayStyle: React.CSSProperties = {
    top: viewport.offsetTop,
    left: viewport.offsetLeft,
    width: viewport.width || '100%',
    height: viewport.height || '100%',
  };

  return (
    <div
      className="fixed z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      style={overlayStyle}
    >
      <div
        ref={panelRef}
        className={`w-full ${maxWidthClasses} bg-slate-900 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up`}
        style={{ maxHeight: `min(92vh, ${Math.max(240, viewport.height - 12)}px)` }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={bodyRef} className="p-5 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
