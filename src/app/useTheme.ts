import { useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#142c23' : '#244B3A');
    try { localStorage.setItem('belapcela-theme', next); } catch { /* Theme still works when preference storage is blocked. */ }
    setTheme(next);
  };
  return { theme, toggleTheme };
}
