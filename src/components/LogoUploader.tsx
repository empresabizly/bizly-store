import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import ImageUploader from './ImageUploader';
import { CloudinaryUploadResult } from '../cloudinary/upload';
import { deleteCloudinaryImage } from '../cloudinary/deleteImage';

/**
 * Sube, cambia o elimina el logo del negocio del usuario actual.
 * Guarda en Firestore únicamente: logoUrl, logoCloudinaryId, logoCreatedAt.
 */
export default function LogoUploader() {
  const { business, refreshBusiness } = useAuth();

  async function handleUploaded(result: CloudinaryUploadResult) {
    if (!business) return;
    const previousId = business.logoCloudinaryId;
    await updateDoc(doc(db, 'businesses', business.id), {
      logoUrl: result.url,
      logoCloudinaryId: result.cloudinaryId,
      logoCreatedAt: Date.now(),
    });
    await refreshBusiness();
    // Si estaba cambiando un logo anterior, borra el archivo viejo de Cloudinary.
    if (previousId && previousId !== result.cloudinaryId) deleteCloudinaryImage(previousId);
  }

  async function handleRemoved() {
    if (!business) return;
    const previousId = business.logoCloudinaryId;
    await updateDoc(doc(db, 'businesses', business.id), {
      logoUrl: deleteField(),
      logoCloudinaryId: deleteField(),
      logoCreatedAt: deleteField(),
    });
    await refreshBusiness();
    deleteCloudinaryImage(previousId);
  }

  if (!business) return null;

  return (
    <ImageUploader
      kind="logos"
      shape="circle"
      currentImageUrl={business.logoUrl}
      onUploaded={handleUploaded}
      onRemoved={handleRemoved}
      label="Subir logo"
    />
  );
}
