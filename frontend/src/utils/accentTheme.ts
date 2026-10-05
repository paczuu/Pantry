export type AccentThemeId =
  | 'emerald'
  | 'blue'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'cyan';

export interface AccentTheme {
  id: AccentThemeId;
  label: {
    pl: string;
    en: string;
  };
  description: {
    pl: string;
    en: string;
  };
  color: string;
}

export const ACCENT_THEME_STORAGE_KEY =
  'pantry_accent_theme';

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'emerald',
    label: {
      pl: 'Zielony',
      en: 'Green',
    },
    description: {
      pl: 'Domyślny',
      en: 'Default',
    },
    color: '#10b981',
  },
  {
    id: 'blue',
    label: {
      pl: 'Niebieski',
      en: 'Ocean Blue',
    },
    description: {
      pl: 'Spokojny',
      en: 'Calm',
    },
    color: '#3b82f6',
  },
  {
    id: 'violet',
    label: {
      pl: 'Fioletowy',
      en: 'Violet',
    },
    description: {
      pl: 'Nowoczesny',
      en: 'Modern',
    },
    color: '#8b5cf6',
  },
  {
    id: 'rose',
    label: {
      pl: 'Czerwony',
      en: 'Red',
    },
    description: {
      pl: 'Wyrazisty',
      en: 'Vivid',
    },
    color: '#f43f5e',
  },
  {
    id: 'amber',
    label: {
      pl: 'Bursztynowy',
      en: 'Amber',
    },
    description: {
      pl: 'Ciepły',
      en: 'Warm',
    },
    color: '#f59e0b',
  },
  {
    id: 'cyan',
    label: {
      pl: 'Turkusowy',
      en: 'Cyan',
    },
    description: {
      pl: 'Świeży',
      en: 'Fresh',
    },
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
        'Failed to load theme:',
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
      'Failed to save theme:',
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
    new CustomEvent('pantry-theme-changed', {
      detail: {
        theme: theme.id,
      },
    })
  );
};

export const resetAccentTheme = (): void => {
  applyAccentTheme('emerald');
};