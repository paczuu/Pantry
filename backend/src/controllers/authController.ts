import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { logActivity } from '../services/auditService.js';
import { MessageCode, apiError, apiMessage, auditDetails } from '../utils/messages.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pantry-super-secret-key-change-in-production-2026';

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
  { name: 'Dairy', icon: 'milk', color: 'blue', order: 1 },
  { name: 'Meat', icon: 'fish', color: 'rose', order: 2 },
  { name: 'FruitsVegetables', icon: 'apple', color: 'emerald', order: 3 },
  { name: 'DryGrains', icon: 'wheat', color: 'amber', order: 4 },
  { name: 'Beverages', icon: 'cup-soda', color: 'cyan', order: 5 },
  { name: 'SpicesSauces', icon: 'flame', color: 'orange', order: 6 },
  { name: 'Snacks', icon: 'cookie', color: 'purple', order: 7 },
  { name: 'Bakery', icon: 'croissant', color: 'yellow', order: 8 },
  { name: 'FrozenFoods', icon: 'ice-cream', color: 'sky', order: 9 },
  { name: 'CannedPreserves', icon: 'soup', color: 'teal', order: 10 },
  { name: 'Sweets', icon: 'candy', color: 'pink', order: 11 },
  { name: 'Other', icon: 'tag', color: 'gray', order: 12 },
];

export const initHouseholdDefaults = async (householdId: string) => {
  // Add default categories
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.categorySetting.upsert({
      where: { householdId_name: { householdId, name: cat.name } },
      update: {},
      create: { householdId, name: cat.name, icon: cat.icon, color: cat.color, order: cat.order },
    });
  }

  // Create default shopping list
  const existingList = await prisma.shoppingList.findFirst({
    where: { householdId },
  });
  if (!existingList) {
    await prisma.shoppingList.create({
      data: {
        householdId,
        name: 'Main Shopping List',
        icon: 'shopping-cart',
        color: 'emerald',
      },
    });
  }
};

const registerSchema = z.object({
  email: z.string().email('VALIDATION_EMAIL'),
  password: z.string().min(6, 'VALIDATION_PASSWORD'),
  name: z.string().min(2, 'VALIDATION_NAME'),
  inviteCode: z.string().trim().optional(),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ ...apiError(parseResult.error.errors[0].message as MessageCode) });
      return;
    }

    const { email, password, name, inviteCode } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();
    const cleanInviteCode = inviteCode?.trim().toUpperCase() || '';

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(400).json({ ...apiError('AUTH_EMAIL_TAKEN') });
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
            name: 'My Household',
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
            name: 'Main Shopping List',
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
        action: 'HOUSEHOLD_CREATED',
        entityType: 'HOUSEHOLD',
        entityName: newUser.household?.name || 'My Household',
        details: auditDetails('AUDIT_FIRST_ADMIN'),
      });

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, householdId: newUser.householdId },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        ...apiMessage('AUTH_FIRST_ADMIN_CREATED'),
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
      res.status(400).json({ ...apiError('INVITE_REQUIRED') });
      return;
    }

    if (cleanInviteCode.length !== 6) {
      res.status(400).json({ ...apiError('INVITE_LENGTH') });
      return;
    }

    const household = await prisma.household.findUnique({
      where: { inviteCode: cleanInviteCode },
    });

    if (!household) {
      res.status(400).json({ ...apiError('INVITE_INVALID') });
      return;
    }

    if (!isInviteCodeActive(household.inviteCodeExpiresAt)) {
      res.status(400).json({ ...apiError('INVITE_EXPIRED') });
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
      action: 'JOINED_HOUSEHOLD',
      entityType: 'MEMBER',
      entityName: newUser.name,
      details: auditDetails('AUDIT_REGISTERED_INVITE'),
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, householdId: newUser.householdId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      ...apiMessage('AUTH_REGISTERED'),
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
    console.error('Registration error:', error);
    res.status(500).json({ ...apiError('AUTH_REGISTER_FAILED') });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ ...apiError('AUTH_CREDENTIALS_REQUIRED') });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { household: true },
    });

    if (!user) {
      res.status(400).json({ ...apiError('AUTH_INVALID_CREDENTIALS') });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ ...apiError('AUTH_INVALID_CREDENTIALS') });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, householdId: user.householdId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      ...apiMessage('AUTH_LOGGED_IN'),
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
    console.error('Login error:', error);
    res.status(500).json({ ...apiError('AUTH_LOGIN_FAILED') });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      res.status(400).json({ ...apiError('PASSWORD_FIELDS_REQUIRED') });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ ...apiError('VALIDATION_PASSWORD') });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      res.status(404).json({ ...apiError('USER_NOT_FOUND') });
      return;
    }

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(400).json({ ...apiError('PASSWORD_CURRENT_WRONG') });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ ...apiError('PASSWORD_SAME_AS_CURRENT') });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    res.json({ ...apiMessage('PASSWORD_CHANGED') });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ ...apiError('PASSWORD_CHANGE_FAILED') });
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
      res.status(404).json({ ...apiError('USER_NOT_FOUND') });
      return;
    }

    res.json({
      user: {
        ...user,
        household: sanitizeHousehold(user.household as any, user.role),
      },
    });
  } catch (error) {
    res.status(500).json({ ...apiError('PROFILE_FETCH_FAILED') });
  }
};

export const joinHousehold = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      res.status(400).json({ ...apiError('INVITE_PROVIDE') });
      return;
    }

    const household = await prisma.household.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!household) {
      res.status(404).json({ ...apiError('INVITE_HOUSEHOLD_NOT_FOUND') });
      return;
    }

    if (!isInviteCodeActive(household.inviteCodeExpiresAt)) {
      res.status(400).json({ ...apiError('INVITE_EXPIRED') });
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
      action: 'JOINED_HOUSEHOLD',
      entityType: 'MEMBER',
      entityName: req.user!.name,
      details: auditDetails('AUDIT_MEMBER_JOINED', { name: req.user!.name }),
    });

    res.json({
      ...apiMessage('HOUSEHOLD_JOINED'),
      user: {
        ...updatedUser,
        household: sanitizeHousehold(updatedUser.household as any, updatedUser.role),
      },
    });
  } catch (error) {
    res.status(500).json({ ...apiError('HOUSEHOLD_JOIN_FAILED') });
  }
};

export const generateHouseholdInviteCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId;

    if (!householdId) {
      res.status(400).json({ ...apiError('HOUSEHOLD_NOT_ASSIGNED') });
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
      action: 'INVITE_CODE_GENERATED',
      entityType: 'HOUSEHOLD',
      entityName: household.name,
      details: auditDetails('AUDIT_INVITE_GENERATED'),
    });

    res.json({
      inviteCode: uniqueCode,
      inviteCodeExpiresAt: inviteCodeExpiresAt.toISOString(),
      ...apiMessage('INVITE_GENERATED'),
    });
  } catch (error) {
    console.error('Error generating invite code:', error);
    res.status(500).json({ ...apiError('INVITE_GENERATE_FAILED') });
  }
};

export const getHouseholdMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId;
    if (!householdId) {
      res.status(400).json({ ...apiError('HOUSEHOLD_NOT_ASSIGNED') });
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
    res.status(500).json({ ...apiError('MEMBERS_FETCH_FAILED') });
  }
};

export const updateMemberRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'MEMBER'].includes(role)) {
      res.status(400).json({ ...apiError('ROLE_INVALID') });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!targetUser || targetUser.householdId !== req.user!.householdId) {
      res.status(404).json({ ...apiError('MEMBER_NOT_FOUND') });
      return;
    }

    if (targetUser.id === req.user!.id && role === 'MEMBER') {
      const adminCount = await prisma.user.count({
        where: { householdId: req.user!.householdId!, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        res.status(400).json({ ...apiError('ADMIN_SELF_DEMOTE') });
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
      action: 'ROLE_CHANGE',
      entityType: 'MEMBER',
      entityName: targetUser.name,
      details: auditDetails('AUDIT_ROLE_CHANGED', { admin: req.user!.name, user: targetUser.name, email: targetUser.email, role }),
    });

    res.json({ ...apiMessage('MEMBER_ROLE_UPDATED'), member: updated });
  } catch (error) {
    res.status(500).json({ ...apiError('MEMBER_ROLE_UPDATE_FAILED') });
  }
};

export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;

    if (memberId === req.user!.id) {
      res.status(400).json({ ...apiError('MEMBER_SELF_REMOVE') });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!targetUser || targetUser.householdId !== req.user!.householdId) {
      res.status(404).json({ ...apiError('USER_NOT_IN_HOUSEHOLD') });
      return;
    }

    const primaryUserId = await getPrimaryUserId();

    if (memberId === primaryUserId) {
      res.status(400).json({ ...apiError('ACCOUNT_PRIMARY_PROTECTED') });
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
      action: 'USER_DELETED',
      entityType: 'MEMBER',
      entityName: targetUser.name,
      details: auditDetails('AUDIT_USER_DELETED', { admin: req.user!.name, user: targetUser.name, email: targetUser.email }),
    });

    res.json({ ...apiMessage('MEMBER_DELETED') });
  } catch (error) {
    res.status(500).json({ ...apiError('MEMBER_DELETE_FAILED') });
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
      res.status(404).json({ ...apiError('USER_NOT_FOUND') });
      return;
    }

    const primaryUserId = await getPrimaryUserId();

    if (userId === primaryUserId) {
      res.status(400).json({ ...apiError('ACCOUNT_PRIMARY_PROTECTED') });
      return;
    }

    if (user.householdId) {
      res.status(400).json({ ...apiError('ACCOUNT_DELETE_HAS_HOUSEHOLD') });
      return;
    }

    if (user.isSystemAdmin) {
      const systemAdminCount = await prisma.user.count({
        where: { isSystemAdmin: true },
      });

      if (systemAdminCount <= 1) {
        res.status(400).json({ ...apiError('SYSADMIN_LAST_PROTECTED') });
        return;
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ ...apiMessage('ACCOUNT_DELETED') });
  } catch (error) {
    console.error('Error deleting own account:', error);
    res.status(500).json({ ...apiError('ACCOUNT_DELETE_FAILED') });
  }
};
