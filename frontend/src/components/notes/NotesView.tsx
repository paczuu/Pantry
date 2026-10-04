import React, { useState, useEffect, useRef } from 'react';
import { Note, NoteColor, ChecklistItem } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../common/Modal';
import { LiveEditorsBadge } from '../common/LiveEditorsBadge';
import { useLiveRefresh, useEditingPresence } from '../../contexts/RealtimeContext';
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

export const NotesView: React.FC = () => {
  const { showToast, playBeep } = useToast();

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

  useLiveRefresh('spizarnia_notes_refresh', fetchNotes);
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
        showToast('Notatka zaktualizowana.', 'success');
      } else {
        await api.createNote(dataToSave);
        showToast('Utworzono nową notatkę.', 'success');
      }

      setIsModalOpen(false);
      await fetchNotes();
    } catch (e: any) {
      showToast('Błąd zapisywania notatki.', 'error');
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      await api.updateNote(note.id, { isPinned: !note.isPinned });
      await fetchNotes();
    } catch (e: any) {
      showToast('Błąd przypinania notatki.', 'error');
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Czy na pewno chcesz usunąć tę notatkę?')) {
      try {
        await api.deleteNote(id);
        showToast('Notatka usunięta.', 'info');
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } catch (e: any) {
        showToast('Błąd usuwania notatki.', 'error');
      }
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Nagłówek i Szukajka */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            Notatki & Listy zadań
          </h2>
          <p className="text-xs text-slate-400">
            Twórz listy zadań z polami wyboru, wskazówki i plany posiłków
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-emerald-950/50 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Dodaj notatkę / listę zadań
        </button>
      </div>

      {/* Wyszukiwarka */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj w notatkach i listach..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Siatka Notatek */}
      {filteredNotes.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6 space-y-2">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Brak notatek</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Kliknij „Dodaj notatkę / listę zadań”, aby zapisać informacje, listę zadań lub pomysły na posiłki.
          </p>
        </div>
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
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.2 rounded-md">
                            <CheckSquare className="w-3 h-3" /> Lista zadań ({completedCount}/{items.length})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <FileText className="w-3 h-3" /> Notatka tekstowa
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
                        className={`p-1.5 rounded-xl transition-colors ${
                          note.isPinned
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={note.isPinned ? 'Odepnij' : 'Przypnij na górze'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteNote(e, note.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-xl transition-colors"
                        title="Usuń"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Treść / Lista zadań */}
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
                  <span>{new Date(note.createdAt).toLocaleDateString('pl-PL')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dodawania/Edycji Notatki (Styl Google Keep) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNote ? 'Edytuj notatkę' : 'Nowa notatka / lista zadań'}
        maxWidth="lg"
        isDirty={isDirty}
        headerActions={
          <div className="flex items-center gap-2 mr-1">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              form="note-edit-form"
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              {editingNote ? 'Zapisz' : 'Utwórz'}
            </button>
          </div>
        }
      >
        <form id="note-edit-form" onSubmit={handleSaveNote} className="space-y-4">
          {/* Przełącznik formatu: Tylko przy tworzeniu nowej notatki */}
          {!editingNote && (
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsChecklist(false)}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${
                  !isChecklist ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                Notatka tekstowa
              </button>
              <button
                type="button"
                onClick={() => setIsChecklist(true)}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${
                  isChecklist ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Lista zadań
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tytuł *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Mój dzień, Przygotowanie do imprezy..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-base font-bold focus:outline-none focus:border-emerald-500"
              autoFocus={!editingNote}
            />
          </div>

          {/* Formularz Listy zadań lub Duże pole tekstowe (Google Keep style) */}
          {isChecklist ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">Elementy listy</label>
              
              <div className="flex gap-2">
                <input
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
                  placeholder="Wpisz punkt i naciśnij Enter lub Dodaj..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  Dodaj
                </button>
              </div>

              {/* Lista pozycji w modalu z podglądem wykonania i bezpośrednią edycją tekstu */}
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pt-1 pr-1">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleModalChecklistItem(item.id)}
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        item.completed
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'border border-slate-600 bg-slate-900/60 hover:border-emerald-500/60'
                      }`}
                      title={item.completed ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}
                    >
                      {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleUpdateChecklistItemText(item.id, e.target.value)}
                      placeholder="Treść punktu..."
                      className={`flex-1 bg-slate-900/70 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors ${
                        item.completed ? 'line-through text-slate-400' : ''
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition-colors shrink-0"
                      title="Usuń pozycję"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Treść notatki</label>
              <textarea
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Wpisz treść notatki..."
                className="w-full min-h-[260px] sm:min-h-[320px] max-h-[55vh] p-4 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-sans leading-relaxed resize-y overflow-y-auto shadow-inner"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Kolor kafelka</label>
            <div className="flex items-center gap-2 pt-1">
              {(['default', 'emerald', 'blue', 'amber', 'rose', 'purple'] as NoteColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-125 border-white ring-2 ring-emerald-500' : 'border-transparent opacity-80'
                  } ${
                    c === 'emerald'
                      ? 'bg-emerald-500'
                      : c === 'blue'
                      ? 'bg-blue-500'
                      : c === 'amber'
                      ? 'bg-amber-500'
                      : c === 'rose'
                      ? 'bg-rose-500'
                      : c === 'purple'
                      ? 'bg-purple-500'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
              />
              Przypnij tę notatkę na samej górze
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
