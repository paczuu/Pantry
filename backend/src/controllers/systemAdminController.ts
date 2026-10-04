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
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    const primaryUserId = users[0]?.id || null;

    res.json({
      users: users.map((user) => ({
        ...user,
        isPrimaryAdmin: user.id === primaryUserId,
      })),
    });
  } catch (error) {
    console.error('Error fetching system users:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
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
    console.error('Error fetching system households:', error);
    res.status(500).json({ error: 'Failed to fetch households.' });
  }
};

export const createSystemHousehold = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = String(req.body?.name || '').trim();

    if (name.length < 2) {
      res.status(400).json({ error: 'Household name must be at least 2 characters.' });
      return;
    }

    if (name.length > 60) {
      res.status(400).json({ error: 'Household name cannot exceed 60 characters.' });
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
      message: 'Household created and invite code generated (valid for 5 minutes).',
    });
  } catch (error) {
    console.error('Error creating household:', error);
    res.status(500).json({ error: 'Failed to create household.' });
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
      res.status(404).json({ error: 'Household not found.' });
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
      message: `Invite code generated for household "${existingHousehold.name}".`,
    });
  } catch (error) {
    console.error('Error generating household invite code:', error);
    res.status(500).json({ error: 'Failed to generate invite code.' });
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
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const primaryUserId = await getPrimaryUserId();
    const isPrimaryAdmin = userId === primaryUserId;

    if (
      isPrimaryAdmin &&
      isSystemAdmin !== undefined &&
      isSystemAdmin === false
    ) {
      res.status(400).json({ error: 'Cannot revoke system admin privileges from the primary account.' });
      return;
    }

    if (role !== undefined && !['ADMIN', 'MEMBER'].includes(role)) {
      res.status(400).json({ error: 'Invalid user role.' });
      return;
    }

    if (householdId !== undefined && householdId !== null) {
      const household = await prisma.household.findUnique({
        where: { id: householdId },
        select: { id: true },
      });

      if (!household) {
        res.status(400).json({ error: 'The selected household does not exist.' });
        return;
      }
    }

    if (
      userId === req.user!.id &&
      isSystemAdmin !== undefined &&
      isSystemAdmin === false
    ) {
      res.status(400).json({ error: 'You cannot revoke your own system admin privileges.' });
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

    res.json({ user, message: 'User updated.' });
  } catch (error) {
    console.error('Error updating system user:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
};

export const deleteSystemUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (userId === req.user!.id) {
      res.status(400).json({ error: 'You cannot delete your own system admin account.' });
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
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const primaryUserId = await getPrimaryUserId();

    if (userId === primaryUserId) {
      res.status(400).json({ error: 'The primary account cannot be deleted.' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      message: `Account for ${targetUser.name} (${targetUser.email}) has been deleted.`,
    });
  } catch (error) {
    console.error('Error deleting system user:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};
