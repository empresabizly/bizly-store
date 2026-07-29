import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import ImageUploader from './ImageUploader';
import { CloudinaryUploadResult } from '../cloudinary/upload';

/**
 * Sube, cambia o elimina el logo del negocio del usuario actual.
 * Guarda en Firestore únicamente: logoUrl, logoCloudinaryId, logoCreatedAt.
 */
export default function LogoUploader() {
  const { business, refreshBusiness } = useAuth();

  async function handleUploaded(result: CloudinaryUploadResult) {
    if (!business) return;
    await updateDoc(doc(db, 'businesses', business.id), {
      logoUrl: result.url,
      logoCloudinaryId: result.cloudinaryId,
      logoCreatedAt: Date.now(),
    });
    await refreshBusiness();
  }

  async function handleRemoved() {
    if (!business) return;
    // Nota: esto quita la referencia de Firestore, así que el logo deja de
    // mostrarse en la app. El archivo permanece en Cloudinary (borrarlo de
    // forma permanente requiere una llamada firmada desde un servidor, que
    // no usamos aquí para mantener el proyecto sin costos de backend).
    await updateDoc(doc(db, 'businesses', business.id), {
      logoUrl: deleteField(),
      logoCloudinaryId: deleteField(),
      logoCreatedAt: deleteField(),
    });
    await refreshBusiness();
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
