import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const {
      page = '1',
      limit = '50',
      userId,
      action,
      entityType,
      search,
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = { householdId };

    if (userId && userId !== 'ALL') {
      where.userId = userId as string;
    }

    if (action && action !== 'ALL') {
      where.action = action as string;
    }

    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType as string;
    }

    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { entityName: { contains: q } },
        { details: { contains: q } },
        { userName: { contains: q } },
        { userEmail: { contains: q } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, role: true },
          },
        },
      }),
    ]);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      logs,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
};

export const getAuditStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const logs = await prisma.activityLog.findMany({
      where: {
        householdId,
        createdAt: { gte: last30Days },
      },
      select: {
        action: true,
        userId: true,
        userName: true,
        createdAt: true,
      },
    });

    const actionCounts: Record<string, number> = {};
    const userActivity: Record<string, { count: number; name: string }> = {};

    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      const uid = log.userId || 'system';
      if (!userActivity[uid]) {
        userActivity[uid] = { count: 0, name: log.userName };
      }
      userActivity[uid].count++;
    }

    res.json({
      totalEvents30Days: logs.length,
      actionCounts,
      userActivity,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit statistics.' });
  }
};
