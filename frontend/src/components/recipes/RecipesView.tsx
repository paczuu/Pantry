import React, { useEffect, useState, useRef } from 'react';
import { Recipe } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../common/Modal';
import { LiveEditorsBadge } from '../common/LiveEditorsBadge';
import { useLiveRefresh, useEditingPresence } from '../../contexts/RealtimeContext';
import { focusAndKeepVisible } from '../../hooks/useVisualViewport';
import {
  ChefHat,
  Plus,
  Trash2,
  Edit2,
  Search,
  Eye,
  EyeOff,
  X,
  ListChecks,
  StickyNote,
} from 'lucide-react';

const parseIngredients = (raw?: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const RecipesView: React.FC = () => {
  const { showToast } = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  const ingredientInputRef = useRef<HTMLInputElement>(null);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRecipes();
      setRecipes(data.recipes || []);
    } catch (e) {
      console.error('Błąd pobierania przepisów:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  useLiveRefresh('spizarnia_recipes_refresh', fetchRecipes);
  useEditingPresence('recipe', editingRecipe?.id || null, isModalOpen && !!editingRecipe);

  const resetForm = () => {
    setEditingRecipe(null);
    setName('');
    setInstructions('');
    setIngredients([]);
    setNewIngredient('');
    setNotes('');
    setShowNotesField(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setName(recipe.name);
    setInstructions(recipe.instructions || '');
    setIngredients(parseIngredients(recipe.ingredients));
    setNewIngredient('');
    setNotes(recipe.notes || '');
    setShowNotesField(Boolean(recipe.notes));
    setIsModalOpen(true);
  };

  const handleAddIngredient = () => {
    if (!newIngredient.trim()) return;
    setIngredients((prev) => [...prev, newIngredient.trim()]);
    setNewIngredient('');
    window.setTimeout(() => focusAndKeepVisible(ingredientInputRef.current), 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = {
        name: name.trim(),
        instructions,
        ingredients,
        notes: notes.trim() || null,
      };

      if (editingRecipe) {
        await api.updateRecipe(editingRecipe.id, payload);
        showToast('Przepis zaktualizowany.', 'success');
      } else {
        await api.createRecipe(payload);
        showToast('Zapisano nowy przepis.', 'success');
      }

      setIsModalOpen(false);
      await fetchRecipes();
    } catch {
      showToast('Błąd zapisywania przepisu.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten przepis?')) return;
    try {
      await api.deleteRecipe(id);
      showToast('Przepis usunięty.', 'info');
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
    } catch {
      showToast('Błąd usuwania przepisu.', 'error');
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const q = search.toLowerCase();
    return (
      recipe.name.toLowerCase().includes(q) ||
      recipe.instructions.toLowerCase().includes(q) ||
      recipe.ingredients.toLowerCase().includes(q) ||
      (recipe.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-400" />
            Przepisy
          </h2>
          <p className="text-xs text-slate-400">
            Zapisuj przepisy, listę składników i opcjonalne uwagi tylko dla siebie
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-emerald-950/50 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Dodaj przepis
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po nazwie, składnikach lub treści przepisu..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Ładowanie przepisów...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6 space-y-2">
          <ChefHat className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Brak przepisów</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Kliknij „Dodaj przepis”, aby zapisać nazwę, składniki, treść i opcjonalne uwagi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map((recipe) => {
            const items = parseIngredients(recipe.ingredients);
            const notesVisible = expandedNotes[recipe.id];

            return (
              <article
                key={recipe.id}
                className="p-4 sm:p-5 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-lg flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-base text-white tracking-tight">
                      {recipe.name}
                    </h3>
                    <LiveEditorsBadge entityType="recipe" entityId={recipe.id} className="mt-1" />
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {items.length} {items.length === 1 ? 'składnik' : 'składników'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(recipe)}
                      className="p-1.5 text-slate-500 hover:text-white rounded-xl transition-colors"
                      title="Edytuj"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-xl transition-colors"
                      title="Usuń"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-400 mb-1.5 flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" />
                      Składniki
                    </div>
                    <ul className="space-y-1">
                      {items.map((item, index) => (
                        <li key={`${recipe.id}-ing-${index}`} className="text-xs text-slate-300 flex gap-2">
                          <span className="text-emerald-400">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recipe.instructions && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
                      Przepis
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                      {recipe.instructions}
                    </p>
                  </div>
                )}

                {recipe.notes && (
                  <div className="pt-1 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNotes((prev) => ({ ...prev, [recipe.id]: !prev[recipe.id] }))
                      }
                      className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5"
                    >
                      {notesVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {notesVisible ? 'Ukryj uwagi' : 'Pokaż uwagi'}
                    </button>
                    {notesVisible && (
                      <p className="mt-2 text-xs text-amber-100/90 whitespace-pre-line bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3">
                        {recipe.notes}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecipe ? 'Edytuj przepis' : 'Nowy przepis'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nazwa *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Zupa pomidorowa"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Lista składników</label>
            <div className="flex gap-2">
              <input
                ref={ingredientInputRef}
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                enterKeyHint="enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddIngredient();
                  }
                }}
                placeholder="Wpisz składnik i naciśnij Enter"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400"
              >
                Dodaj
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {ingredients.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs"
                >
                  <span className="text-white truncate flex-1">{item}</span>
                  <button
                    type="button"
                    onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== index))}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Przepis</label>
            <textarea
              rows={6}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Kroki przygotowania..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowNotesField((prev) => !prev)}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5"
            >
              <StickyNote className="w-3.5 h-3.5" />
              {showNotesField ? 'Ukryj pole uwag' : 'Pokaż ukryte pole: uwagi'}
            </button>
            {showNotesField && (
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Prywatne uwagi, warianty, wskazówki..."
                className="mt-2 w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-amber-500/30 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-semibold"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg"
            >
              {editingRecipe ? 'Zapisz zmiany' : 'Utwórz'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
