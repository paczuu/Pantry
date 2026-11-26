import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { apiError, apiMessage } from '../utils/messages.js';

export const getNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;

    const notes = await prisma.note.findMany({
      where: { householdId },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    res.json({ notes });
  } catch (error) {
    res.status(500).json({ ...apiError('NOTES_FETCH_FAILED') });
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
      res.status(400).json({ ...apiError('NOTE_TITLE_REQUIRED') });
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

    res.status(201).json({ note, ...apiMessage('NOTE_CREATED') });
  } catch (error) {
    res.status(500).json({ ...apiError('NOTE_CREATE_FAILED') });
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

    res.json({ ...apiMessage('NOTE_UPDATED') });
  } catch (error) {
    res.status(500).json({ ...apiError('NOTE_UPDATE_FAILED') });
  }
};

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    await prisma.note.deleteMany({
      where: { id, householdId },
    });

    res.json({ ...apiMessage('NOTE_DELETED') });
  } catch (error) {
    res.status(500).json({ ...apiError('NOTE_DELETE_FAILED') });
  }
};
