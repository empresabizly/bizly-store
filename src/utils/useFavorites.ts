import { useEffect, useState } from 'react';

/**
 * Favoritos reales del cliente, guardados en su propio navegador
 * (localStorage), separados por tienda. No requiere cuenta de cliente.
 */
export function useFavorites(businessId: string) {
  const storageKey = `bizly-favorites-${businessId}`;
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch {
      setFavorites([]);
    }
  }, [storageKey]);

  function toggleFavorite(productId: string) {
    setFavorites((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Si localStorage falla (modo privado, etc.), el favorito solo dura la sesión actual.
      }
      return next;
    });
  }

  function isFavorite(productId: string) {
    return favorites.includes(productId);
  }

  return { favorites, toggleFavorite, isFavorite };
}
