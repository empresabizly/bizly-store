/**
 * Pide al servidor (Netlify Function) que borre permanentemente una imagen
 * de Cloudinary. Es "best effort": si falla (por ejemplo, si el negocio
 * todavía no configuró las variables de entorno en Netlify), no rompe la
 * experiencia del usuario — la referencia en Firestore ya se quitó de
 * todos modos, así que la imagen deja de mostrarse en la app aunque el
 * archivo tarde en borrarse (o no se borre) del lado de Cloudinary.
 */
export async function deleteCloudinaryImage(cloudinaryId?: string): Promise<void> {
  if (!cloudinaryId) return;
  try {
    await fetch('/.netlify/functions/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: cloudinaryId }),
    });
  } catch {
    // Silencioso a propósito — ver comentario arriba.
  }
}
