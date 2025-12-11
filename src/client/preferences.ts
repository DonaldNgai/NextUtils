'use client';

export async function setValueToCookie(key: string, value: string): Promise<void> {
  // Client-side cookie setting
  document.cookie = `${key}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
