import { useRef, useState } from 'react';
import { validateImageFile, validateImageLoads, uploadToCloudinary, CloudinaryUploadResult } from '../cloudinary/upload';
import { useAuth } from '../context/AuthContext';

interface ImageUploaderProps {
  kind: 'logos' | 'products' | 'covers';
  currentImageUrl?: string;
  onUploaded: (result: CloudinaryUploadResult) => void;
  onRemoved?: () => void;
  shape?: 'square' | 'circle';
  label?: string;
}

/**
 * Componente base: selecciona archivo, valida, muestra vista previa,
 * sube a Cloudinary con barra de progreso y reporta errores.
 * LogoUploader y ProductImageUploader lo envuelven con su propia lógica
 * de guardado en Firestore, para no duplicar código.
 */
export default function ImageUploader({
  kind,
  currentImageUrl,
  onUploaded,
  onRemoved,
  shape = 'square',
  label = 'Subir imagen',
}: ImageUploaderProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const displayImage = preview || currentImageUrl;
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setError('');

    const basicCheck = validateImageFile(file);
    if (!basicCheck.valid) {
      setError(basicCheck.error || 'Archivo inválido.');
      return;
    }

    const loadCheck = await validateImageLoads(file);
    if (!loadCheck.valid) {
      setError(loadCheck.error || 'Archivo inválido.');
      return;
    }

    // Vista previa inmediata, antes de que termine de subir
    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, user.uid, kind, setProgress);
      onUploaded(result);
    } catch (err: any) {
      setError(err.message || 'No se pudo subir la imagen. Intenta de nuevo.');
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleRemove() {
    setPreview(null);
    setError('');
    onRemoved?.();
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`w-24 h-24 ${shapeClass} bg-black/5 flex items-center justify-center overflow-hidden border border-black/10 shrink-0`}
      >
        {displayImage ? (
          <img src={displayImage} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-black/30 text-center px-2">Sin imagen</span>
        )}
      </div>

      <div className="flex-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          id={`file-input-${kind}`}
        />
        <div className="flex gap-2">
          <label
            htmlFor={`file-input-${kind}`}
            className="cursor-pointer px-4 py-2 rounded-full bg-bizly-dark text-white text-sm font-medium"
          >
            {displayImage ? 'Cambiar' : label}
          </label>
          {displayImage && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-4 py-2 rounded-full border border-red-300 text-red-500 text-sm font-medium"
            >
              Eliminar
            </button>
          )}
        </div>

        {uploading && (
          <div className="mt-2 w-full max-w-xs">
            <div className="h-2 bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-bizly-green transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-black/40 mt-1">Subiendo... {progress}%</p>
          </div>
        )}

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

        <p className="text-xs text-black/30 mt-2">JPG, PNG o WEBP · máximo 5 MB</p>
      </div>
    </div>
  );
}
