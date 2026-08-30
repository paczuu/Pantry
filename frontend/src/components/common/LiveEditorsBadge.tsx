import React from 'react';
import { useRealtime } from '../../contexts/RealtimeContext';
import { Pencil } from 'lucide-react';

interface LiveEditorsBadgeProps {
  entityType: string;
  entityId: string;
  className?: string;
}

export const LiveEditorsBadge: React.FC<LiveEditorsBadgeProps> = ({
  entityType,
  entityId,
  className = '',
}) => {
  const { editorsFor } = useRealtime();
  const editors = editorsFor(entityType, entityId);

  if (editors.length === 0) return null;

  const names = editors.map((editor) => editor.userName).join(', ');

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
      </span>
      <Pencil className="w-3 h-3" />
      {editors.length === 1 ? `${names} edytuje` : `${names} edytują`}
    </span>
  );
};
