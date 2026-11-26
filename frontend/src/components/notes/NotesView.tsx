import React, { useState, useEffect } from 'react';
import { ModalActions } from '../ui/ModalActions';
import { SegmentedControl } from '../ui/SegmentedControl';
import { EmptyState } from '../ui/Panel';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { SearchInput } from '../ui/FormControls';
import {
  SheetFooter,
  SheetIconButton,
  SheetListEditor,
  SheetPopover,
  SheetTextArea,
  SheetTitleInput,
} from '../ui/SheetParts';
import { Note, NoteColor, ChecklistItem } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { Modal } from '../common/Modal';
import { LiveEditorsBadge } from '../common/LiveEditorsBadge';
import { useLiveRefresh, useEditingPresence } from '../../contexts/RealtimeContext';
import { cn } from '../../utils/cn';
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
  const [color, setColor] = useState<NoteColor>('default');
  const [isPinned, setIsPinned] = useState(false);

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

            const MAX_VISIBLE_ITEMS = 6;
            const hiddenItems = Math.max(0, items.length - MAX_VISIBLE_ITEMS);

            return (
              <div
                key={note.id}
                onClick={() => handleOpenEdit(note)}
                className={cn(
                  'group relative overflow-hidden rounded-3xl border p-4 pt-5 sm:p-5 sm:pt-6 flex flex-col gap-3 cursor-pointer select-none transition-all hover:-translate-y-0.5 hover:border-slate-600',
                  getColorClasses(note.color)
                )}
              >
                {/* Colour accent along the top edge */}
                {note.color !== 'default' && (
                  <span className={cn('absolute inset-x-0 top-0 h-1', NOTE_COLOR_DOT[note.color])} />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-base text-white tracking-tight line-clamp-2 break-words">
                      {note.title}
                    </h4>
                    <LiveEditorsBadge entityType="note" entityId={note.id} className="mt-1" />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleTogglePin(e, note)}
                    className={cn(
                      'w-8 h-8 -mr-1 -mt-1 shrink-0 flex items-center justify-center rounded-xl transition-all',
                      note.isPinned
                        ? 'text-amber-300 bg-amber-500/15'
                        : 'text-slate-500 hover:text-slate-200 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100'
                    )}
                    title={note.isPinned ? t('notes.unpinNote') : t('notes.pinNote')}
                    aria-label={note.isPinned ? t('notes.unpinNote') : t('notes.pinNote')}
                  >
                    <Pin className={cn('w-4 h-4', note.isPinned && 'fill-current')} />
                  </button>
                </div>

                {/* Body / checklist preview */}
                {note.isChecklist ? (
                  items.length > 0 && (
                    <div className="space-y-0.5">
                      {items.slice(0, MAX_VISIBLE_ITEMS).map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => handleToggleCardChecklistItem(e, note, item.id)}
                          className="flex items-center gap-2.5 text-sm py-1 cursor-pointer select-none"
                        >
                          <div
                            className={cn(
                              'w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-all',
                              item.completed ? 'bg-emerald-500 text-slate-950' : 'border border-slate-600'
                            )}
                          >
                            {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={cn('truncate', item.completed ? 'line-through text-slate-500' : 'text-slate-200')}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                      {hiddenItems > 0 && (
                        <p className="text-[11px] text-slate-500 pl-7 pt-0.5">
                          +{hiddenItems} {language === 'en' ? 'more' : 'więcej'}
                        </p>
                      )}
                    </div>
                  )
                ) : (
                  note.content && (
                    <p className="text-sm text-slate-300 whitespace-pre-line line-clamp-6 leading-relaxed break-words">
                      {note.content}
                    </p>
                  )
                )}

                {/* Footer: date and type / progress */}
                <div className="mt-auto flex items-center justify-between pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                  <span>{new Date(note.createdAt).toLocaleDateString(locale)}</span>
                  {note.isChecklist ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                      <CheckSquare className="w-3.5 h-3.5" /> {completedCount}/{items.length}
                    </span>
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
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
                <SheetTitleInput
                  value={title}
                  onChange={setTitle}
                  placeholder={t('notes.noteTitlePlaceholder')}
                  ariaLabel={language === 'en' ? 'Title' : 'Tytuł'}
                  autoFocus={!editingNote}
                />
              </div>

              <SheetIconButton
                active={isPinned}
                aria-pressed={isPinned}
                title={isPinned ? t('notes.unpinNote') : t('notes.pinNote')}
                onClick={() => setIsPinned((pinned) => !pinned)}
              >
                <Pin className="w-3.5 h-3.5" />
              </SheetIconButton>

              {/* Card colour: one button showing the current colour, the palette opens on tap */}
              <SheetPopover
                title={t('notes.noteColor')}
                trigger={<span className={cn('w-4 h-4 rounded-full border border-white/30', NOTE_COLOR_DOT[color])} />}
              >
                {(close) => (
                  <div className="flex items-center gap-2">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColor(c);
                          close();
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
              </SheetPopover>
            </div>

            {isChecklist ? (
              <SheetListEditor
                checkable
                items={checklistItems}
                onChange={(items) => setChecklistItems(items.map((item) => ({ ...item, completed: !!item.completed })))}
                label={language === 'en' ? 'Checklist items' : 'Elementy listy'}
                itemPlaceholder={language === 'en' ? 'Item text...' : 'Treść punktu...'}
                newItemPlaceholder={t('notes.newChecklistItemPlaceholder')}
                addLabel={t('common.add')}
                progressText={(done, total) =>
                  t('notes.itemsProgress').replace('{done}', String(done)).replace('{total}', String(total))
                }
                clearCompletedLabel={t('notes.clearCompleted')}
              />
            ) : (
              <SheetTextArea
                value={content}
                onChange={setContent}
                placeholder={t('notes.noteContentPlaceholder')}
                ariaLabel={language === 'en' ? 'Note content' : 'Treść notatki'}
              />
            )}
          </div>

          {editingNote && (
            <SheetFooter
              createdAt={editingNote.createdAt}
              updatedAt={editingNote.updatedAt}
              deleteLabel={t('common.delete')}
              onDelete={async () => {
                if (await deleteNote(editingNote.id)) setIsModalOpen(false);
              }}
            />
          )}
        </form>
      </Modal>
    </div>
  );
};
