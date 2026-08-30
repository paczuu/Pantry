import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { initHouseholdDefaults } from './authController.js';

const INVITE_CODE_TTL_MS = 5 * 60 * 1000;

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getUniqueInviteCode = async (): Promise<string> => {
  let code = generateInviteCode();

  while (await prisma.household.findUnique({ where: { inviteCode: code } })) {
    code = generateInviteCode();
  }

  return code;
};

export const getSystemUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isSystemAdmin: true,
        householdId: true,
        household: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Błąd pobierania użytkowników systemu:', error);
    res.status(500).json({ error: 'Nie udało się pobrać użytkowników.' });
  }
};

export const getSystemHouseholds = async (req: Request, res: Response): Promise<void> => {
  try {
    const households = await prisma.household.findMany({
      select: {
        id: true,
        name: true,
        inviteCode: true,
        inviteCodeExpiresAt: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      households: households.map((household) => ({
        id: household.id,
        name: household.name,
        inviteCode: household.inviteCode,
        inviteCodeExpiresAt: household.inviteCodeExpiresAt,
        createdAt: household.createdAt,
        memberCount: household._count.members,
      })),
    });
  } catch (error) {
    console.error('Błąd pobierania gospodarstw systemu:', error);
    res.status(500).json({ error: 'Nie udało się pobrać gospodarstw.' });
  }
};

export const createSystemHousehold = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = String(req.body?.name || '').trim();

    if (name.length < 2) {
      res.status(400).json({ error: 'Nazwa gospodarstwa musi mieć co najmniej 2 znaki.' });
      return;
    }

    if (name.length > 60) {
      res.status(400).json({ error: 'Nazwa gospodarstwa może mieć maksymalnie 60 znaków.' });
      return;
    }

    const inviteCode = await getUniqueInviteCode();
    const inviteCodeExpiresAt = new Date(Date.now() + INVITE_CODE_TTL_MS);

    const household = await prisma.household.create({
      data: {
        name,
        inviteCode,
        inviteCodeExpiresAt,
      },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        inviteCodeExpiresAt: true,
        createdAt: true,
      },
    });

    await initHouseholdDefaults(household.id);

    res.status(201).json({
      household: {
        ...household,
        memberCount: 0,
      },
      message: 'Utworzono gospodarstwo i wygenerowano kod zaproszenia ważny przez 5 minut.',
    });
  } catch (error) {
    console.error('Błąd tworzenia gospodarstwa:', error);
    res.status(500).json({ error: 'Nie udało się utworzyć gospodarstwa.' });
  }
};

export const generateSystemHouseholdInviteCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { householdId } = req.params;

    const existingHousehold = await prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true, name: true },
    });

    if (!existingHousehold) {
      res.status(404).json({ error: 'Gospodarstwo nie istnieje.' });
      return;
    }

    const inviteCode = await getUniqueInviteCode();
    const inviteCodeExpiresAt = new Date(Date.now() + INVITE_CODE_TTL_MS);

    await prisma.household.update({
      where: { id: householdId },
      data: {
        inviteCode,
        inviteCodeExpiresAt,
      },
    });

    res.json({
      inviteCode,
      inviteCodeExpiresAt: inviteCodeExpiresAt.toISOString(),
      message: `Wygenerowano kod dla gospodarstwa "${existingHousehold.name}".`,
    });
  } catch (error) {
    console.error('Błąd generowania kodu gospodarstwa:', error);
    res.status(500).json({ error: 'Nie udało się wygenerować kodu zaproszenia.' });
  }
};

export const updateSystemUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role, householdId, isSystemAdmin } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'Użytkownik nie istnieje.' });
      return;
    }

    if (role !== undefined && !['ADMIN', 'MEMBER'].includes(role)) {
      res.status(400).json({ error: 'Nieprawidłowa rola użytkownika.' });
      return;
    }

    if (householdId !== undefined && householdId !== null) {
      const household = await prisma.household.findUnique({
        where: { id: householdId },
        select: { id: true },
      });

      if (!household) {
        res.status(400).json({ error: 'Wybrane gospodarstwo nie istnieje.' });
        return;
      }
    }

    if (
      userId === req.user!.id &&
      isSystemAdmin !== undefined &&
      isSystemAdmin === false
    ) {
      res.status(400).json({ error: 'Nie możesz odebrać sobie uprawnień administratora systemu.' });
      return;
    }

    const data: {
      role?: string;
      householdId?: string | null;
      isSystemAdmin?: boolean;
    } = {};

    if (role !== undefined) data.role = role;
    if (householdId !== undefined) data.householdId = householdId || null;
    if (isSystemAdmin !== undefined) data.isSystemAdmin = Boolean(isSystemAdmin);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSystemAdmin: true,
        householdId: true,
        household: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    res.json({ user, message: 'Zaktualizowano użytkownika.' });
  } catch (error) {
    console.error('Błąd aktualizacji użytkownika systemu:', error);
    res.status(500).json({ error: 'Nie udało się zaktualizować użytkownika.' });
  }
};

export const deleteSystemUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Nie możesz usunąć własnego konta administratora systemu.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'Użytkownik nie istnieje.' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      message: `Usunięto konto użytkownika ${targetUser.name} (${targetUser.email}).`,
    });
  } catch (error) {
    console.error('Błąd usuwania użytkownika systemu:', error);
    res.status(500).json({ error: 'Nie udało się usunąć użytkownika.' });
  }
};
