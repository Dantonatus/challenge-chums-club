export const cleanupAuthState = () => {
  try {
    // Remove standard tokens
    localStorage.removeItem('supabase.auth.token');
    // Remove all Supabase keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    // Remove from sessionStorage if present
    try {
      Object.keys(sessionStorage || {}).forEach((key) => {
        // @ts-ignore
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {}
  } catch {}
};
