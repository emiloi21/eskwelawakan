import { create } from 'zustand';

export type Mode = 'light' | 'dark';
export type ThemeColor = 'default' | 'blue';

interface ThemeStore {
  mode: Mode;
  color: ThemeColor;
  setMode: (m: Mode) => void;
  setColor: (c: ThemeColor) => void;
}

function applyTheme(color: ThemeColor, mode: Mode) {
  const root = document.documentElement;

  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const toRemove = Array.from(root.classList).filter((c) => c.startsWith('theme-'));
  root.classList.remove(...toRemove);

  if (color !== 'default') {
    root.classList.add(`theme-${color}`);
  }
}

function getStored<T>(key: string, fallback: T): T {
  const val = localStorage.getItem(key);
  return val ? (val as unknown as T) : fallback;
}

const initialMode = getStored<Mode>('theme-mode', 'light');
const initialColor = getStored<ThemeColor>('theme-color', 'blue');
applyTheme(initialColor, initialMode);

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: initialMode,
  color: initialColor,
  setMode: (mode) => {
    applyTheme(get().color, mode);
    localStorage.setItem('theme-mode', mode);
    set({ mode });
  },
  setColor: (color) => {
    applyTheme(color, get().mode);
    localStorage.setItem('theme-color', color);
    set({ color });
  },
}));
