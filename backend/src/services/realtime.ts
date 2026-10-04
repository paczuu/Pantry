import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

const JWT_SECRET =
  process.env.JWT_SECRET || 'smart-pantry-super-secret-key-change-in-production-2026';

export type DataScope = 'pantry' | 'shopping' | 'notes' | 'recipes' | 'settings' | 'household';

export interface PresenceEntry {
  userId: string;
  userName: string;
  entityType: string;
  entityId: string;
}

let io: Server | null = null;
const presenceBySocket = new Map<string, PresenceEntry & { householdId: string }>();

export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.query?.token as string | undefined);

      if (!token) {
        next(new Error('Missing token.'));
        return;
      }

      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, name: true, householdId: true },
      });

      if (!user?.householdId) {
        next(new Error('No household assigned.'));
        return;
      }

      socket.data.user = {
        id: user.id,
        name: user.name,
        householdId: user.householdId,
      };
      next();
    } catch {
      next(new Error('Unauthorized connection.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; name: string; householdId: string };
    socket.join(`household:${user.householdId}`);
    emitPresence(user.householdId);

    socket.on(
      'presence:set',
      (payload: { entityType?: string; entityId?: string }) => {
        if (!payload?.entityType || !payload?.entityId) return;
        presenceBySocket.set(socket.id, {
          userId: user.id,
          userName: user.name,
          householdId: user.householdId,
          entityType: String(payload.entityType),
          entityId: String(payload.entityId),
        });
        emitPresence(user.householdId);
      }
    );

    socket.on('presence:clear', () => {
      presenceBySocket.delete(socket.id);
      emitPresence(user.householdId);
    });

    socket.on('disconnect', () => {
      presenceBySocket.delete(socket.id);
      emitPresence(user.householdId);
    });
  });

  return io;
}

function emitPresence(householdId: string) {
  const editors = [...presenceBySocket.values()]
    .filter((entry) => entry.householdId === householdId)
    .map(({ userId, userName, entityType, entityId }) => ({
      userId,
      userName,
      entityType,
      entityId,
    }));

  io?.to(`household:${householdId}`).emit('household:presence', { editors });
}

export function emitHouseholdData(householdId: string, scopes: DataScope[], actor?: { id: string; name: string }) {
  if (!io || scopes.length === 0) return;
  io.to(`household:${householdId}`).emit('household:data', {
    scopes,
    actorId: actor?.id,
    actorName: actor?.name,
    at: Date.now(),
  });
}

export function notifyFromRequest(req: Request): void {
  const householdId = req.user?.householdId;
  if (!householdId) return;

  const path = (req.originalUrl || '').split('?')[0].replace(/^\/api/, '');
  const scopes = scopesFromPath(path, req.method);
  if (scopes.length === 0) return;

  emitHouseholdData(householdId, scopes, {
    id: req.user!.id,
    name: req.user!.name,
  });
}

function scopesFromPath(path: string, method: string): DataScope[] {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return [];
  if (path.startsWith('/auth/login') || path.startsWith('/auth/register')) return [];
  if (path.startsWith('/health')) return [];
  if (path.includes('transfer-to-pantry')) return ['shopping', 'pantry'];
  if (path.startsWith('/pantry')) return ['pantry'];
  if (path.startsWith('/shopping')) return ['shopping'];
  if (path.startsWith('/notes')) return ['notes'];
  if (path.startsWith('/recipes')) return ['recipes'];
  if (path.startsWith('/settings')) return ['settings', 'household'];
  if (path.startsWith('/auth/household') || path.startsWith('/auth/join-household')) {
    return ['household'];
  }
  return [];
}
