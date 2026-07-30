/**
 * Extrae un color "dominante" aproximado de una imagen (pensado para el logo
 * del negocio), para sugerirlo como color de marca. Usa un canvas oculto,
 * reduce la imagen a una cuadrícula pequeña para que sea rápido, e ignora
 * píxeles casi blancos, casi negros o transparentes (que casi siempre son
 * fondo, no parte del diseño del logo).
 */
export function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 50;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo procesar la imagen.'));
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 200) continue; // ignora transparente
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          const isNearWhite = pr > 235 && pg > 235 && pb > 235;
          const isNearBlack = pr < 25 && pg < 25 && pb < 25;
          if (isNearWhite || isNearBlack) continue;
          r += pr;
          g += pg;
          b += pb;
          count++;
        }

        if (count === 0) {
          // Si todo era blanco/negro/transparente, promedia todo sin filtrar
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
        resolve(hex);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del logo.'));
    img.src = imageUrl;
  });
}
