import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

const MAX_IMAGE_LENGTH = 100000;

const parseIngredients = (value: unknown): string => {
  if (Array.isArray(value)) {
    return JSON.stringify(
      value
        .map((item) => String(item).trim())
        .filter(Boolean)
    );
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return JSON.stringify(
          parsed.map((item) => String(item).trim()).filter(Boolean)
        );
      }
    } catch {
      const lines = value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      return JSON.stringify(lines);
    }
  }

  return '[]';
};

const parseImage = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('INVALID_IMAGE');

  const image = value.trim();
  if (!image) return null;
  if (image.length > MAX_IMAGE_LENGTH) throw new Error('IMAGE_TOO_LARGE');
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) throw new Error('INVALID_IMAGE');

  return image;
};

export const getRecipes = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;

    const recipes = await prisma.recipe.findMany({
      where: { householdId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ recipes });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas pobierania przepisów.' });
  }
};

export const createRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const { name, instructions = '', ingredients = [], notes = null, imageUrl = null } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Nazwa przepisu jest wymagana.' });
      return;
    }

    let parsedImage: string | null;

    try {
      parsedImage = parseImage(imageUrl);
    } catch (error: any) {
      if (error.message === 'IMAGE_TOO_LARGE') {
        res.status(400).json({ error: 'Zdjęcie przepisu jest zbyt duże.' });
        return;
      }

      res.status(400).json({ error: 'Nieprawidłowy format zdjęcia przepisu.' });
      return;
    }

    const recipe = await prisma.recipe.create({
      data: {
        householdId,
        name: String(name).trim(),
        instructions: instructions || '',
        ingredients: parseIngredients(ingredients),
        notes: notes ? String(notes).trim() || null : null,
        imageUrl: parsedImage,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({ recipe, message: 'Przepis zapisany.' });
  } catch (error) {
    console.error('Błąd podczas tworzenia przepisu:', error);
    res.status(500).json({ error: 'Błąd podczas tworzenia przepisu.' });
  }
};

export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;
    const { name, instructions, ingredients, notes, imageUrl } = req.body;

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        res.status(400).json({ error: 'Nazwa przepisu jest wymagana.' });
        return;
      }

      data.name = String(name).trim();
    }

    if (instructions !== undefined) data.instructions = instructions;
    if (ingredients !== undefined) data.ingredients = parseIngredients(ingredients);

    if (notes !== undefined) {
      data.notes = notes ? String(notes).trim() || null : null;
    }

    if (imageUrl !== undefined) {
      try {
        data.imageUrl = parseImage(imageUrl);
      } catch (error: any) {
        if (error.message === 'IMAGE_TOO_LARGE') {
          res.status(400).json({ error: 'Zdjęcie przepisu jest zbyt duże.' });
          return;
        }

        res.status(400).json({ error: 'Nieprawidłowy format zdjęcia przepisu.' });
        return;
      }
    }

    const result = await prisma.recipe.updateMany({
      where: { id, householdId },
      data,
    });

    if (result.count === 0) {
      res.status(404).json({ error: 'Nie znaleziono przepisu.' });
      return;
    }

    res.json({ message: 'Przepis zaktualizowany.' });
  } catch (error) {
    console.error('Błąd podczas edycji przepisu:', error);
    res.status(500).json({ error: 'Błąd podczas edycji przepisu.' });
  }
};

export const deleteRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    const result = await prisma.recipe.deleteMany({
      where: { id, householdId },
    });

    if (result.count === 0) {
      res.status(404).json({ error: 'Nie znaleziono przepisu.' });
      return;
    }

    res.json({ message: 'Przepis usunięty.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas usuwania przepisu.' });
  }
};