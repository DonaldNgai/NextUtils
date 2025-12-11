'use client';

import { create } from 'zustand';
import type { ThemeMode, ThemePreset } from '../types/preferences';

export type PreferencesState = {
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  setThemeMode: (mode: ThemeMode) => void;
  setThemePreset: (preset: ThemePreset) => void;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  themeMode: 'dark',
  themePreset: 'default',
  setThemeMode: (mode) => set({ themeMode: mode }),
  setThemePreset: (preset) => set({ themePreset: preset }),
}));
