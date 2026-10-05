import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { usePantry } from './PantryContext';
import { DataScope, PresenceEditor } from '../types';

interface RealtimeContextType {
  connected: boolean;
  editors: PresenceEditor[];
  setPresence: (entityType: string, entityId: string | null) => void;
  editorsFor: (entityType: string, entityId: string) => PresenceEditor[];
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

const REFRESH_EVENT: Record<DataScope, string> = {
  pantry: 'pantry_pantry_refresh',
  shopping: 'pantry_shopping_refresh',
  notes: 'pantry_notes_refresh',
  recipes: 'pantry_recipes_refresh',
  settings: 'pantry_settings_refresh',
  household: 'pantry_household_refresh',
};

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, refreshUser } = useAuth();
  const { refreshPantry, refreshStats, refreshSettings } = usePantry();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [editors, setEditors] = useState<PresenceEditor[]>([]);

  useEffect(() => {
    if (!token || !user?.householdId) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setEditors([]);
      return;
    }

    const socket = io({
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    let refreshTimer: number | null = null;
    const pending = new Set<DataScope>();

    socket.on(
      'household:data',
      (payload: { scopes?: DataScope[] }) => {
        (payload.scopes || []).forEach((scope) => pending.add(scope));
        if (refreshTimer) window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
          const scopes = [...pending];
          pending.clear();
          scopes.forEach((scope) => {
            window.dispatchEvent(new Event(REFRESH_EVENT[scope]));
          });
        }, 150);
      }
    );

    socket.on('household:presence', (payload: { editors?: PresenceEditor[] }) => {
      setEditors(payload.editors || []);
    });

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.householdId]);

  useEffect(() => {
    const onPantry = () => {
      void refreshPantry();
      void refreshStats();
    };
    const onSettings = () => {
      void refreshSettings();
      void refreshStats();
    };
    const onHousehold = () => {
      void refreshUser();
      void refreshSettings();
    };

    window.addEventListener(REFRESH_EVENT.pantry, onPantry);
    window.addEventListener(REFRESH_EVENT.settings, onSettings);
    window.addEventListener(REFRESH_EVENT.household, onHousehold);

    return () => {
      window.removeEventListener(REFRESH_EVENT.pantry, onPantry);
      window.removeEventListener(REFRESH_EVENT.settings, onSettings);
      window.removeEventListener(REFRESH_EVENT.household, onHousehold);
    };
  }, [refreshPantry, refreshStats, refreshSettings, refreshUser]);

  const setPresence = useCallback((entityType: string, entityId: string | null) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (!entityId) {
      socket.emit('presence:clear');
      return;
    }
    socket.emit('presence:set', { entityType, entityId });
  }, []);

  const editorsFor = useCallback(
    (entityType: string, entityId: string) =>
      editors.filter(
        (editor) =>
          editor.entityType === entityType &&
          editor.entityId === entityId &&
          editor.userId !== user?.id
      ),
    [editors, user?.id]
  );

  const value = useMemo(
    () => ({ connected, editors, setPresence, editorsFor }),
    [connected, editors, setPresence, editorsFor]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};

export function useLiveRefresh(eventName: string, handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = () => handlerRef.current();
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, [eventName]);
}

export function useEditingPresence(entityType: string, entityId: string | null, active: boolean) {
  const { setPresence } = useRealtime();

  useEffect(() => {
    if (active && entityId) {
      setPresence(entityType, entityId);
      return () => setPresence(entityType, null);
    }
    setPresence(entityType, null);
    return undefined;
  }, [entityType, entityId, active, setPresence]);
}
