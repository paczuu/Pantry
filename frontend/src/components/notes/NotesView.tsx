import React, { useState, useEffect, useRef } from 'react';
import { ModalActions } from '../ui/ModalActions';
import { SegmentedControl } from '../ui/SegmentedControl';
import { EmptyState } from '../ui/Panel';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { FieldLabel, Input, SearchInput, Textarea } from '../ui/FormControls';
import { Note, NoteColor, ChecklistItem } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { Modal } from '../common/Modal';
import { LiveEditorsBadge } from '../common/LiveEditorsBadge';
import { useLiveRefresh, useEditingPresence } from '../../contexts/RealtimeContext';
import { cn } from '../../utils/cn';
import { focusAndKeepVisible } from '../../hooks/useVisualViewport';
import {
  BookOpen,
  Plus,
  Pin,
  Trash2,
  Search,
  CheckSquare,
  FileText,
  Check,
  X,
} from 'lucide-react';

const NOTE_COLORS: NoteColor[] = ['default', 'emerald', 'blue', 'amber', 'rose', 'purple'];

const NOTE_COLOR_DOT: Record<NoteColor, string> = {
  default: 'bg-slate-600',
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  purple: 'bg-purple-500',
};

export const NotesView: React.FC = () => {
  const { showToast, playBeep } = useToast();
  const { t, language } = useLanguage();

  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Edit / Add modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isChecklist, setIsChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [color, setColor] = useState<NoteColor>('default');
  const [isPinned, setIsPinned] = useState(false);
  const checklistInputRef = useRef<HTMLInputElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    if (!isModalOpen) setShowColors(false);
  }, [isModalOpen]);

  // Close the colour palette on a tap outside it
  useEffect(() => {
    if (!showColors) return;
    const handleOutside = (event: PointerEvent) => {
      if (!colorMenuRef.current?.contains(event.target as Node)) setShowColors(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [showColors]);

  // Initial snapshot to track isDirty
  const [initialSnapshot, setInitialSnapshot] = useState<{
    title: string;
    content: string;
    isChecklist: boolean;
    checklistData: string;
    color: string;
    isPinned: boolean;
  }>({
    title: '',
    content: '',
    isChecklist: false,
    checklistData: '[]',
    color: 'default',
    isPinned: false,
  });

  const isDirty =
    title !== initialSnapshot.title ||
    content !== initialSnapshot.content ||
    isChecklist !== initialSnapshot.isChecklist ||
    JSON.stringify(checklistItems) !== initialSnapshot.checklistData ||
    color !== initialSnapshot.color ||
    isPinned !== initialSnapshot.isPinned;

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNotes();
      setNotes(data.notes || []);
    } catch (e: any) {
      console.error('Błąd pobierania notatek:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  useLiveRefresh('pantry_notes_refresh', fetchNotes);
  useEditingPresence('note', editingNote?.id || null, isModalOpen && !!editingNote);

  const handleOpenAdd = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setIsChecklist(false);
    setChecklistItems([]);
    setNewChecklistText('');
    setColor('default');
    setIsPinned(false);
    setInitialSnapshot({
      title: '',
      content: '',
      isChecklist: false,
      checklistData: '[]',
      color: 'default',
      isPinned: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setIsChecklist(note.isChecklist);
    let items: ChecklistItem[] = [];
    if (note.checklistData) {
      try {
        items = JSON.parse(note.checklistData);
      } catch (e) {}
    }
    setChecklistItems(items);
    setNewChecklistText('');
    setColor(note.color);
    setIsPinned(note.isPinned);
    setInitialSnapshot({
      title: note.title,
      content: note.content || '',
      isChecklist: note.isChecklist,
      checklistData: JSON.stringify(items),
      color: note.color,
      isPinned: note.isPinned,
    });
    setIsModalOpen(true);
  };

  /** Switches between text and checklist; the existing content is converted so nothing is lost. */
  const handleFormatChange = (format: 'text' | 'checklist') => {
    const toChecklist = format === 'checklist';
    if (toChecklist === isChecklist) return;

    if (toChecklist && checklistItems.length === 0 && content.trim()) {
      setChecklistItems(
        content
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((text) => ({ id: Math.random().toString(36).substring(2, 9), text, completed: false }))
      );
    } else if (!toChecklist && !content.trim() && checklistItems.length > 0) {
      setContent(checklistItems.map((item) => item.text).join('\n'));
    }
    setIsChecklist(toChecklist);
  };

  const handleClearCompleted = () => {
    setChecklistItems((prev) => prev.filter((item) => !item.completed));
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newChecklistText.trim(),
      completed: false,
    };
    setChecklistItems((prev) => [...prev, newItem]);
    setNewChecklistText('');
    window.setTimeout(() => focusAndKeepVisible(checklistInputRef.current), 0);
  };

  const handleUpdateChecklistItemText = (id: string, newText: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const handleToggleModalChecklistItem = (id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleToggleCardChecklistItem = async (e: React.MouseEvent, note: Note, itemId: string) => {
    e.stopPropagation();
    let items: ChecklistItem[] = [];
    try {
      items = JSON.parse(note.checklistData || '[]');
    } catch (e) {
      return;
    }

    const updatedItems = items.map((i) =>
      i.id === itemId ? { ...i, completed: !i.completed } : i
    );

    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id
          ? { ...n, checklistData: JSON.stringify(updatedItems) }
          : n
      )
    );

    playBeep(880, 'sine', 0.08);

    try {
      await api.updateNote(note.id, {
        checklistData: JSON.stringify(updatedItems),
      });
    } catch (e) {
      fetchNotes();
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const dataToSave = {
        title: title.trim(),
        content,
        isChecklist,
        checklistData: isChecklist ? JSON.stringify(checklistItems) : null,
        color,
        category: editingNote?.category || 'Ogólne',
        isPinned,
      };

      if (editingNote) {
        await api.updateNote(editingNote.id, dataToSave);
        showToast(
          language === 'en' ? 'Note updated.' : 'Notatka zaktualizowana.',
          'success'
        );
      } else {
        await api.createNote(dataToSave);
        showToast(
          language === 'en' ? 'Created new note.' : 'Utworzono nową notatkę.',
          'success'
        );
      }

      setIsModalOpen(false);
      await fetchNotes();
    } catch (e: any) {
      showToast(
        language === 'en' ? 'Error saving note.' : 'Błąd zapisywania notatki.',
        'error'
      );
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      await api.updateNote(note.id, { isPinned: !note.isPinned });
      await fetchNotes();
    } catch (e: any) {
      showToast(
        language === 'en' ? 'Error pinning note.' : 'Błąd przypinania notatki.',
        'error'
      );
    }
  };

  /** Asks for confirmation and deletes the note; resolves to `true` when it was deleted. */
  const deleteNote = async (id: string): Promise<boolean> => {
    const confirmed = window.confirm(
      language === 'en'
        ? 'Are you sure you want to delete this note?'
        : 'Czy na pewno chcesz usunąć tę notatkę?'
    );
    if (!confirmed) return false;

    try {
      await api.deleteNote(id);
      showToast(language === 'en' ? 'Note deleted.' : 'Notatka usunięta.', 'info');
      setNotes((prev) => prev.filter((n) => n.id !== id));
      return true;
    } catch (e: any) {
      showToast(language === 'en' ? 'Error deleting note.' : 'Błąd usuwania notatki.', 'error');
      return false;
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNote(id);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      (n.checklistData && n.checklistData.toLowerCase().includes(search.toLowerCase()))
  );

  const getColorClasses = (c: NoteColor) => {
    switch (c) {
      case 'emerald':
        return 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100 shadow-emerald-950/20';
      case 'blue':
        return 'bg-blue-950/30 border-blue-500/30 text-blue-100 shadow-blue-950/20';
      case 'amber':
        return 'bg-amber-950/30 border-amber-500/30 text-amber-100 shadow-amber-950/20';
      case 'rose':
        return 'bg-rose-950/30 border-rose-500/30 text-rose-100 shadow-rose-950/20';
      case 'purple':
        return 'bg-purple-950/30 border-purple-500/30 text-purple-100 shadow-purple-950/20';
      case 'default':
      default:
        return 'bg-slate-900/80 border-slate-800 text-slate-200 shadow-slate-950/40';
    }
  };

  const locale = language === 'en' ? 'en-US' : 'pl-PL';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header and search */}
      <PageHeader
        icon={<BookOpen />}
        title={t('notes.title')}
        subtitle={
          language === 'en'
            ? 'Create checklists, reminders, recipes, and meal plans'
            : 'Twórz listy zadań z polami wyboru, wskazówki i plany posiłków'
        }
        actions={
          <Button variant="primary" icon={<Plus className="w-4 h-4 stroke-[2.5]" />} collapseLabel onClick={handleOpenAdd}>
            {language === 'en' ? 'Add note / checklist' : 'Dodaj notatkę / listę zadań'}
          </Button>
        }
      />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={language === 'en' ? 'Search notes and checklists...' : 'Szukaj w notatkach i listach...'}
      />

      {/* Notes grid */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-slate-600 mx-auto" />}
          title={t('notes.emptyTitle')}
          description={
            language === 'en'
              ? 'Click "Add note / checklist" to save information, tasks, or meal ideas.'
              : 'Kliknij „Dodaj notatkę / listę zadań”, aby zapisać informacje, listę zadań lub pomysły na posiłki.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            let items: ChecklistItem[] = [];
            if (note.isChecklist && note.checklistData) {
              try {
                items = JSON.parse(note.checklistData);
              } catch (e) {}
            }
            const completedCount = items.filter((i) => i.completed).length;

            return (
              <div
                key={note.id}
                onClick={() => handleOpenEdit(note)}
                className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between shadow-lg relative group cursor-pointer select-none hover:scale-[1.01] hover:border-slate-700 ${getColorClasses(
                  note.color
                )}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5">
                        {note.isChecklist ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckSquare className="w-3 h-3" /> {language === 'en' ? 'Checklist' : 'Lista zadań'} ({completedCount}/{items.length})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <FileText className="w-3 h-3" /> {language === 'en' ? 'Text note' : 'Notatka tekstowa'}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-base text-white tracking-tight line-clamp-1">
                        {note.title}
                      </h4>
                      <LiveEditorsBadge entityType="note" entityId={note.id} className="mt-1" />
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleTogglePin(e, note)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                          note.isPinned
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={note.isPinned ? t('notes.unpinNote') : t('notes.pinNote')}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteNote(e, note.id)}
                        className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-rose-400 rounded-xl transition-colors"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body / checklist */}
                  {note.isChecklist ? (
                    <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => handleToggleCardChecklistItem(e, note, item.id)}
                          className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer select-none py-1 hover:text-white transition-colors"
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                              item.completed
                                ? 'bg-emerald-500 text-slate-950'
                                : 'border border-slate-600'
                            }`}
                          >
                            {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={`truncate ${item.completed ? 'line-through text-slate-500' : ''}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 whitespace-pre-line line-clamp-6 leading-relaxed mb-4">
                      {note.content}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                  <span>{new Date(note.createdAt).toLocaleDateString(locale)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit note modal (Google Keep style) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingNote
            ? (language === 'en' ? 'Edit note' : 'Edytuj notatkę')
            : (language === 'en' ? 'New note / checklist' : 'Nowa notatka / lista zadań')
        }
        maxWidth="lg"
        tall
        isDirty={isDirty}
        headerActions={
          <>
            {/* Text / checklist (existing notes are converted) */}
            <SegmentedControl
              size="sm"
              value={isChecklist ? 'checklist' : 'text'}
              onChange={handleFormatChange}
              options={[
                {
                  value: 'text',
                  label: <FileText className="w-4 h-4" />,
                  title: language === 'en' ? 'Text note' : 'Notatka tekstowa',
                },
                {
                  value: 'checklist',
                  label: <CheckSquare className="w-4 h-4" />,
                  title: language === 'en' ? 'Checklist' : 'Lista zadań',
                },
              ]}
            />
            <ModalActions
              formId="note-edit-form"
              submitLabel={editingNote ? t('common.save') : language === 'en' ? 'Create' : 'Utwórz'}
              onCancel={() => setIsModalOpen(false)}
            />
          </>
        }
      >
        <form id="note-edit-form" onSubmit={handleSaveNote} className="flex-1 flex flex-col gap-4">
          {/* Title and content sit directly on the sheet, like in a notebook */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('notes.noteTitlePlaceholder')}
                  aria-label={language === 'en' ? 'Title' : 'Tytuł'}
                  className="px-0 py-1 bg-transparent border-transparent rounded-none focus:border-transparent text-xl font-extrabold tracking-tight placeholder:font-bold"
                  autoFocus={!editingNote}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsPinned((pinned) => !pinned)}
                aria-pressed={isPinned}
                title={isPinned ? t('notes.unpinNote') : t('notes.pinNote')}
                aria-label={isPinned ? t('notes.unpinNote') : t('notes.pinNote')}
                className={cn(
                  'w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center transition-colors',
                  isPinned
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                )}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Card colour: one button showing the current colour, the palette opens on tap */}
              <div className="relative shrink-0" ref={colorMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowColors((open) => !open)}
                  aria-expanded={showColors}
                  title={t('notes.noteColor')}
                  aria-label={t('notes.noteColor')}
                  className="w-9 h-9 rounded-xl border bg-slate-800 border-slate-700 hover:border-slate-500 flex items-center justify-center transition-colors"
                >
                  <span className={cn('w-4 h-4 rounded-full border border-white/30', NOTE_COLOR_DOT[color])} />
                </button>

                {showColors && (
                  <div className="absolute right-0 top-full mt-2 z-20 flex items-center gap-2 p-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl animate-slide-up">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColor(c);
                          setShowColors(false);
                        }}
                        aria-label={c}
                        aria-pressed={color === c}
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                          color === c ? 'border-white' : 'border-transparent opacity-80 hover:opacity-100',
                          NOTE_COLOR_DOT[c]
                        )}
                      >
                        {color === c && <Check className="w-4 h-4 stroke-[3] text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isChecklist ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel className="mb-0">
                    {language === 'en' ? 'Checklist items' : 'Elementy listy'}
                  </FieldLabel>
                  {checklistItems.length > 0 && (
                    <span className="text-[11px] text-slate-300 font-semibold">
                      {t('notes.itemsProgress')
                        .replace('{done}', String(checklistItems.filter((i) => i.completed).length))
                        .replace('{total}', String(checklistItems.length))}
                    </span>
                  )}
                </div>

                {checklistItems.length > 0 && (
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{
                        width: `${(checklistItems.filter((i) => i.completed).length / checklistItems.length) * 100}%`,
                      }}
                    />
                  </div>
                )}

                {/* Items: tick, edit inline, remove */}
                {checklistItems.length > 0 && (
                  <div className="space-y-1.5 max-h-[40dvh] overflow-y-auto pr-1">
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleModalChecklistItem(item.id)}
                          className={cn(
                            'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all',
                            item.completed
                              ? 'bg-emerald-500 text-slate-950'
                              : 'border border-slate-600 bg-slate-900/60 hover:border-emerald-500/60'
                          )}
                          title={
                            item.completed
                              ? language === 'en' ? 'Mark incomplete' : 'Oznacz jako niewykonane'
                              : language === 'en' ? 'Mark complete' : 'Oznacz jako wykonane'
                          }
                        >
                          {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <Input
                          type="text"
                          value={item.text}
                          onChange={(e) => handleUpdateChecklistItemText(item.id, e.target.value)}
                          placeholder={language === 'en' ? 'Item text...' : 'Treść punktu...'}
                          className={cn(
                            'flex-1 px-1 py-2 text-sm bg-transparent border-transparent rounded-none border-b-slate-800 focus:border-b-emerald-500',
                            item.completed && 'line-through text-slate-400'
                          )}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          className="text-slate-400 hover:text-rose-400 w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0"
                          title={language === 'en' ? 'Delete item' : 'Usuń pozycję'}
                          aria-label={language === 'en' ? 'Delete item' : 'Usuń pozycję'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New item goes below the list, like in a notebook */}
                <div className="flex gap-2">
                  <Input
                    ref={checklistInputRef}
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    enterKeyHint="enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder={t('notes.newChecklistItemPlaceholder')}
                    className="flex-1 text-sm"
                  />
                  <Button variant="primary" icon={<Plus className="w-4 h-4 stroke-[2.5]" />} onClick={handleAddChecklistItem}>
                    {t('common.add')}
                  </Button>
                </div>

                {checklistItems.some((i) => i.completed) && (
                  <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={handleClearCompleted}>
                    {t('notes.clearCompleted')}
                  </Button>
                )}
              </div>
            ) : (
              // The text fills the rest of the sheet and scrolls inside it
              <div className="relative flex-1 min-h-[30dvh]">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('notes.noteContentPlaceholder')}
                  aria-label={language === 'en' ? 'Note content' : 'Treść notatki'}
                  className="absolute inset-0 h-full px-0 py-1 bg-transparent border-transparent rounded-none focus:border-transparent font-sans leading-relaxed resize-none overflow-y-auto"
                />
              </div>
            )}
          </div>

          {/* Existing note: dates and delete */}
          {editingNote && (
            <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 min-w-0">
                {t('notes.createdLabel')} {new Date(editingNote.createdAt).toLocaleDateString(locale)}
                {editingNote.updatedAt &&
                  new Date(editingNote.updatedAt).toDateString() !== new Date(editingNote.createdAt).toDateString() && (
                    <>
                      {' · '}
                      {t('notes.updatedLabel')} {new Date(editingNote.updatedAt).toLocaleDateString(locale)}
                    </>
                  )}
              </span>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={async () => {
                  if (await deleteNote(editingNote.id)) setIsModalOpen(false);
                }}
              >
                {t('common.delete')}
              </Button>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
