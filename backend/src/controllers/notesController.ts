import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;

    const notes = await prisma.note.findMany({
      where: { householdId },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    res.json({ notes });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notes.' });
  }
};

export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const {
      title,
      content = '',
      isChecklist = false,
      checklistData = null,
      color = 'default',
      isPinned = false,
      category = 'Ogólne',
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Note title is required.' });
      return;
    }

    const note = await prisma.note.create({
      data: {
        householdId,
        title: title.trim(),
        content: content || '',
        isChecklist: Boolean(isChecklist),
        checklistData: checklistData ? (typeof checklistData === 'string' ? checklistData : JSON.stringify(checklistData)) : null,
        color,
        isPinned,
        createdById: req.user!.id,
      },
    });

    res.status(201).json({ note, message: 'Note created.' });
  } catch (error) {
    res.status(500).json({ error: 'Error creating note.' });
  }
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;
    const { title, content, isChecklist, checklistData, color, isPinned } = req.body;

    await prisma.note.updateMany({
      where: { id, householdId },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        content: content !== undefined ? content : undefined,
        isChecklist: isChecklist !== undefined ? Boolean(isChecklist) : undefined,
        checklistData: checklistData !== undefined ? (typeof checklistData === 'string' ? checklistData : JSON.stringify(checklistData)) : undefined,
        color,
        isPinned,
      },
    });

    res.json({ message: 'Note updated.' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating note.' });
  }
};

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    await prisma.note.deleteMany({
      where: { id, householdId },
    });

    res.json({ message: 'Note deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting note.' });
  }
};
