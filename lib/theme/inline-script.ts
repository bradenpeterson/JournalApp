import { THEME_STORAGE_KEY } from '@/lib/theme/constants'

/**
 * Runs in <head> before paint to avoid a light flash. Respects stored light/dark/system
 * using `prefers-color-scheme` when preference is system or missing.
 */
export const THEME_INLINE_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=s==='dark'||(s!=='light'&&d);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`
