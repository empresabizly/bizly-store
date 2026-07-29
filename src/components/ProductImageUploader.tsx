import ImageUploader from './ImageUploader';
import { CloudinaryUploadResult } from '../cloudinary/upload';

interface ProductImageUploaderProps {
  currentImageUrl?: string;
  onUploaded: (result: CloudinaryUploadResult) => void;
  onRemoved: () => void;
}

/**
 * Sube, cambia o elimina la foto de un producto.
 * A diferencia de LogoUploader, NO escribe directo a Firestore: el producto
 * puede todavía no existir como documento (se está creando en el formulario),
 * así que solo reporta el resultado hacia ProductForm, que lo guarda junto
 * con el resto de los datos del producto al enviar el formulario.
 */
export default function ProductImageUploader({
  currentImageUrl,
  onUploaded,
  onRemoved,
}: ProductImageUploaderProps) {
  return (
    <ImageUploader
      kind="products"
      shape="square"
      currentImageUrl={currentImageUrl}
      onUploaded={onUploaded}
      onRemoved={onRemoved}
      label="Subir foto"
    />
  );
}
