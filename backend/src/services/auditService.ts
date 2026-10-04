import { prisma } from '../config/prisma.js';

export interface LogActivityParams {
  householdId: string;
  userId?: string;
  userName: string;
  userEmail: string;
  action: string;
  entityType: 'PANTRY_ITEM' | 'SHOPPING_ITEM' | 'NOTE' | 'HOUSEHOLD' | 'MEMBER';
  entityName: string;
  details: string | object;
}

export const logActivity = async (params: LogActivityParams) => {
  try {
    const detailsString =
      typeof params.details === 'string'
        ? params.details
        : JSON.stringify(params.details, null, 2);

    return await prisma.activityLog.create({
      data: {
        householdId: params.householdId,
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        action: params.action,
        entityType: params.entityType,
        entityName: params.entityName,
        details: detailsString,
      },
    });
  } catch (error) {
    console.error('Error saving activity audit log:', error);
  }
};
