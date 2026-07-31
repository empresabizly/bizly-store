import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import ImageUploader from './ImageUploader';
import { CloudinaryUploadResult } from '../cloudinary/upload';
import { deleteCloudinaryImage } from '../cloudinary/deleteImage';

/**
 * Sube, cambia o elimina la imagen de portada del negocio.
 * Guarda en Firestore únicamente: coverUrl, coverCloudinaryId, coverCreatedAt.
 */
export default function CoverUploader() {
  const { business, refreshBusiness } = useAuth();

  async function handleUploaded(result: CloudinaryUploadResult) {
    if (!business) return;
    const previousId = business.coverCloudinaryId;
    await updateDoc(doc(db, 'businesses', business.id), {
      coverUrl: result.url,
      coverCloudinaryId: result.cloudinaryId,
      coverCreatedAt: Date.now(),
    });
    await refreshBusiness();
    if (previousId && previousId !== result.cloudinaryId) deleteCloudinaryImage(previousId);
  }

  async function handleRemoved() {
    if (!business) return;
    const previousId = business.coverCloudinaryId;
    await updateDoc(doc(db, 'businesses', business.id), {
      coverUrl: deleteField(),
      coverCloudinaryId: deleteField(),
      coverCreatedAt: deleteField(),
    });
    await refreshBusiness();
    deleteCloudinaryImage(previousId);
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
