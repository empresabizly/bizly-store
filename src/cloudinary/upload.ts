import {
  CLOUDINARY_UPLOAD_URL,
  CLOUDINARY_UPLOAD_PRESET,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from './config';

export interface CloudinaryUploadResult {
  url: string; // secure_url
  cloudinaryId: string; // public_id, usado para referencia/borrado futuro
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida formato y tamaño de un archivo antes de subirlo.
 * También detecta archivos "dañados" de forma básica: si el navegador no puede
 * leerlo como imagen (ver validateImageLoads), lo rechazamos también.
 */
export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato no permitido. Usa JPG, PNG o WEBP.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: 'La imagen pesa más de 5 MB. Elige una más ligera.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'El archivo parece estar dañado o vacío.' };
  }
  return { valid: true };
}

/**
 * Confirma que el archivo realmente puede decodificarse como imagen
 * (protección extra contra archivos corruptos o renombrados con otra extensión).
 */
export function validateImageLoads(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: 'El archivo está dañado o no es una imagen válida.' });
    };
    img.src = url;
  });
}

/**
 * Sube una imagen a Cloudinary usando el preset "unsigned" (sin exponer
 * ninguna clave privada) y reporta el progreso de subida.
 *
 * El folder se arma como: bizly/users/{userId}/{tipo}
 * donde {tipo} es 'logos' o 'products', para mantener las imágenes
 * de cada negocio organizadas y separadas de las de otros usuarios.
 */
export function uploadToCloudinary(
  file: File,
  userId: string,
  kind: 'logos' | 'products' | 'covers' | 'categories',
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `bizly/users/${userId}/${kind}`);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ url: data.secure_url, cloudinaryId: data.public_id });
        } catch {
          reject(new Error('Respuesta inválida de Cloudinary.'));
        }
      } else {
        reject(new Error('No se pudo subir la imagen. Intenta de nuevo.'));
      }
    };

    xhr.onerror = () => reject(new Error('Error de conexión al subir la imagen.'));

    xhr.send(formData);
  });
}
