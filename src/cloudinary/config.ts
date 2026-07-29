// Configuración de Cloudinary para subida de imágenes desde el navegador.
// El "Cloud Name" y el "Upload Preset" son valores PÚBLICOS por diseño de Cloudinary
// cuando se usa un preset "Unsigned" — no son secretos y es seguro tenerlos en el
// frontend. NUNCA pongas aquí un "API Secret" de Cloudinary.
//
// TODO: reemplaza estos dos valores con los de tu cuenta de Cloudinary.
// Los encuentras en: Cloudinary Dashboard (cloud name) y
// Settings > Upload > Upload presets (nombre del preset "unsigned" que crees).
export const CLOUDINARY_CLOUD_NAME = 'ofhlgkwn';
export const CLOUDINARY_UPLOAD_PRESET = 'bizly_unsigned';

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Reglas de validación en el cliente (Cloudinary también las aplica del lado
// del servidor si configuras el preset correctamente, pero validar aquí primero
// da una respuesta instantánea al usuario sin gastar su cuota de subida).
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
