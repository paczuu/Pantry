import React, { useEffect, useState, useRef } from 'react';
import { ModalActions } from '../ui/ModalActions';
import { EmptyState } from '../ui/Panel';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { SegmentedControl } from '../ui/SegmentedControl';
import { FieldLabel, SearchInput, Textarea } from '../ui/FormControls';
import {
  SheetFooter,
  SheetListEditor,
  SheetPopover,
  SheetTextArea,
  SheetTitleInput,
} from '../ui/SheetParts';
import { PhotoField } from '../common/PhotoField';
import { Recipe } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../language/LanguageContext';
import { Modal } from '../common/Modal';
import { LiveEditorsBadge } from '../common/LiveEditorsBadge';
import { useLiveRefresh, useEditingPresence } from '../../contexts/RealtimeContext';
import {
  ChefHat,
  Plus,
  Eye,
  EyeOff,
  ListChecks,
  StickyNote,
  Loader2,
  Star,
  ShoppingCart,
  Share2,
  LayoutGrid,
  List,
  Copy,
  Download,
} from 'lucide-react';

const RatingPill: React.FC<{ rating?: number; className?: string }> = ({ rating, className }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-extrabold text-amber-300 ${className ?? ''}`}
  >
    <Star className="w-3 h-3 fill-current" />
    {rating || 5}/10
  </span>
);

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

// Renders a high-quality recipe card as a PNG image (high-DPI)
const generateRecipeImageBlob = async (recipe: RecipeWithExtras, language: 'pl' | 'en' = 'pl'): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const width = 1200;
  const padding = 60;
  const contentWidth = width - padding * 2;

  const items = parseIngredients(recipe.ingredients);

  // Helper that wraps text into lines
  const wrapText = (text: string, font: string, maxWidth: number): string[] => {
    ctx.font = font;
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      const words = para.split(' ');
      let curLine = '';
      for (const word of words) {
        const testLine = curLine ? `${curLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth) {
          if (curLine) lines.push(curLine);
          curLine = word;
        } else {
          curLine = testLine;
        }
      }
      if (curLine) lines.push(curLine);
    }
    return lines;
  };

  const instructionLines = recipe.instructions
    ? wrapText(recipe.instructions, '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', contentWidth - 40)
    : [];

  const notesLines = recipe.notes
    ? wrapText(recipe.notes, '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', contentWidth - 60)
    : [];

  // Compute the total image height dynamically
  let totalHeight = padding * 2;
  const heroImageHeight = recipe.imageUrl ? 520 : 0;
  if (heroImageHeight) totalHeight += heroImageHeight + 40;

  totalHeight += 70; // Title
  totalHeight += 50; // Rating and ingredient count
  totalHeight += 40; // Separator

  if (items.length > 0) {
    totalHeight += 60; // Ingredients heading
    totalHeight += items.length * 38 + 30;
  }

  if (instructionLines.length > 0) {
    totalHeight += 60; // Instructions heading
    totalHeight += instructionLines.length * 36 + 30;
  }

  if (notesLines.length > 0) {
    totalHeight += 60; // Notes heading
    totalHeight += notesLines.length * 34 + 60; // Notes box
  }

  totalHeight += 70; // Footer

  canvas.width = width;
  canvas.height = totalHeight;

  // Gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalHeight);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, totalHeight);

  // Subtle outer border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, width - 20, totalHeight - 20);

  let curY = padding;

  // Draw the photo keeping its aspect ratio, centred (object-fit: cover)
  if (recipe.imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
        img.src = recipe.imageUrl!;
      });

      if (img.width > 0 && img.height > 0) {
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const targetH = 520;
        const scale = Math.max(contentWidth / imgW, targetH / imgH);
        const sWidth = contentWidth / scale;
        const sHeight = targetH / scale;
        const sx = (imgW - sWidth) / 2;
        const sy = (imgH - sHeight) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(padding, curY, contentWidth, targetH, 24);
        ctx.clip();
        ctx.drawImage(img, sx, sy, sWidth, sHeight, padding, curY, contentWidth, targetH);
        ctx.restore();

        // Photo border
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(padding, curY, contentWidth, targetH, 24);
        ctx.stroke();

        curY += targetH + 40;
      }
    } catch (e) {}
  }

  // Recipe title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(recipe.name, padding, curY + 36);
  curY += 60;

  // Rating and ingredient count
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const ratingLabel = language === 'en' ? 'Rating' : 'Ocena';
  const countLabel = language === 'en' ? 'Ingredients' : 'Składniki';
  const ratingText = `★ ${ratingLabel}: ${recipe.rating || 5}/10`;
  const countText = `${countLabel}: ${items.length}`;
  ctx.fillText(`${ratingText}   •   ${countText}`, padding, curY + 20);
  curY += 45;

  // Separator
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, curY);
  ctx.lineTo(width - padding, curY);
  ctx.stroke();
  curY += 35;

  // Ingredients
  if (items.length > 0) {
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(language === 'en' ? '📋 INGREDIENTS' : '📋 SKŁADNIKI', padding, curY + 24);
    curY += 45;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    for (const item of items) {
      ctx.fillStyle = '#10b981';
      ctx.fillText('•', padding + 8, curY + 20);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(item, padding + 36, curY + 20);
      curY += 38;
    }
    curY += 20;
  }

  // Instructions
  if (instructionLines.length > 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(language === 'en' ? '👨‍🍳 PREPARATION / INSTRUCTIONS' : '👨‍🍳 SPOSÓB PRZYGOTOWANIA', padding, curY + 24);
    curY += 45;

    ctx.fillStyle = '#f8fafc';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    for (const line of instructionLines) {
      ctx.fillText(line, padding + 8, curY + 20);
      curY += 36;
    }
    curY += 20;
  }

  // Notes
  if (notesLines.length > 0) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(language === 'en' ? '💡 NOTES & TIPS' : '💡 UWAGI I WSKAZÓWKI', padding, curY + 22);
    curY += 38;

    const boxH = notesLines.length * 34 + 30;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(padding, curY, contentWidth, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    let noteY = curY + 30;
    for (const line of notesLines) {
      ctx.fillText(line, padding + 20, noteY);
      noteY += 34;
    }
    curY += boxH + 25;
  }

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    language === 'en'
      ? 'Pantry App • Your smart home pantry & recipe book'
      : 'Aplikacja Pantry • Twoja domowa spiżarnia & przepisy',
    padding,
    totalHeight - 25
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/png');
  });
};

export const RecipesView: React.FC = () => {
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  const [recipes, setRecipes] = useState<RecipeWithExtras[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // View: full (cards) or compact
  const [viewMode, setViewMode] = useState<'full' | 'compact'>(() => {
    try {
      return (localStorage.getItem('pantry_recipes_view_mode') as 'full' | 'compact') || 'full';
    } catch {
      return 'full';
    }
  });

  const handleToggleViewMode = (mode: 'full' | 'compact') => {
    setViewMode(mode);
    try {
      localStorage.setItem('pantry_recipes_view_mode', mode);
    } catch {}
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithExtras | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [isImageProcessing, setIsImageProcessing] = useState(false);

  // Snapshot used to track isDirty
  const [initialSnapshot, setInitialSnapshot] = useState<{
    name: string;
    instructions: string;
    ingredients: string;
    notes: string;
    imageUrl: string | null;
    rating: number;
  }>({
    name: '',
    instructions: '',
    ingredients: '[]',
    notes: '',
    imageUrl: null,
    rating: 5,
  });

  const isDirty =
    name !== initialSnapshot.name ||
    instructions !== initialSnapshot.instructions ||
    JSON.stringify(ingredients) !== initialSnapshot.ingredients ||
    notes !== initialSnapshot.notes ||
    imageUrl !== initialSnapshot.imageUrl ||
    rating !== initialSnapshot.rating;

  // Sharing
  const [sharingRecipe, setSharingRecipe] = useState<RecipeWithExtras | null>(null);
  const [isSharingImage, setIsSharingImage] = useState(false);

  // Shopping list built from the recipe
  const [shoppingRecipeId, setShoppingRecipeId] = useState<string | null>(null);
  const [shoppingRecipe, setShoppingRecipe] = useState<RecipeWithExtras | null>(null);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [isShoppingChoiceOpen, setIsShoppingChoiceOpen] = useState(false);

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

  useLiveRefresh('pantry_recipes_refresh', fetchRecipes);
  useEditingPresence('recipe', editingRecipe?.id || null, isModalOpen && !!editingRecipe);

  const resetForm = () => {
    setEditingRecipe(null);
    setName('');
    setInstructions('');
    setIngredients([]);
    setNotes('');
    setShowNotesField(false);
    setImageUrl(null);
    setRating(5);
    setIsImageProcessing(false);
    setInitialSnapshot({
      name: '',
      instructions: '',
      ingredients: '[]',
      notes: '',
      imageUrl: null,
      rating: 5,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (recipe: RecipeWithExtras) => {
    const ings = parseIngredients(recipe.ingredients);
    setEditingRecipe(recipe);
    setName(recipe.name);
    setInstructions(recipe.instructions || '');
    setIngredients(ings);
    setNotes(recipe.notes || '');
    setShowNotesField(Boolean(recipe.notes));
    setImageUrl(recipe.imageUrl || null);
    setRating(recipe.rating || 5);
    setIsImageProcessing(false);
    setInitialSnapshot({
      name: recipe.name,
      instructions: recipe.instructions || '',
      ingredients: JSON.stringify(ings),
      notes: recipe.notes || '',
      imageUrl: recipe.imageUrl || null,
      rating: recipe.rating || 5,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isImageProcessing) {
      showToast(
        language === 'en'
          ? 'Please wait for image processing to complete.'
          : 'Poczekaj na zakończenie przetwarzania zdjęcia.',
        'info'
      );
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
        showToast(
          language === 'en' ? 'Recipe updated.' : 'Przepis zaktualizowany.',
          'success'
        );
      } else {
        await api.createRecipe(payload);
        showToast(
          language === 'en' ? 'Recipe saved.' : 'Zapisano nowy przepis.',
          'success'
        );
      }

      setIsModalOpen(false);
      resetForm();
      await fetchRecipes();
    } catch (error: any) {
      showToast(
        error?.message ||
          (language === 'en'
            ? 'Error saving recipe.'
            : 'Błąd zapisywania przepisu.'),
        'error'
      );
    }
  };

  const handleDeleteInModal = async () => {
    if (!editingRecipe) return;
    if (
      !window.confirm(
        language === 'en'
          ? `Are you sure you want to delete the recipe "${editingRecipe.name}"?`
          : `Czy na pewno chcesz usunąć przepis „${editingRecipe.name}”?`
      )
    )
      return;
    try {
      await api.deleteRecipe(editingRecipe.id);
      showToast(
        language === 'en' ? 'Recipe deleted.' : 'Przepis usunięty.',
        'info'
      );
      setRecipes((prev) => prev.filter((r) => r.id !== editingRecipe.id));
      setIsModalOpen(false);
      resetForm();
    } catch {
      showToast(
        language === 'en' ? 'Error deleting recipe.' : 'Błąd usuwania przepisu.',
        'error'
      );
    }
  };

  // Share as text
  const formatRecipeText = (recipe: RecipeWithExtras): string => {
    const items = parseIngredients(recipe.ingredients);
    let text = `🍽️ ${recipe.name} (${language === 'en' ? 'Rating' : 'Ocena'}: ${recipe.rating || 5}/10 ⭐)\n\n`;

    if (items.length > 0) {
      text += `${language === 'en' ? '📋 Ingredients:' : '📋 Składniki:'}\n${items.map((i) => `• ${i}`).join('\n')}\n\n`;
    }

    if (recipe.instructions) {
      text += `${language === 'en' ? '👨‍🍳 Instructions:' : '👨‍🍳 Sposób przygotowania:'}\n${recipe.instructions}\n\n`;
    }

    if (recipe.notes) {
      text += `${language === 'en' ? '💡 Notes:' : '💡 Uwagi:'}\n${recipe.notes}\n\n`;
    }

    text += language === 'en' ? `— Recipe from Pantry App` : `— Przepis z aplikacji Pantry`;
    return text;
  };

  const handleCopyText = async (recipe: RecipeWithExtras) => {
    try {
      const text = formatRecipeText(recipe);
      await navigator.clipboard.writeText(text);
      showToast(
        language === 'en'
          ? 'Copied recipe to clipboard.'
          : 'Skopiowano treść przepisu do schowka.',
        'success'
      );
      setSharingRecipe(null);
    } catch {
      showToast(
        language === 'en'
          ? 'Failed to copy text.'
          : 'Nie udało się skopiować tekstu.',
        'error'
      );
    }
  };

  const handleShareNativeText = async (recipe: RecipeWithExtras) => {
    const text = formatRecipeText(recipe);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${language === 'en' ? 'Recipe' : 'Przepis'}: ${recipe.name}`,
          text,
        });
        setSharingRecipe(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyText(recipe);
        }
      }
    } else {
      handleCopyText(recipe);
    }
  };

  const handleShareImage = async (recipe: RecipeWithExtras) => {
    try {
      setIsSharingImage(true);
      const blob = await generateRecipeImageBlob(recipe, language);
      const fileName = `recipe-${normalizeText(recipe.name) || 'pantry'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${language === 'en' ? 'Recipe' : 'Przepis'}: ${recipe.name}`,
          });
          setSharingRecipe(null);
          return;
        } catch (e: any) {
          if (e.name === 'AbortError') return;
        }
      }

      // Download the image file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(
        language === 'en'
          ? 'Downloaded recipe image!'
          : 'Pobrano grafikę z przepisem.',
        'success'
      );
      setSharingRecipe(null);
    } catch (e) {
      showToast(
        language === 'en'
          ? 'Error generating image.'
          : 'Błąd generowania grafiki.',
        'error'
      );
    } finally {
      setIsSharingImage(false);
    }
  };

  const createShoppingListFromRecipe = async (recipe: RecipeWithExtras, itemsToAdd: string[]) => {
    if (itemsToAdd.length === 0) {
      showToast(
        language === 'en'
          ? 'All ingredients for this recipe are already in your pantry.'
          : 'Wszystkie składniki tego przepisu masz już w spiżarni.',
        'info'
      );
      return;
    }

    let createdListId: string | null = null;

    try {
      setShoppingRecipeId(recipe.id);
      const listName = `${language === 'en' ? 'Recipe' : 'Przepis'}: ${recipe.name}`;
      const listRes = await api.createShoppingList({ name: listName });
      createdListId = listRes.list.id;

      for (const ingredient of itemsToAdd) {
        await api.addShoppingItem(listRes.list.id, {
          name: ingredient,
          quantity: 1,
          category: 'Other',
        });
      }

      showToast(
        language === 'en'
          ? `Created shopping list "${listName}" with ${itemsToAdd.length} items.`
          : `Utworzono listę zakupów „${listName}” z ${itemsToAdd.length} pozycjami.`,
        'success'
      );
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
      showToast(
        error?.message ||
          (language === 'en'
            ? 'Failed to create shopping list.'
            : 'Nie udało się utworzyć listy zakupów.'),
        'error'
      );
    } finally {
      setShoppingRecipeId(null);
    }
  };

  const handlePrepareShoppingList = async (e: React.MouseEvent, recipe: RecipeWithExtras) => {
    e.stopPropagation();
    const recipeIngredients = parseIngredients(recipe.ingredients);

    if (recipeIngredients.length === 0) {
      showToast(
        language === 'en'
          ? 'This recipe has no ingredients to add to shopping list.'
          : 'Ten przepis nie ma składników do dodania na listę zakupów.',
        'info'
      );
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
      showToast(
        error?.message ||
          (language === 'en'
            ? 'Failed to check pantry items.'
            : 'Nie udało się sprawdzić składników w spiżarni.'),
        'error'
      );
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
      <PageHeader
        icon={<ChefHat />}
        title={t('recipes.title')}
        subtitle={
          language === 'en'
            ? 'Save recipes, ingredients list, photos, rating, and notes'
            : 'Zapisuj przepisy, listę składników, zdjęcia, ocenę i opcjonalne uwagi'
        }
        actions={
          <>
            {/* View switch: full vs compact */}
            <SegmentedControl
              size="icon"
              className="rounded-2xl bg-slate-900"
              value={viewMode}
              onChange={handleToggleViewMode}
              options={[
                { value: 'full', label: <LayoutGrid className="w-4 h-4" />, title: t('recipes.viewFull') },
                { value: 'compact', label: <List className="w-4 h-4" />, title: t('recipes.viewCompact') },
              ]}
            />
            <Button variant="primary" icon={<Plus className="w-4 h-4 stroke-[2.5]" />} collapseLabel onClick={handleOpenAdd}>
              {t('recipes.addRecipe')}
            </Button>
          </>
        }
      />

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('recipes.searchPlaceholder')}
      />

      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-sm">{t('common.loading')}</div>
      ) : filteredRecipes.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="w-10 h-10 text-slate-600 mx-auto" />}
          title={t('recipes.emptyTitle')}
          description={t('recipes.emptyDesc')}
        />
      ) : viewMode === 'compact' ? (
        /* Compact view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRecipes.map((recipe) => {
            const items = parseIngredients(recipe.ingredients);

            return (
              <div
                key={recipe.id}
                onClick={() => handleOpenEdit(recipe)}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-900 hover:border-slate-700/80 shadow-md p-3 flex items-center gap-3 cursor-pointer select-none transition-all hover:scale-[1.01]"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <ChefHat className="w-6 h-6 text-orange-400/80" />
                  )}
                </div>

                {/* Info: name, ingredients, rating */}
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-white text-sm truncate leading-snug">{recipe.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {items.length} {language === 'en' ? (items.length === 1 ? 'ingredient' : 'ingredients') : (items.length === 1 ? 'składnik' : 'składników')}
                    </span>
                    <RatingPill rating={recipe.rating} />
                  </div>
                </div>

                {/* Actions: share */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSharingRecipe(recipe);
                    }}
                    className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title={t('recipes.shareTitle')}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Full view (cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map((recipe) => {
            const items = parseIngredients(recipe.ingredients);
            const notesVisible = expandedNotes[recipe.id];
            const isCreatingList = shoppingRecipeId === recipe.id;

            return (
              <article
                key={recipe.id}
                onClick={() => handleOpenEdit(recipe)}
                className="group rounded-3xl border border-slate-800 bg-slate-900/80 hover:bg-slate-900 hover:border-slate-700 shadow-lg overflow-hidden flex flex-col cursor-pointer select-none transition-all hover:-translate-y-0.5"
              >
                {recipe.imageUrl && (
                  <div className="relative w-full aspect-[16/9] bg-slate-950 overflow-hidden">
                    <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />
                    {/* Rating and share sit on the photo */}
                    <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between" onClick={(e) => e.stopPropagation()}>
                      <RatingPill rating={recipe.rating} className="bg-slate-950/80 border-amber-500/40" />
                      <button
                        type="button"
                        onClick={() => setSharingRecipe(recipe)}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-950/80 text-slate-100 hover:text-emerald-400 transition-colors"
                        title={t('recipes.shareTitle')}
                        aria-label={t('recipes.shareTitle')}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-lg text-white tracking-tight leading-snug break-words">{recipe.name}</h3>
                      <LiveEditorsBadge entityType="recipe" entityId={recipe.id} className="mt-1" />
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {!recipe.imageUrl && <RatingPill rating={recipe.rating} />}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {items.length} {language === 'en' ? (items.length === 1 ? 'ingredient' : 'ingredients') : (items.length === 1 ? 'składnik' : 'składników')}
                        </span>
                      </div>
                    </div>

                    {!recipe.imageUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSharingRecipe(recipe);
                        }}
                        className="w-9 h-9 -mr-1 -mt-1 shrink-0 flex items-center justify-center text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800 transition-colors"
                        title={t('recipes.shareTitle')}
                        aria-label={t('recipes.shareTitle')}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Ingredients as chips (the rest is in the editor) */}
                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {items.slice(0, 6).map((item, index) => (
                        <span
                          key={`${recipe.id}-ing-${index}`}
                          className="max-w-[11rem] truncate px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-200"
                        >
                          {item}
                        </span>
                      ))}
                      {items.length > 6 && (
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-[11px] font-bold text-slate-400">
                          +{items.length - 6}
                        </span>
                      )}
                    </div>
                  )}

                  {recipe.instructions && (
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed line-clamp-3">{recipe.instructions}</p>
                  )}

                  {recipe.notes && (
                    <div className="pt-1 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedNotes((prev) => ({ ...prev, [recipe.id]: !prev[recipe.id] }));
                        }}
                        className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5"
                      >
                        {notesVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {notesVisible ? t('recipes.hideNotes') : t('recipes.showNotes')}
                      </button>
                      {notesVisible && (
                        <p className="mt-2 text-xs text-amber-100/90 whitespace-pre-line bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3">
                          {recipe.notes}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    fullWidth
                    className="mt-auto"
                    icon={isCreatingList ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <ShoppingCart className="w-4 h-4 text-emerald-400" />}
                    disabled={isCreatingList || items.length === 0}
                    onClick={(e) => handlePrepareShoppingList(e, recipe)}
                  >
                    {isCreatingList
                      ? (language === 'en' ? 'Checking pantry...' : 'Sprawdzanie składników...')
                      : t('recipes.makeShoppingList')}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Share recipe modal */}
      <Modal
        isOpen={!!sharingRecipe}
        onClose={() => {
          if (isSharingImage) return;
          setSharingRecipe(null);
        }}
        title={t('recipes.shareTitle')}
        maxWidth="md"
      >
        {sharingRecipe && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                {sharingRecipe.imageUrl ? (
                  <img src={sharingRecipe.imageUrl} alt={sharingRecipe.name} className="w-full h-full object-cover" />
                ) : (
                  <ChefHat className="w-6 h-6 text-orange-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-white text-sm truncate">{sharingRecipe.name}</div>
                <div className="text-xs text-slate-400">
                  {parseIngredients(sharingRecipe.ingredients).length} {language === 'en' ? 'ingredients' : 'składników'} • {language === 'en' ? 'Rating' : 'Ocena'}: {sharingRecipe.rating || 5}/10
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleShareNativeText(sharingRecipe)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm">{t('recipes.shareAsText')}</div>
                    <div className="text-[11px] text-slate-400">
                      {language === 'en'
                        ? 'Share via WhatsApp, SMS, or Messenger'
                        : 'Prześlij przez WhatsApp, SMS lub Messenger'}
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCopyText(sharingRecipe)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm">{t('recipes.shareAsText')}</div>
                    <div className="text-[11px] text-slate-400">
                      {language === 'en' ? 'Copy formatted recipe text to clipboard' : 'Kopiuj sformatowaną listę i treść'}
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleShareImage(sharingRecipe)}
                disabled={isSharingImage}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-left transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
                    {isSharingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm">
                      {isSharingImage ? t('recipes.generatingImage') : t('recipes.shareAsImage')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {language === 'en'
                        ? 'High-DPI recipe card with photo and ingredients'
                        : 'Estetyczna karta przepisu ze zdjęciem i składnikami'}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSharingRecipe(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / edit recipe modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (isImageProcessing) return;
          setIsModalOpen(false);
        }}
        title={editingRecipe ? (language === 'en' ? 'Edit Recipe' : 'Edytuj przepis') : t('recipes.addRecipe')}
        maxWidth="lg"
        tall
        isDirty={isDirty}
        headerActions={
          <ModalActions
            formId="recipe-edit-form"
            submitLabel={editingRecipe ? t('common.save') : language === 'en' ? 'Create' : 'Utwórz'}
            isSubmitting={isImageProcessing}
            onCancel={() => setIsModalOpen(false)}
          />
        }
      >
        <form id="recipe-edit-form" onSubmit={handleSave} className="flex-1 flex flex-col gap-4">
          {/* Same sheet as notes: title and text sit directly on the background */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SheetTitleInput
                  value={name}
                  onChange={setName}
                  placeholder={language === 'en' ? 'e.g. Spaghetti Bolognese' : 'np. Zupa pomidorowa'}
                  ariaLabel={t('recipes.recipeNameLabel')}
                  autoFocus={!editingRecipe}
                />
              </div>

              {/* Rating: one button with the current value, the scale opens on tap */}
              <SheetPopover
                title={`${t('recipes.ratingLabel')}: ${rating}/10`}
                triggerClassName="w-auto px-2.5 gap-1"
                trigger={
                  <>
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-extrabold text-white">{rating}</span>
                  </>
                }
              >
                {(close) => (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] text-slate-500 px-0.5">
                      <span>{t('recipes.ratingPoor')}</span>
                      <span>{t('recipes.ratingGreat')}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setRating(value);
                            close();
                          }}
                          aria-pressed={value === rating}
                          className={`w-9 h-9 rounded-xl text-xs font-extrabold border transition-all ${
                            value === rating
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : value < rating
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </SheetPopover>
            </div>

            <PhotoField
              value={imageUrl ?? ''}
              onChange={(value) => setImageUrl(value || null)}
              compress={compressRecipeImage}
              onBusyChange={setIsImageProcessing}
              successMessage={language === 'en' ? 'Image processed successfully.' : 'Zdjęcie zostało przygotowane.'}
              hint={
                language === 'en'
                  ? 'Photo will be automatically resized and compressed before saving.'
                  : 'Zdjęcie zostanie automatycznie zmniejszone i skompresowane przed zapisaniem.'
              }
            />

            <SheetListEditor
              items={ingredients.map((text, index) => ({ id: String(index), text }))}
              onChange={(items) => setIngredients(items.map((item) => item.text))}
              label={t('recipes.ingredientsLabel')}
              itemPlaceholder={language === 'en' ? 'Ingredient...' : 'Składnik...'}
              newItemPlaceholder={t('recipes.ingredientPlaceholder')}
              addLabel={t('common.add')}
            />

            <div className="flex-1 flex flex-col gap-2">
              <FieldLabel className="mb-0">{t('recipes.instructionsLabel')}</FieldLabel>
              <SheetTextArea
                value={instructions}
                onChange={setInstructions}
                placeholder={t('recipes.instructionsPlaceholder')}
                ariaLabel={t('recipes.instructionsLabel')}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowNotesField((prev) => !prev)}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5"
              >
                <StickyNote className="w-3.5 h-3.5" />
                {showNotesField ? t('recipes.hideNotes') : t('recipes.showNotes')}
              </button>
              {showNotesField && (
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('recipes.notesPlaceholder')}
                  className="mt-2 border-amber-500/30 focus:border-amber-400"
                />
              )}
            </div>
          </div>

          {editingRecipe && (
            <SheetFooter
              createdAt={editingRecipe.createdAt}
              updatedAt={editingRecipe.updatedAt}
              deleteLabel={t('common.delete')}
              onDelete={handleDeleteInModal}
            />
          )}
        </form>
      </Modal>

      <Modal
        isOpen={isShoppingChoiceOpen}
        onClose={() => {
          if (shoppingRecipeId) return;
          setIsShoppingChoiceOpen(false);
          setShoppingRecipe(null);
        }}
        title={language === 'en' ? 'Ingredients already in Pantry' : 'Składniki już w spiżarni'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-200">
              {language === 'en'
                ? `Some ingredients for "${shoppingRecipe?.name}" appear to be in your pantry.`
                : `Część składników przepisu „${shoppingRecipe?.name}” wygląda na dostępną w spiżarni.`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'en'
                ? 'Choose whether to add all ingredients or only the missing ones.'
                : 'Wybierz, czy dodać na listę wszystkie składniki, czy tylko te, których nie znaleziono w spiżarni.'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-400 mb-2">
              {t('recipes.ingredientsAvailable')} ({availableIngredients.length})
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
            {t('recipes.ingredientsMissing')}: <span className="font-bold text-white">{missingIngredients.length}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <Button
              variant="primary"
              onClick={() => shoppingRecipe && createShoppingListFromRecipe(shoppingRecipe, missingIngredients)}
              disabled={!shoppingRecipe || shoppingRecipeId !== null || missingIngredients.length === 0}
            >
              {language === 'en' ? `Missing only (${missingIngredients.length})` : `Tylko brakujące (${missingIngredients.length})`}
            </Button>
            <Button
              onClick={() => shoppingRecipe && createShoppingListFromRecipe(shoppingRecipe, parseIngredients(shoppingRecipe.ingredients))}
              disabled={!shoppingRecipe || shoppingRecipeId !== null}
            >
              {language === 'en'
                ? `Add all (${shoppingRecipe ? parseIngredients(shoppingRecipe.ingredients).length : 0})`
                : `Dodaj wszystkie (${shoppingRecipe ? parseIngredients(shoppingRecipe.ingredients).length : 0})`}
            </Button>
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
            {t('common.cancel')}
          </button>
        </div>
      </Modal>
    </div>
  );
};
