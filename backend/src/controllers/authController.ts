import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { logActivity } from '../services/auditService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-pantry-super-secret-key-change-in-production-2026';

const INVITE_CODE_TTL_MS = 5 * 60 * 1000;

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getInviteCodeExpiry = (): Date => new Date(Date.now() + INVITE_CODE_TTL_MS);

const isInviteCodeActive = (expiresAt?: Date | null): boolean => {
  return Boolean(expiresAt && expiresAt.getTime() > Date.now());
};

const getPrimaryUserId = async (): Promise<string | null> => {
  const primaryUser = await prisma.user.findFirst({
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    select: { id: true },
  });

  return primaryUser?.id || null;
};

const sanitizeHousehold = <T extends Record<string, any> | null>(household: T, role: string) => {
  if (!household || role === 'ADMIN') return household;
  const { inviteCode, inviteCodeExpiresAt, ...safeHousehold } = household;
  return safeHousehold;
};

const DEFAULT_CATEGORIES = [
  { name: 'Nabiał', icon: 'milk', color: 'blue', order: 1 },
  { name: 'Mięso i Ryby', icon: 'fish', color: 'rose', order: 2 },
  { name: 'Warzywa i Owoce', icon: 'apple', color: 'emerald', order: 3 },
  { name: 'Makarony i Sypkie', icon: 'wheat', color: 'amber', order: 4 },
  { name: 'Napoje', icon: 'cup-soda', color: 'cyan', order: 5 },
  { name: 'Przyprawy i Sosy', icon: 'flame', color: 'orange', order: 6 },
  { name: 'Przekąski', icon: 'cookie', color: 'purple', order: 7 },
  { name: 'Pieczywo', icon: 'croissant', color: 'yellow', order: 8 },
  { name: 'Mrożonki', icon: 'ice-cream', color: 'sky', order: 9 },
  { name: 'Przetwory i Konserwy', icon: 'soup', color: 'teal', order: 10 },
  { name: 'Inne', icon: 'tag', color: 'gray', order: 11 },
];

export const initHouseholdDefaults = async (householdId: string) => {
  // Dodaj domyślne kategorie
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.categorySetting.upsert({
      where: { householdId_name: { householdId, name: cat.name } },
      update: {},
      create: { householdId, name: cat.name, icon: cat.icon, color: cat.color, order: cat.order },
    });
  }

  // Utwórz domyślną listę zakupów
  const existingList = await prisma.shoppingList.findFirst({
    where: { householdId },
  });
  if (!existingList) {
    await prisma.shoppingList.create({
      data: {
        householdId,
        name: 'Główna lista zakupów',
        icon: 'shopping-cart',
        color: 'emerald',
      },
    });
  }
};

const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
  name: z.string().min(2, 'Imię musi mieć co najmniej 2 znaki'),
  inviteCode: z.string().trim().optional(),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email, password, name, inviteCode } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();
    const cleanInviteCode = inviteCode?.trim().toUpperCase() || '';

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Użytkownik o podanym adresie email już istnieje.' });
      return;
    }

    const [userCount, householdCount] = await Promise.all([
      prisma.user.count(),
      prisma.household.count(),
    ]);
    const isFirstInstallation = userCount === 0 && householdCount === 0;

    const passwordHash = await bcrypt.hash(password, 10);

    if (isFirstInstallation) {
      let uniqueCode = generateInviteCode();
      while (await prisma.household.findUnique({ where: { inviteCode: uniqueCode } })) {
        uniqueCode = generateInviteCode();
      }

      const newUser = await prisma.$transaction(async (tx) => {
        const household = await tx.household.create({
          data: {
            name: 'Moje gospodarstwo',
            inviteCode: uniqueCode,
            inviteCodeExpiresAt: getInviteCodeExpiry(),
          },
        });

        const createdUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: name.trim(),
            role: 'ADMIN',
            isSystemAdmin: true,
            householdId: household.id,
          },
          include: {
            household: true,
          },
        });

        for (const cat of DEFAULT_CATEGORIES) {
          await tx.categorySetting.create({
            data: {
              householdId: household.id,
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              order: cat.order,
            },
          });
        }

        await tx.shoppingList.create({
          data: {
            householdId: household.id,
            name: 'Główna lista zakupów',
            icon: 'shopping-cart',
            color: 'emerald',
          },
        });

        return createdUser;
      });

      await logActivity({
        householdId: newUser.householdId!,
        userId: newUser.id,
        userName: newUser.name,
        userEmail: newUser.email,
        action: 'UTWORZONO_GOSPODARSTWO',
        entityType: 'HOUSEHOLD',
        entityName: newUser.household?.name || 'Moje gospodarstwo',
        details: 'Utworzono pierwsze konto instalacji jako administrator gospodarstwa i administrator systemu.',
      });

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, householdId: newUser.householdId },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        message: 'Utworzono pierwsze konto administratora systemu.',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          isSystemAdmin: newUser.isSystemAdmin,
          householdId: newUser.householdId,
          household: sanitizeHousehold(newUser.household as any, newUser.role),
        },
      });
      return;
    }

    if (!cleanInviteCode) {
      res.status(400).json({ error: 'Kod zaproszenia jest wymagany.' });
      return;
    }

    if (cleanInviteCode.length !== 6) {
      res.status(400).json({ error: 'Kod zaproszenia musi mieć 6 znaków.' });
      return;
    }

    const household = await prisma.household.findUnique({
      where: { inviteCode: cleanInviteCode },
    });

    if (!household) {
      res.status(400).json({ error: 'Nieprawidłowy kod zaproszenia do gospodarstwa.' });
      return;
    }

    if (!isInviteCodeActive(household.inviteCodeExpiresAt)) {
      res.status(400).json({ error: 'Kod zaproszenia wygasł. Poproś administratora o wygenerowanie nowego kodu.' });
      return;
    }

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        role: 'MEMBER',
        isSystemAdmin: false,
        householdId: household.id,
      },
      include: {
        household: true,
      },
    });

    await logActivity({
      householdId: household.id,
      userId: newUser.id,
      userName: newUser.name,
      userEmail: newUser.email,
      action: 'DOLACZONO_DO_DOMU',
      entityType: 'MEMBER',
      entityName: newUser.name,
      details: 'Użytkownik utworzył konto za pomocą kodu zaproszenia i dołączył do gospodarstwa.',
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, householdId: newUser.householdId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Konto utworzone pomyślnie.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isSystemAdmin: newUser.isSystemAdmin,
        householdId: newUser.householdId,
        household: sanitizeHousehold(newUser.household as any, newUser.role),
      },
    });
  } catch (error) {
    console.error('Błąd rejestracji:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas rejestracji.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Podaj email i hasło.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { household: true },
    });

    if (!user) {
      res.status(400).json({ error: 'Nieprawidłowy email lub hasło.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Nieprawidłowy email lub hasło.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, householdId: user.householdId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Zalogowano pomyślnie.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSystemAdmin: user.isSystemAdmin,
        householdId: user.householdId,
        household: sanitizeHousehold(user.household as any, user.role),
      },
    });
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas logowania.' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isSystemAdmin: true,
        householdId: true,
        household: {
          include: {
            members: {
              select: { id: true, name: true, email: true, role: true, isSystemAdmin: true, createdAt: true },
            },
            customCategories: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie został odnaleziony.' });
      return;
    }

    res.json({
      user: {
        ...user,
        household: sanitizeHousehold(user.household as any, user.role),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas pobierania danych profilu.' });
  }
};

export const joinHousehold = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      res.status(400).json({ error: 'Podaj kod zaproszenia.' });
      return;
    }

    const household = await prisma.household.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!household) {
      res.status(404).json({ error: 'Gospodarstwo o takim kodzie nie istnieje.' });
      return;
    }

    if (!isInviteCodeActive(household.inviteCodeExpiresAt)) {
      res.status(400).json({ error: 'Kod zaproszenia wygasł. Poproś administratora o wygenerowanie nowego kodu.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        householdId: household.id,
        role: 'MEMBER',
      },
      include: { household: true },
    });

    await logActivity({
      householdId: household.id,
      userId: req.user!.id,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'DOLACZONO_DO_DOMU',
      entityType: 'MEMBER',
      entityName: req.user!.name,
      details: `${req.user!.name} dołączył(a) do gospodarstwa domowego.`,
    });

    res.json({
      message: 'Dołączono do gospodarstwa.',
      user: {
        ...updatedUser,
        household: sanitizeHousehold(updatedUser.household as any, updatedUser.role),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas dołączania do gospodarstwa.' });
  }
};

export const generateHouseholdInviteCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId;

    if (!householdId) {
      res.status(400).json({ error: 'Brak przypisanego gospodarstwa.' });
      return;
    }

    let uniqueCode = generateInviteCode();
    while (await prisma.household.findUnique({ where: { inviteCode: uniqueCode } })) {
      uniqueCode = generateInviteCode();
    }

    const inviteCodeExpiresAt = getInviteCodeExpiry();

    const household = await prisma.household.update({
      where: { id: householdId },
      data: {
        inviteCode: uniqueCode,
        inviteCodeExpiresAt,
      },
      select: { name: true },
    });

    await logActivity({
      householdId,
      userId: req.user!.id,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'WYGENEROWANO_KOD_ZAPROSZENIA',
      entityType: 'HOUSEHOLD',
      entityName: household.name,
      details: 'Administrator wygenerował nowy kod zaproszenia ważny przez 5 minut.',
    });

    res.json({
      inviteCode: uniqueCode,
      inviteCodeExpiresAt: inviteCodeExpiresAt.toISOString(),
      message: 'Wygenerowano nowy kod zaproszenia. Kod jest ważny przez 5 minut.',
    });
  } catch (error) {
    console.error('Błąd generowania kodu zaproszenia:', error);
    res.status(500).json({ error: 'Nie udało się wygenerować kodu zaproszenia.' });
  }
};

export const getHouseholdMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId;
    if (!householdId) {
      res.status(400).json({ error: 'Brak przypisanego gospodarstwa.' });
      return;
    }

    const members = await prisma.user.findMany({
      where: { householdId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSystemAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas pobierania członków.' });
  }
};

export const updateMemberRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'MEMBER'].includes(role)) {
      res.status(400).json({ error: 'Nieprawidłowa rola. Dostępne: ADMIN, MEMBER.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!targetUser || targetUser.householdId !== req.user!.householdId) {
      res.status(404).json({ error: 'Członek nie został odnaleziony w tym gospodarstwie.' });
      return;
    }

    if (targetUser.id === req.user!.id && role === 'MEMBER') {
      const adminCount = await prisma.user.count({
        where: { householdId: req.user!.householdId!, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Nie możesz odebrać sobie roli administratora, jesteś jedynym administratorem.' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    await logActivity({
      householdId: req.user!.householdId!,
      userId: req.user!.id,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'ZMIANA_ROLI',
      entityType: 'MEMBER',
      entityName: targetUser.name,
      details: `Administrator ${req.user!.name} zmienił rolę użytkownika ${targetUser.name} (${targetUser.email}) na: ${role}.`,
    });

    res.json({ message: 'Rola została zaktualizowana.', member: updated });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas aktualizacji roli.' });
  }
};

export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;

    if (memberId === req.user!.id) {
      res.status(400).json({ error: 'Nie możesz usunąć samego siebie z gospodarstwa.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!targetUser || targetUser.householdId !== req.user!.householdId) {
      res.status(404).json({ error: 'Użytkownik nie należy do tego gospodarstwa.' });
      return;
    }

    const primaryUserId = await getPrimaryUserId();

    if (memberId === primaryUserId) {
      res.status(400).json({ error: 'Konta głównego nie można usunąć.' });
      return;
    }

    await prisma.user.delete({
      where: { id: memberId },
    });

    await logActivity({
      householdId: req.user!.householdId!,
      userId: req.user!.id,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'USUNIETO_CZLONKA',
      entityType: 'MEMBER',
      entityName: targetUser.name,
      details: `Administrator ${req.user!.name} usunął konto użytkownika ${targetUser.name} (${targetUser.email}) z systemu.`,
    });

    res.json({ message: 'Konto użytkownika zostało usunięte.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas usuwania konta użytkownika.' });
  }
};

export const deleteOwnAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, householdId: true, isSystemAdmin: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Użytkownik nie został odnaleziony.' });
      return;
    }

    const primaryUserId = await getPrimaryUserId();

    if (userId === primaryUserId) {
      res.status(400).json({ error: 'Konta głównego nie można usunąć.' });
      return;
    }

    if (user.householdId) {
      res.status(400).json({ error: 'Konto można usunąć z tego ekranu tylko wtedy, gdy nie należysz do żadnego gospodarstwa.' });
      return;
    }

    if (user.isSystemAdmin) {
      const systemAdminCount = await prisma.user.count({
        where: { isSystemAdmin: true },
      });

      if (systemAdminCount <= 1) {
        res.status(400).json({ error: 'Nie możesz usunąć jedynego konta administratora systemu.' });
        return;
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: 'Twoje konto zostało usunięte.' });
  } catch (error) {
    console.error('Błąd usuwania własnego konta:', error);
    res.status(500).json({ error: 'Nie udało się usunąć konta.' });
  }
};
