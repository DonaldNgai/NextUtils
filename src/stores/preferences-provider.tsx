'use client';

import { useEffect } from 'react';
import { usePreferencesStore } from './preferences-store';
import type { ThemeMode, ThemePreset } from '../types/preferences';

type PreferencesStoreProviderProps = {
  children: React.ReactNode;
  themeMode: ThemeMode;
  themePreset: ThemePreset;
};

export function PreferencesStoreProvider({
  children,
  themeMode,
  themePreset,
}: PreferencesStoreProviderProps) {
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);

  useEffect(() => {
    setThemeMode(themeMode);
    setThemePreset(themePreset);
  }, [themeMode, themePreset, setThemeMode, setThemePreset]);

  return <>{children}</>;
}
