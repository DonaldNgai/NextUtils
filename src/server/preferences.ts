import 'server-only';
import { cookies } from 'next/headers';

export async function getPreference<T extends string>(
  key: string,
  validValues: readonly T[],
  defaultValue: T
): Promise<T> {
  const cookieStore = await cookies();
  const value = cookieStore.get(key)?.value;
  
  if (value && validValues.includes(value as T)) {
    return value as T;
  }
  
  return defaultValue;
}

// Note: setValueToCookie for client components is in ./client/preferences.ts
