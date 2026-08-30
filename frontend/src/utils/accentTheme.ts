export type AccentThemeId =
  | 'emerald'
  | 'blue'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'cyan';

export interface AccentTheme {
  id: AccentThemeId;
  label: string;
  description: string;
  color: string;
}

export const ACCENT_THEME_STORAGE_KEY =
  'spizarnia_accent_theme';

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'emerald',
    label: 'Zielony',
    description: 'Domyślny',
    color: '#10b981',
  },
  {
    id: 'blue',
    label: 'Niebieski',
    description: 'Spokojny',
    color: '#3b82f6',
  },
  {
    id: 'violet',
    label: 'Fioletowy',
    description: 'Nowoczesny',
    color: '#8b5cf6',
  },
  {
    id: 'rose',
    label: 'Czerwony',
    description: 'Wyrazisty',
    color: '#f43f5e',
  },
  {
    id: 'amber',
    label: 'Bursztynowy',
    description: 'Ciepły',
    color: '#f59e0b',
  },
  {
    id: 'cyan',
    label: 'Turkusowy',
    description: 'Świeży',
    color: '#06b6d4',
  },
];

export const isAccentThemeId = (
  value: string | null
): value is AccentThemeId => {
  return ACCENT_THEMES.some(
    (theme) => theme.id === value
  );
};

export const getAccentTheme = (
  themeId: AccentThemeId
): AccentTheme => {
  return (
    ACCENT_THEMES.find(
      (theme) => theme.id === themeId
    ) || ACCENT_THEMES[0]
  );
};

export const getStoredAccentTheme =
  (): AccentThemeId => {
    try {
      const stored = localStorage.getItem(
        ACCENT_THEME_STORAGE_KEY
      );

      if (isAccentThemeId(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn(
        'Nie udało się odczytać motywu:',
        error
      );
    }

    return 'emerald';
  };

export const applyAccentTheme = (
  themeId: AccentThemeId
): void => {
  const theme = getAccentTheme(themeId);

  document.documentElement.setAttribute(
    'data-accent-theme',
    theme.id
  );

  try {
    localStorage.setItem(
      ACCENT_THEME_STORAGE_KEY,
      theme.id
    );
  } catch (error) {
    console.warn(
      'Nie udało się zapisać motywu:',
      error
    );
  }

  const themeColorMeta =
    document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );

  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      'content',
      theme.color
    );
  }

  window.dispatchEvent(
    new CustomEvent('spizarnia-theme-changed', {
      detail: {
        theme: theme.id,
      },
    })
  );
};

export const resetAccentTheme = (): void => {
  applyAccentTheme('emerald');
};