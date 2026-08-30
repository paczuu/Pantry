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
  ImagePlus,
  Loader2,
  Star,
  ShoppingCart,
} from 'lucide-react';

type RecipeWithExtras = Recipe & {
  imageUrl?: string | null;
  rating?: number;
};

const parseIngredients = (raw?: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const normalizeText = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ąćęłńóśźż\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getIngredientSearchName = (ingredient: string): string => {
  let value = ingredient.trim();
  value = value.replace(/^\s*(?:\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)\s*(?:x|×)?\s*/i, '');
  value = value.replace(/^\s*(?:kg|g|mg|l|ml|szt\.?|sztuki?|opak\.?|opakowania?|puszki?|puszka|łyżki?|łyżeczki?|szklanki?|garści?)\s+/i, '');
  value = value.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return value || ingredient.trim();
};

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Nie udało się odczytać zdjęcia.'));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error('Nie udało się odczytać pliku.'));
    reader.readAsDataURL(file);
  });
};

const compressRecipeImage = async (file: File): Promise<string> => {
  const MAX_FILE_SIZE = 15 * 1024 * 1024;
  const MAX_DIMENSION = 900;
  const MAX_DATA_URL_LENGTH = 60000;

  if (!file.type.startsWith('image/')) {
    throw new Error('Wybrany plik nie jest zdjęciem.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Zdjęcie jest zbyt duże. Maksymalny rozmiar oryginalnego pliku to 15 MB.');
  }

  const image = await loadImageFromFile(file);
  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;

  if (width <= 0 || height <= 0) {
    throw new Error('Nie udało się odczytać wymiarów zdjęcia.');
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  let currentWidth = width;
  let currentHeight = height;
  let result = '';

  for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = currentWidth;
    canvas.height = currentHeight;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Nie udało się przygotować zdjęcia.');

    context.drawImage(image, 0, 0, currentWidth, currentHeight);
    let quality = 0.82;

    while (quality >= 0.4) {
      result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= MAX_DATA_URL_LENGTH) return result;
      quality -= 0.08;
    }

    currentWidth = Math.max(320, Math.round(currentWidth * 0.82));
    currentHeight = Math.max(320, Math.round(currentHeight * 0.82));
  }

  if (!result || result.length > 75000) {
    throw new Error('Nie udało się wystarczająco zmniejszyć zdjęcia. Wybierz inne zdjęcie.');
  }

  return result;
};

export const RecipesView: React.FC = () => {
  const { showToast } = useToast();

  const [recipes, setRecipes] = useState<RecipeWithExtras[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithExtras | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [shoppingRecipeId, setShoppingRecipeId] = useState<string | null>(null);
  const [shoppingRecipe, setShoppingRecipe] = useState<RecipeWithExtras | null>(null);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [isShoppingChoiceOpen, setIsShoppingChoiceOpen] = useState(false);

  const ingredientInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRecipes();
      setRecipes((data.recipes || []) as RecipeWithExtras[]);
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
    setImageUrl(null);
    setRating(5);
    setIsImageProcessing(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (recipe: RecipeWithExtras) => {
    setEditingRecipe(recipe);
    setName(recipe.name);
    setInstructions(recipe.instructions || '');
    setIngredients(parseIngredients(recipe.ingredients));
    setNewIngredient('');
    setNotes(recipe.notes || '');
    setShowNotesField(Boolean(recipe.notes));
    setImageUrl(recipe.imageUrl || null);
    setRating(recipe.rating || 5);
    setIsImageProcessing(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setIsModalOpen(true);
  };

  const handleAddIngredient = () => {
    if (!newIngredient.trim()) return;
    setIngredients((prev) => [...prev, newIngredient.trim()]);
    setNewIngredient('');
    window.setTimeout(() => focusAndKeepVisible(ingredientInputRef.current), 0);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImageProcessing(true);
      const compressed = await compressRecipeImage(file);
      setImageUrl(compressed);
      showToast('Zdjęcie zostało przygotowane.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Nie udało się przygotować zdjęcia.', 'error');
    } finally {
      setIsImageProcessing(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isImageProcessing) {
      showToast('Poczekaj na zakończenie przetwarzania zdjęcia.', 'info');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        instructions,
        ingredients,
        notes: notes.trim() || null,
        imageUrl,
        rating,
      };

      if (editingRecipe) {
        await api.updateRecipe(editingRecipe.id, payload);
        showToast('Przepis zaktualizowany.', 'success');
      } else {
        await api.createRecipe(payload);
        showToast('Zapisano nowy przepis.', 'success');
      }

      setIsModalOpen(false);
      resetForm();
      await fetchRecipes();
    } catch (error: any) {
      showToast(error?.message || 'Błąd zapisywania przepisu.', 'error');
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

  const createShoppingListFromRecipe = async (recipe: RecipeWithExtras, itemsToAdd: string[]) => {
    if (itemsToAdd.length === 0) {
      showToast('Wszystkie składniki tego przepisu masz już w spiżarni.', 'info');
      return;
    }

    let createdListId: string | null = null;

    try {
      setShoppingRecipeId(recipe.id);
      const listRes = await api.createShoppingList({ name: `Przepis: ${recipe.name}` });
      createdListId = listRes.list.id;

      for (const ingredient of itemsToAdd) {
        await api.addShoppingItem(listRes.list.id, {
          name: ingredient,
          quantity: 1,
          category: 'Inne',
        });
      }

      showToast(`Utworzono listę zakupów „Przepis: ${recipe.name}” z ${itemsToAdd.length} pozycjami.`, 'success');
      setIsShoppingChoiceOpen(false);
      setShoppingRecipe(null);
      setAvailableIngredients([]);
      setMissingIngredients([]);
    } catch (error: any) {
      if (createdListId) {
        try {
          await api.deleteShoppingList(createdListId);
        } catch {}
      }
      showToast(error?.message || 'Nie udało się utworzyć listy zakupów.', 'error');
    } finally {
      setShoppingRecipeId(null);
    }
  };

  const handlePrepareShoppingList = async (recipe: RecipeWithExtras) => {
    const recipeIngredients = parseIngredients(recipe.ingredients);

    if (recipeIngredients.length === 0) {
      showToast('Ten przepis nie ma składników do dodania na listę zakupów.', 'info');
      return;
    }

    try {
      setShoppingRecipeId(recipe.id);

      const availability = await Promise.all(
        recipeIngredients.map(async (ingredient) => {
          const searchName = getIngredientSearchName(ingredient);

          try {
            const res = await api.getPantryItems({ search: searchName, status: 'ACTIVE' });
            const normalizedSearch = normalizeText(searchName);
            const inPantry = (res.items || []).some((item) => {
              const normalizedItemName = normalizeText(item.name);
              return normalizedItemName.includes(normalizedSearch) || normalizedSearch.includes(normalizedItemName);
            });

            return { ingredient, inPantry };
          } catch {
            return { ingredient, inPantry: false };
          }
        })
      );

      const available = availability.filter((item) => item.inPantry).map((item) => item.ingredient);
      const missing = availability.filter((item) => !item.inPantry).map((item) => item.ingredient);

      if (available.length === 0) {
        await createShoppingListFromRecipe(recipe, recipeIngredients);
        return;
      }

      setShoppingRecipe(recipe);
      setAvailableIngredients(available);
      setMissingIngredients(missing);
      setIsShoppingChoiceOpen(true);
    } catch (error: any) {
      showToast(error?.message || 'Nie udało się sprawdzić składników w spiżarni.', 'error');
    } finally {
      setShoppingRecipeId(null);
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const q = search.toLowerCase();
    return (
      recipe.name.toLowerCase().includes(q) ||
      (recipe.instructions || '').toLowerCase().includes(q) ||
      (recipe.ingredients || '').toLowerCase().includes(q) ||
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
            Zapisuj przepisy, listę składników, zdjęcia, ocenę i opcjonalne uwagi
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
            Kliknij „Dodaj przepis”, aby zapisać nazwę, zdjęcie, składniki, treść, ocenę i opcjonalne uwagi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map((recipe) => {
            const items = parseIngredients(recipe.ingredients);
            const notesVisible = expandedNotes[recipe.id];
            const isCreatingList = shoppingRecipeId === recipe.id;

            return (
              <article
                key={recipe.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 shadow-lg overflow-hidden flex flex-col"
              >
                {recipe.imageUrl && (
                  <div className="w-full aspect-[16/9] bg-slate-950 overflow-hidden">
                    <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}

                <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-white tracking-tight">{recipe.name}</h3>
                      <LiveEditorsBadge entityType="recipe" entityId={recipe.id} className="mt-1" />
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-[11px] text-slate-500">
                          {items.length} {items.length === 1 ? 'składnik' : 'składników'}
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300">
                          <Star className="w-3 h-3 fill-current" />
                          {recipe.rating || 5}/10
                        </span>
                      </div>
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
                      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Przepis</div>
                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
                    </div>
                  )}

                  {recipe.notes && (
                    <div className="pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setExpandedNotes((prev) => ({ ...prev, [recipe.id]: !prev[recipe.id] }))}
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

                  <button
                    type="button"
                    onClick={() => handlePrepareShoppingList(recipe)}
                    disabled={isCreatingList || items.length === 0}
                    className="mt-auto w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    {isCreatingList ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <ShoppingCart className="w-4 h-4 text-emerald-400" />}
                    {isCreatingList ? 'Sprawdzanie składników...' : 'Utwórz listę zakupów'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (isImageProcessing) return;
          setIsModalOpen(false);
        }}
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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">Ocena przepisu</label>
              <span className="text-xs font-extrabold text-emerald-400">
                {rating}/10
              </span>
            </div>

            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => {
                const selected = value === rating;
                const filled = value <= rating;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`aspect-square rounded-xl text-xs font-extrabold border transition-all ${
                      selected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-950/40 scale-105'
                        : filled
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white hover:border-slate-600'
                    }`}
                    title={`Ocena ${value}/10`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 px-0.5">
              <span>Słaby</span>
              <span>Świetny</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Zdjęcie przepisu</label>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

            {imageUrl ? (
              <div className="space-y-2">
                <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-slate-950 border border-slate-700">
                  <img src={imageUrl} alt="Podgląd zdjęcia przepisu" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isImageProcessing}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-rose-400 transition-colors disabled:opacity-50"
                    title="Usuń zdjęcie"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isImageProcessing}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isImageProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4 text-emerald-400" />}
                    {isImageProcessing ? 'Przetwarzanie...' : 'Zmień zdjęcie'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isImageProcessing}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs disabled:opacity-50"
                  >
                    Usuń zdjęcie
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isImageProcessing}
                className="w-full min-h-32 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-900/50 hover:bg-emerald-500/5 transition-colors flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-300 disabled:opacity-50"
              >
                {isImageProcessing ? (
                  <>
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                    <span className="text-xs font-bold">Przetwarzanie zdjęcia...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-7 h-7 text-emerald-400" />
                    <span className="text-xs font-bold">Wybierz zdjęcie z galerii</span>
                    <span className="text-[10px] text-slate-500">JPG, PNG, WEBP • maks. 15 MB</span>
                  </>
                )}
              </button>
            )}

            <p className="text-[10px] text-slate-500">
              Zdjęcie zostanie automatycznie zmniejszone i skompresowane przed zapisaniem.
            </p>
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
            <div className="space-y-1.5 overflow-y-auto">
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
              disabled={isImageProcessing}
              className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-semibold disabled:opacity-40"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isImageProcessing}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isImageProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingRecipe ? 'Zapisz zmiany' : 'Utwórz'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isShoppingChoiceOpen}
        onClose={() => {
          if (shoppingRecipeId) return;
          setIsShoppingChoiceOpen(false);
          setShoppingRecipe(null);
        }}
        title="Składniki już w spiżarni"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-200">
              Część składników przepisu „{shoppingRecipe?.name}” wygląda na dostępną w spiżarni.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Wybierz, czy dodać na listę wszystkie składniki, czy tylko te, których nie znaleziono w spiżarni.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-400 mb-2">
              Znalezione w spiżarni ({availableIngredients.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableIngredients.map((ingredient, index) => (
                <span key={`${ingredient}-${index}`} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200">
                  {ingredient}
                </span>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Brakujące składniki: <span className="font-bold text-white">{missingIngredients.length}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => shoppingRecipe && createShoppingListFromRecipe(shoppingRecipe, missingIngredients)}
              disabled={!shoppingRecipe || shoppingRecipeId !== null || missingIngredients.length === 0}
              className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold disabled:opacity-40"
            >
              Tylko brakujące ({missingIngredients.length})
            </button>
            <button
              type="button"
              onClick={() => shoppingRecipe && createShoppingListFromRecipe(shoppingRecipe, parseIngredients(shoppingRecipe.ingredients))}
              disabled={!shoppingRecipe || shoppingRecipeId !== null}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold disabled:opacity-40"
            >
              Dodaj wszystkie ({shoppingRecipe ? parseIngredients(shoppingRecipe.ingredients).length : 0})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsShoppingChoiceOpen(false);
              setShoppingRecipe(null);
            }}
            disabled={shoppingRecipeId !== null}
            className="w-full py-2 text-xs text-slate-500 hover:text-white disabled:opacity-40"
          >
            Anuluj
          </button>
        </div>
      </Modal>
    </div>
  );
};
