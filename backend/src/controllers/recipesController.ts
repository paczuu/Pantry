import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

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
    const { name, instructions = '', ingredients = [], notes = null } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Nazwa przepisu jest wymagana.' });
      return;
    }

    const recipe = await prisma.recipe.create({
      data: {
        householdId,
        name: String(name).trim(),
        instructions: instructions || '',
        ingredients: parseIngredients(ingredients),
        notes: notes ? String(notes).trim() || null : null,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({ recipe, message: 'Przepis zapisany.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas tworzenia przepisu.' });
  }
};

export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;
    const { name, instructions, ingredients, notes } = req.body;

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

    await prisma.recipe.updateMany({
      where: { id, householdId },
      data,
    });

    res.json({ message: 'Przepis zaktualizowany.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas edycji przepisu.' });
  }
};

export const deleteRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    await prisma.recipe.deleteMany({
      where: { id, householdId },
    });

    res.json({ message: 'Przepis usunięty.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas usuwania przepisu.' });
  }
};
