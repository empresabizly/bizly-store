import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import ImageUploader from './ImageUploader';
import { CloudinaryUploadResult } from '../cloudinary/upload';

/**
 * Sube, cambia o elimina la imagen de portada del negocio.
 * Guarda en Firestore únicamente: coverUrl, coverCloudinaryId, coverCreatedAt.
 */
export default function CoverUploader() {
  const { business, refreshBusiness } = useAuth();

  async function handleUploaded(result: CloudinaryUploadResult) {
    if (!business) return;
    await updateDoc(doc(db, 'businesses', business.id), {
      coverUrl: result.url,
      coverCloudinaryId: result.cloudinaryId,
      coverCreatedAt: Date.now(),
    });
    await refreshBusiness();
  }

  async function handleRemoved() {
    if (!business) return;
    await updateDoc(doc(db, 'businesses', business.id), {
      coverUrl: deleteField(),
      coverCloudinaryId: deleteField(),
      coverCreatedAt: deleteField(),
    });
    await refreshBusiness();
  }

  if (!business) return null;

  return (
    <ImageUploader
      kind="covers"
      shape="square"
      currentImageUrl={business.coverUrl}
      onUploaded={handleUploaded}
      onRemoved={handleRemoved}
      label="Subir portada"
    />
  );
}
