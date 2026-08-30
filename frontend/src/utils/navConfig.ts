import { NavItemConfig } from '../types';

export const NAV_CONFIG_STORAGE_KEY = 'spizarnia_nav_config';
export const NAV_CONFIG_UPDATED_EVENT = 'spizarnia_nav_updated';

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Pulpit', visible: true, order: 1 },
  { id: 'pantry', label: 'Spiżarnia', visible: true, order: 2 },
  { id: 'scan-action', label: 'Skaner', visible: true, order: 3 },
  { id: 'shopping', label: 'Zakupy', visible: true, order: 4 },
  { id: 'notes', label: 'Notatki', visible: true, order: 5 },
  { id: 'recipes', label: 'Przepisy', visible: true, order: 6 },
  { id: 'audit', label: 'Audyt', visible: true, order: 7 },
  { id: 'settings', label: 'Opcje', visible: true, order: 8 },
];

export function loadNavConfig(): NavItemConfig[] {
  try {
    const saved = localStorage.getItem(NAV_CONFIG_STORAGE_KEY);
    if (saved) {
      return mergeNavConfig(JSON.parse(saved));
    }
  } catch {
    // ignore corrupt storage
  }
  return DEFAULT_NAV_ITEMS;
}

export function persistNavConfig(config: NavItemConfig[]): void {
  localStorage.setItem(NAV_CONFIG_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(NAV_CONFIG_UPDATED_EVENT));
}

export function mergeNavConfig(saved: NavItemConfig[]): NavItemConfig[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_NAV_ITEMS;
  }

  const knownIds = new Set(DEFAULT_NAV_ITEMS.map((item) => item.id));
  const savedById = new Map(
    saved.filter((item) => knownIds.has(item.id)).map((item) => [item.id, item])
  );

  let nextOrder = Math.max(0, ...saved.map((item) => Number(item.order) || 0));

  const merged = DEFAULT_NAV_ITEMS.map((defaults) => {
    const existing = savedById.get(defaults.id);
    if (existing) {
      return {
        ...defaults,
        visible: existing.visible,
        order: Number(existing.order) || defaults.order,
        label: existing.label || defaults.label,
      };
    }
    nextOrder += 1;
    return { ...defaults, order: nextOrder };
  });

  return merged
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index + 1 }));
}
