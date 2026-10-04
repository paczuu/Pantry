import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

const MAX_IMAGE_LENGTH = 80000;

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

const parseRating = (value: unknown): number => {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw new Error('INVALID_RATING');
  return rating;
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
    res.status(500).json({ error: 'Error fetching recipes.' });
  }
};

export const createRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const { name, instructions = '', ingredients = [], notes = null, imageUrl = null, rating = 5 } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Recipe name is required.' });
      return;
    }

    let parsedImage: string | null;
    let parsedRating: number;

    try {
      parsedImage = parseImage(imageUrl);
      parsedRating = parseRating(rating);
    } catch (error: any) {
      if (error.message === 'IMAGE_TOO_LARGE') {
        res.status(400).json({ error: 'Recipe image is too large.' });
        return;
      }
      if (error.message === 'INVALID_RATING') {
        res.status(400).json({ error: 'Recipe rating must be a number from 1 to 10.' });
        return;
      }
      res.status(400).json({ error: 'Invalid recipe image format.' });
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
        rating: parsedRating,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({ recipe, message: 'Recipe saved.' });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Error creating recipe.' });
  }
};

export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;
    const { name, instructions, ingredients, notes, imageUrl, rating } = req.body;

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        res.status(400).json({ error: 'Recipe name is required.' });
        return;
      }
      data.name = String(name).trim();
    }

    if (instructions !== undefined) data.instructions = instructions;
    if (ingredients !== undefined) data.ingredients = parseIngredients(ingredients);
    if (notes !== undefined) data.notes = notes ? String(notes).trim() || null : null;

    if (imageUrl !== undefined) {
      try {
        data.imageUrl = parseImage(imageUrl);
      } catch (error: any) {
        if (error.message === 'IMAGE_TOO_LARGE') {
          res.status(400).json({ error: 'Recipe image is too large.' });
          return;
        }
        res.status(400).json({ error: 'Invalid recipe image format.' });
        return;
      }
    }

    if (rating !== undefined) {
      try {
        data.rating = parseRating(rating);
      } catch {
        res.status(400).json({ error: 'Recipe rating must be a number from 1 to 10.' });
        return;
      }
    }

    const result = await prisma.recipe.updateMany({
      where: { id, householdId },
      data,
    });

    if (result.count === 0) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }

    res.json({ message: 'Recipe updated.' });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Error updating recipe.' });
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
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }

    res.json({ message: 'Recipe deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting recipe.' });
  }
};
